import React, { useEffect, useMemo, useState } from 'react';
import { CategoriaService, BoteService, DistanciaService, PruebaService } from '../../../services/ConfigService';
import ConfirmDialog from '../../Common/ConfirmDialog';
import { pick } from '../../../utils/apiHelpers';
import { getUserFacingError } from '../../../utils/userFacingError';
import {
    collapseMaratonLargadas,
    getEpGrupoId,
    getISODatePart,
    getPruebaIds,
    buildMaratonFechaHoraIso,
    formatTimeFromFechaHora,
    findMaratonGrupoMembers,
} from '../../../utils/maratonScheduleUtils';
import MaratonLargadaForm from './MaratonLargadaForm';
import MaratonProgramaList from './MaratonProgramaList';
import '../ConfigurarPruebas.css';

const parseEnabledIds = (value) => {
    if (!value || typeof value !== 'string') return null;
    return value.split(',').map(s => s.trim()).filter(Boolean);
};

const filterByEnabledIds = (items, enabledCsv) => {
    const enabled = parseEnabledIds(enabledCsv);
    if (!enabled?.length) return items;
    return items.filter(item => enabled.includes(String(pick(item, 'id', 'Id'))));
};

/**
 * Modal de schedule provisorio exclusivo de Maratón.
 * Horarios 100% manuales (sin gaps ni pateo de pista).
 */
const ConfigurarMaratonModal = ({ evento, onClose, onRefresh }) => {
    const [categorias, setCategorias] = useState([]);
    const [botes, setBotes] = useState([]);
    const [distancias, setDistancias] = useState([]);
    const [pruebasActuales, setPruebasActuales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filtroDia, setFiltroDia] = useState('Todos');

    const [selectedCats, setSelectedCats] = useState([]);
    const [selectedBotes, setSelectedBotes] = useState([]);
    const [selectedSexes, setSelectedSexes] = useState([]);
    const [selectedDist, setSelectedDist] = useState('');
    const [selectedDate, setSelectedDate] = useState(evento?.fecha ? String(evento.fecha).substring(0, 10) : '');
    const [selectedTime, setSelectedTime] = useState('');
    const [editingGrupoId, setEditingGrupoId] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const [modalConfig, setModalConfig] = useState({ show: false, title: '', message: '' });

    const largadas = useMemo(
        () => collapseMaratonLargadas(pruebasActuales),
        [pruebasActuales]
    );

    const loadPruebas = async () => {
        const actuals = await PruebaService.getByEvento(evento.id);
        setPruebasActuales(Array.isArray(actuals) ? actuals : []);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [cats, bts, dists] = await Promise.all([
                    CategoriaService.getAll().catch(() => []),
                    BoteService.getAll().catch(() => []),
                    DistanciaService.getAll().catch(() => []),
                ]);
                setCategorias(filterByEnabledIds(cats, evento.categoriasHabilitadas));
                setBotes(filterByEnabledIds(bts, evento.botesHabilitados));
                setDistancias(filterByEnabledIds(dists, evento.distanciasHabilitadas));
                await loadPruebas();
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evento?.id]);

    const resetForm = () => {
        setSelectedCats([]);
        setSelectedBotes([]);
        setSelectedSexes([]);
        setSelectedDist('');
        setSelectedTime('');
        setEditingGrupoId(null);
        setEditingId(null);
        // Día: se mantiene el del evento / último usado; hora siempre vacía (manual)
        if (!selectedDate && evento?.fecha) {
            setSelectedDate(String(evento.fecha).substring(0, 10));
        }
    };

    const canSave = selectedCats.length
        && selectedBotes.length
        && selectedSexes.length
        && selectedDist
        && selectedDate
        && selectedTime;

    const handleSubmit = async () => {
        if (!canSave) {
            setModalConfig({
                show: true,
                title: 'Datos incompletos',
                message: 'Completá categorías, botes, rama, distancia, día y hora manual.',
            });
            return;
        }

        const fechaHora = buildMaratonFechaHoraIso(selectedDate, selectedTime);
        if (!fechaHora) {
            setModalConfig({
                show: true,
                title: 'Hora inválida',
                message: 'Ingresá una hora válida para la largada.',
            });
            return;
        }

        setSaving(true);
        try {
            const prevMembers = findMaratonGrupoMembers(pruebasActuales, editingGrupoId, editingId);
            for (const m of prevMembers) {
                try { await PruebaService.deleteAssign(m.id); } catch (e) { console.warn(e); }
            }

            await PruebaService.assignLargada(evento.id, {
                categoriaIds: selectedCats.map(Number),
                boteIds: selectedBotes.map(Number),
                sexoIds: selectedSexes.map(Number),
                distanciaId: parseInt(selectedDist, 10),
                fechaHora,
                grupoLargadaId: (editingGrupoId && !String(editingGrupoId).startsWith('synth:'))
                    ? editingGrupoId
                    : undefined,
            });

            await loadPruebas();
            resetForm();
        } catch (err) {
            console.error(err);
            setModalConfig({
                show: true,
                title: 'Error al guardar',
                message: getUserFacingError(err, 'No se pudo guardar la largada.'),
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (ep) => {
        if (!ep) return;
        const members = ep._grupoMembers || (getEpGrupoId(ep)
            ? pruebasActuales.filter(p => getEpGrupoId(p) === getEpGrupoId(ep))
            : [ep]);
        const first = members[0];
        if (!first) return;

        setEditingGrupoId(getEpGrupoId(first) || ep.grupoLargadaId || null);
        setEditingId(ep._isGrupoLargada ? null : ep.id);
        setSelectedCats([...new Set(members.map(m => String(getPruebaIds(m).catId)).filter(Boolean))]);
        setSelectedBotes([...new Set(members.map(m => String(getPruebaIds(m).botId)).filter(Boolean))]);
        setSelectedSexes([...new Set(members.map(m => String(getPruebaIds(m).sexId)).filter(Boolean))]);
        setSelectedDist(String(getPruebaIds(first).distId || ''));
        setSelectedDate(getISODatePart(first.fechaHora));
        setSelectedTime(formatTimeFromFechaHora(first.fechaHora));
    };

    const handleDelete = async (ep) => {
        try {
            const members = ep?._grupoMembers?.length ? ep._grupoMembers : [ep];
            for (const m of members) {
                if (m?.id) await PruebaService.deleteAssign(m.id);
            }
            await loadPruebas();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="admin-modal-overlay">
                <div className="admin-modal glass-effect fade-in admin-modal--maraton">
                <div className="modal-header">
                    <h3>
                        Configurar Evento - {evento.nombre}
                        <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', color: '#7dd3fc', fontWeight: 600 }}>
                            · Maratón
                        </span>
                    </h3>
                    <button className="btn-icon-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body overflow-y">
                    <div className="admin-grid-layout">
                        <MaratonLargadaForm
                            categorias={categorias}
                            botes={botes}
                            distancias={distancias}
                            selectedCats={selectedCats}
                            selectedBotes={selectedBotes}
                            selectedSexes={selectedSexes}
                            selectedDist={selectedDist}
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            setSelectedCats={setSelectedCats}
                            setSelectedBotes={setSelectedBotes}
                            setSelectedSexes={setSelectedSexes}
                            setSelectedDist={setSelectedDist}
                            setSelectedDate={setSelectedDate}
                            setSelectedTime={setSelectedTime}
                            editing={!!(editingGrupoId || editingId)}
                            saving={saving}
                            canSave={!!canSave}
                            onCancel={resetForm}
                            onSubmit={handleSubmit}
                        />
                        <MaratonProgramaList
                            largadas={largadas}
                            filtroDia={filtroDia}
                            setFiltroDia={setFiltroDia}
                            loading={loading}
                            evento={evento}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-admin-secondary" onClick={onClose}>Cerrar</button>
                    <button
                        className="btn-admin-primary"
                        onClick={async () => { onRefresh?.(); onClose(); }}
                    >
                        Finalizar y Actualizar
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={modalConfig.show}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={() => setModalConfig({ show: false, title: '', message: '' })}
                onClose={() => setModalConfig({ show: false, title: '', message: '' })}
            />
        </div>
    );
};

export default ConfigurarMaratonModal;
