import React, { useState, useEffect, useMemo } from 'react';
import { CategoriaService, BoteService, DistanciaService, PruebaService } from '../../services/ConfigService';
import SchedulerService from '../../services/SchedulerService';
import PdfExportService from '../../services/PdfExportService';
import ConfirmDialog from '../Common/ConfirmDialog';
import { resolveIsMaratonEvent } from '../../utils/pruebaLabelUtils';
import ConfigurarMaratonModal from './maraton/ConfigurarMaratonModal';
import './ConfigurarPruebas.css';

import { pick } from '../../utils/apiHelpers';
import { getUserFacingError } from '../../utils/userFacingError';

const parseEnabledIds = (value) => {
    if (!value || typeof value !== 'string') return null;
    return value.split(',').map(s => s.trim()).filter(Boolean);
};

const filterByEnabledIds = (items, enabledCsv) => {
    const enabled = parseEnabledIds(enabledCsv);
    if (!enabled?.length) return items;
    return items.filter(item => {
        const id = pick(item, 'id', 'Id');
        return enabled.includes(String(id));
    });
};

const toggleInList = (list, id) => {
    const s = String(id);
    return list.includes(s) ? list.filter(x => x !== s) : [...list, s];
};

const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };

const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)',
    4: 'Cadete (15-16 años)', 5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)',
    7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)', 9: 'Master B (50-59 años)',
    10: 'Master C (60+ años)', 11: 'Control (Todas las edades)'
};

const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

const CATEGORIA_COLORS = {
    1: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    2: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
    3: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    4: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' },
    5: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
    6: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
    7: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
    8: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    9: { bg: 'rgba(132, 204, 22, 0.15)', text: '#84cc16' },
    10: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' },
    11: { bg: 'rgba(255, 255, 255, 0.1)', text: '#fff', border: '1px solid #6366f1' }
};

const getISODatePart = (dateString) => dateString ? dateString.substring(0, 10) : '';

const getEpGrupoId = (ep) => pick(ep, 'grupoLargadaId', 'GrupoLargadaId') || null;

const getPruebaIds = (ep) => {
    const p = ep?.prueba || ep?.Prueba;
    return {
        catId: pick(p, 'categoriaId') || pick(p?.categoria, 'id', 'Id'),
        botId: pick(p, 'boteId') || pick(p?.bote, 'id', 'Id'),
        distId: pick(p, 'distanciaId') || pick(p?.distancia, 'id', 'Id'),
        sexId: pick(p, 'sexoId') || pick(p?.sexo, 'id', 'Id'),
    };
};

/** Colapsa EventoPrueba del mismo GrupoLargadaId (o misma hora+distancia) en una fila. */
const collapsePruebasByLargada = (pruebas) => {
    const groups = new Map();
    const singles = [];
    for (const ep of pruebas || []) {
        const gid = getEpGrupoId(ep);
        if (!gid) {
            singles.push(ep);
            continue;
        }
        if (!groups.has(gid)) groups.set(gid, []);
        groups.get(gid).push(ep);
    }
    const collapsed = [];
    for (const [gid, members] of groups.entries()) {
        const inscritos = members.reduce(
            (sum, m) => sum + (m.cantidadInscritos || m.CantidadInscritos || 0),
            0
        );
        collapsed.push({
            ...members[0],
            _grupoMembers: members,
            _isGrupoLargada: true,
            grupoLargadaId: gid,
            cantidadInscritos: inscritos,
        });
    }

    // Sin GrupoLargadaId en API remota: agrupar por misma hora + distancia
    const byTimeDist = new Map();
    for (const ep of singles) {
        const distId = getPruebaIds(ep).distId || '';
        const key = `${ep.fechaHora || ''}|${distId}`;
        if (!byTimeDist.has(key)) byTimeDist.set(key, []);
        byTimeDist.get(key).push(ep);
    }
    for (const [key, members] of byTimeDist.entries()) {
        if (members.length === 1) {
            collapsed.push(members[0]);
            continue;
        }
        const inscritos = members.reduce(
            (sum, m) => sum + (m.cantidadInscritos || m.CantidadInscritos || 0),
            0
        );
        collapsed.push({
            ...members[0],
            _grupoMembers: members,
            _isGrupoLargada: true,
            grupoLargadaId: `synth:${key}`,
            cantidadInscritos: inscritos,
        });
    }
    return collapsed;
};

const joinUniqueLabels = (members, pickId, namesMap) => {
    const ids = [...new Set(members.map(m => pickId(getPruebaIds(m))).filter(Boolean))];
    return ids.map(id => namesMap[id] || String(id)).join(' · ');
};

/** Router: Maratón usa módulo propio (horarios manuales). Pista sigue acá. */
const ConfigurarPruebasModal = (props) => {
    if (resolveIsMaratonEvent(props.evento)) {
        return <ConfigurarMaratonModal {...props} />;
    }
    return <ConfigurarPruebasVelocidadModal {...props} />;
};

const ConfigurarPruebasVelocidadModal = ({ evento, onClose, onRefresh }) => {
    const isMaraton = false;

    const [categorias, setCategorias] = useState([]);
    const [botes, setBotes] = useState([]);
    const [distancias, setDistancias] = useState([]);
    const [pruebasActuales, setPruebasActuales] = useState([]);
    const [fasesLive, setFasesLive] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCat, setSelectedCat] = useState('');
    const [selectedBote, setSelectedBote] = useState('');
    const [selectedSex, setSelectedSex] = useState('');
    const [selectedCats, setSelectedCats] = useState([]);
    const [selectedBotes, setSelectedBotes] = useState([]);
    const [selectedSexes, setSelectedSexes] = useState([]);

    const [selectedDist, setSelectedDist] = useState('');
    const [selectedDate, setSelectedDate] = useState(evento.fecha ? evento.fecha.substring(0, 10) : '');
    const [selectedTime, setSelectedTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [filtroDia, setFiltroDia] = useState('Todos');
    const [editingId, setEditingId] = useState(null);
    const [editingGrupoId, setEditingGrupoId] = useState(null);

    const [gapEntrePruebas, setGapEntrePruebas] = useState(evento.gapEntrePruebas || 10);
    const [gapRecuperacion, setGapRecuperacion] = useState(evento.gapRecuperacionMinutos ?? 40);
    const [horaInicioFinales, setHoraInicioFinales] = useState('10:30');
    const [usarBloqueFinales, setUsarBloqueFinales] = useState(true);
    const [usarGapVariable, setUsarGapVariable] = useState(evento.usarGapVariable || false);

    const [modalConfig, setModalConfig] = useState({ show: false, type: 'warning', title: '', message: '' });

    const pruebasParaCronograma = useMemo(
        () => collapsePruebasByLargada(pruebasActuales),
        [pruebasActuales]
    );

    useEffect(() => {
        const loadData = async () => {
            try {
                const { default: FaseService } = await import('../../services/FaseService');
                const [catsRes, btsRes, distsRes, actualsRes, liveRes] = await Promise.allSettled([
                    CategoriaService.getAll(),
                    BoteService.getAll(),
                    DistanciaService.getAll(),
                    PruebaService.getByEvento(evento.id),
                    FaseService.getByEvento(evento.id),
                ]);

                const cats = catsRes.status === 'fulfilled' ? catsRes.value : [];
                const bts = btsRes.status === 'fulfilled' ? btsRes.value : [];
                const dists = distsRes.status === 'fulfilled' ? distsRes.value : [];
                const actuals = actualsRes.status === 'fulfilled' ? actualsRes.value : [];
                const live = liveRes.status === 'fulfilled' ? liveRes.value : [];

                if (actualsRes.status === 'rejected') {
                    console.warn('[ConfigPruebas] No se pudieron cargar pruebas del evento:', actualsRes.reason);
                }

                setCategorias(filterByEnabledIds(cats, evento.categoriasHabilitadas));
                setBotes(filterByEnabledIds(bts, evento.botesHabilitados));
                setDistancias(filterByEnabledIds(dists, evento.distanciasHabilitadas));
                setPruebasActuales(Array.isArray(actuals) ? actuals : []);
                setFasesLive(Array.isArray(live) ? live : []);
                if (evento) {
                    setGapEntrePruebas(evento.gapEntrePruebas || 10);
                    setGapRecuperacion(evento.gapRecuperacionMinutos ?? 40);
                    setUsarGapVariable(evento.usarGapVariable || false);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [evento]);

    useEffect(() => {
        // Pista: sugerir siguiente hora según gap. Maratón no pasa por este modal.
        if (!editingId && !editingGrupoId && pruebasParaCronograma.length > 0) {
            const sortedPruebas = [...pruebasParaCronograma].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            const lastPrueba = sortedPruebas[sortedPruebas.length - 1];
            const lastTime = new Date(lastPrueba.fechaHora);
            const nextTime = new Date(lastTime.getTime() + gapEntrePruebas * 60 * 1000);
            setSelectedTime(`${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`);
        } else if (!editingId && !editingGrupoId) {
            setSelectedTime('');
        }
    }, [gapEntrePruebas, pruebasParaCronograma, editingId, editingGrupoId]);

    const resetForm = () => {
        setSelectedCat(''); setSelectedBote(''); setSelectedDist('');
        setSelectedSex('');
        setSelectedCats([]); setSelectedBotes([]); setSelectedSexes([]);
        setEditingId(null);
        setEditingGrupoId(null);

        if (pruebasParaCronograma.length > 0) {
            const sortedPruebas = [...pruebasParaCronograma].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            const lastPrueba = sortedPruebas[sortedPruebas.length - 1];
            const lastTime = new Date(lastPrueba.fechaHora);
            const gapMin = isMaraton ? 15 : gapEntrePruebas;
            const nextTime = new Date(lastTime.getTime() + gapMin * 60 * 1000);
            setSelectedTime(`${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`);
        } else {
            setSelectedTime('');
        }
    };

    const resolveFinalTime = () => {
        if (selectedTime) return selectedTime;

        if (editingId || editingGrupoId) {
            const currentEp = editingGrupoId
                ? pruebasActuales.find(p => getEpGrupoId(p) === editingGrupoId)
                : pruebasActuales.find(p => p.id === editingId);
            if (currentEp) {
                const originalDate = new Date(currentEp.fechaHora);
                return `${String(originalDate.getHours()).padStart(2, '0')}:${String(originalDate.getMinutes()).padStart(2, '0')}`;
            }
        }

        if (pruebasParaCronograma.length > 0) {
            const sortedPruebas = [...pruebasParaCronograma].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            const lastPrueba = sortedPruebas[sortedPruebas.length - 1];
            const lastTime = new Date(lastPrueba.fechaHora);
            const gapMin = isMaraton ? 15 : gapEntrePruebas;
            const nextTime = new Date(lastTime.getTime() + gapMin * 60 * 1000);
            return `${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
        }

        return null;
    };

    const handleAddPrueba = async () => {
        if (!selectedDist || !selectedDate) return false;

        if (isMaraton) {
            if (!selectedCats.length || !selectedBotes.length || !selectedSexes.length) {
                setModalConfig({
                    show: true,
                    title: 'Selección incompleta',
                    message: 'En Maratón debés marcar al menos una categoría, un bote y una rama.',
                    type: 'warning'
                });
                return false;
            }
        } else if (!selectedCat || !selectedBote || !selectedSex) {
            return false;
        }

        const finalTime = resolveFinalTime();
        if (!finalTime) {
            setModalConfig({
                show: true,
                title: 'Hora de inicio requerida',
                message: 'Debe ingresar la hora de inicio para la primera prueba del evento.',
                type: 'warning'
            });
            return false;
        }

        setSaving(true);
        try {
            const fechaHora = new Date(`${selectedDate}T${finalTime}:00`).toISOString();

            if (isMaraton) {
                // Al editar, borrar el grupo anterior (necesario si la API no tiene /largada)
                if (editingGrupoId || editingId) {
                    const prevMembers = editingGrupoId
                        ? pruebasActuales.filter(p => {
                            const gid = getEpGrupoId(p);
                            if (gid && gid === editingGrupoId) return true;
                            if (String(editingGrupoId).startsWith('synth:')) {
                                const key = `${p.fechaHora || ''}|${getPruebaIds(p).distId || ''}`;
                                return `synth:${key}` === editingGrupoId;
                            }
                            return false;
                        })
                        : pruebasActuales.filter(p => p.id === editingId);

                    for (const m of prevMembers) {
                        try { await PruebaService.deleteAssign(m.id); } catch (e) { console.warn(e); }
                    }
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
            } else {
                const payload = {
                    eventoId: evento.id,
                    categoriaId: parseInt(selectedCat, 10),
                    boteId: parseInt(selectedBote, 10),
                    distanciaId: parseInt(selectedDist, 10),
                    sexoId: parseInt(selectedSex, 10),
                    fechaHora,
                };
                if (editingId) await PruebaService.updateAssign(editingId, payload);
                else await PruebaService.assignToEvento(evento.id, null, payload);
            }

            const updated = await PruebaService.getByEvento(evento.id);
            setPruebasActuales(updated);
            resetForm();
            return true;
        } catch (err) {
            console.error(err);
            setModalConfig({
                show: true,
                title: 'Error al guardar',
                message: getUserFacingError(err, 'No se pudo guardar la largada.'),
                type: 'warning'
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePrueba = async (ep) => {
        try {
            const members = ep?._grupoMembers?.length
                ? ep._grupoMembers
                : [ep?.id ? ep : { id: ep }];
            for (const m of members) {
                if (m?.id) await PruebaService.deleteAssign(m.id);
            }
            const updated = await PruebaService.getByEvento(evento.id);
            setPruebasActuales(updated);
        } catch (err) { console.error(err); }
    };

    const handleEditStart = (ep) => {
        if (!ep) return;
        const members = ep._grupoMembers || (getEpGrupoId(ep)
            ? pruebasActuales.filter(p => getEpGrupoId(p) === getEpGrupoId(ep))
            : [ep]);

        const first = members[0];
        if (!first?.prueba && !first?.Prueba) return;

        if (isMaraton || members.length > 1 || getEpGrupoId(first)) {
            setEditingGrupoId(getEpGrupoId(first));
            setEditingId(null);
            setSelectedCats([...new Set(members.map(m => String(getPruebaIds(m).catId)).filter(Boolean))]);
            setSelectedBotes([...new Set(members.map(m => String(getPruebaIds(m).botId)).filter(Boolean))]);
            setSelectedSexes([...new Set(members.map(m => String(getPruebaIds(m).sexId)).filter(Boolean))]);
            setSelectedDist(String(getPruebaIds(first).distId || ''));
        } else {
            setEditingId(ep.id);
            setEditingGrupoId(null);
            const ids = getPruebaIds(ep);
            setSelectedCat(String(ids.catId || ''));
            setSelectedBote(String(ids.botId || ''));
            setSelectedDist(String(ids.distId || ''));
            setSelectedSex(String(ids.sexId || ''));
        }

        const date = new Date(first.fechaHora);
        if (!isNaN(date.getTime())) {
            setSelectedDate(getISODatePart(first.fechaHora));
            setSelectedTime(date.toTimeString().substring(0, 5));
        }
    };

    const diasUnicos = ['Todos', ...new Set([
        ...pruebasParaCronograma.map(ep => getISODatePart(ep.fechaHora)),
        ...fasesLive.map(f => getISODatePart(f.fechaHoraProgramada))
    ])].filter(Boolean).sort();

    const canSave = isMaraton
        ? selectedCats.length && selectedBotes.length && selectedSexes.length && selectedDist && selectedDate
        : selectedCat && selectedBote && selectedDist && selectedSex && selectedDate;

    const checkboxListStyle = {
        maxHeight: '140px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        padding: '0.6rem 0.75rem',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal glass-effect fade-in">
                <div className="modal-header">
                    <h3>
                        Configurar Evento - {evento.nombre}
                        {isMaraton && (
                            <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', color: '#7dd3fc', fontWeight: 600 }}>
                                · Maratón
                            </span>
                        )}
                    </h3>
                    <button className="btn-icon-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body overflow-y">
                    <div className="admin-grid-layout">
                        <div className="form-column">
                            <h4 className="section-title">
                                {editingId || editingGrupoId ? 'Editar Largada' : (isMaraton ? 'Nueva Largada' : 'Nueva Prueba')}
                            </h4>
                            {isMaraton && (
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.4 }}>
                                    Marcá varias categorías, botes y ramas para juntarlos en una sola largada.
                                    Sin límite de carriles: la numeración será 1…N según inscriptos.
                                </p>
                            )}
                            <div className="admin-grid-form">
                                {isMaraton ? (
                                    <>
                                        <div className="form-group">
                                            <label>Categorías</label>
                                            <div style={checkboxListStyle}>
                                                {categorias.map(c => (
                                                    <label key={c.id} className="checkbox-label" style={{ fontSize: '0.85rem', margin: 0 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCats.includes(String(c.id))}
                                                            onChange={() => setSelectedCats(prev => toggleInList(prev, c.id))}
                                                        />
                                                        {CATEGORIA_NAMES[c.id] || c.nombre}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Botes</label>
                                            <div style={checkboxListStyle}>
                                                {botes.map(b => (
                                                    <label key={b.id} className="checkbox-label" style={{ fontSize: '0.85rem', margin: 0 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBotes.includes(String(b.id))}
                                                            onChange={() => setSelectedBotes(prev => toggleInList(prev, b.id))}
                                                        />
                                                        {BOTE_NAMES[b.id] || b.tipo}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Ramas</label>
                                            <div style={{ ...checkboxListStyle, maxHeight: 'none' }}>
                                                {[1, 2, 3].map(sexId => (
                                                    <label key={sexId} className="checkbox-label" style={{ fontSize: '0.85rem', margin: 0 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedSexes.includes(String(sexId))}
                                                            onChange={() => setSelectedSexes(prev => toggleInList(prev, sexId))}
                                                        />
                                                        {SEXO_NAMES[sexId]}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="form-group"><label>Categoría</label>
                                            <select className="admin-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                                <option value="">Seleccionar...</option>
                                                {categorias.map(c => <option key={c.id} value={c.id}>{CATEGORIA_NAMES[c.id] || c.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group"><label>Bote</label>
                                            <select className="admin-select" value={selectedBote} onChange={e => setSelectedBote(e.target.value)}>
                                                <option value="">Seleccionar...</option>
                                                {botes.map(b => <option key={b.id} value={b.id}>{BOTE_NAMES[b.id] || b.tipo}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group"><label>Rama</label>
                                            <select className="admin-select" value={selectedSex} onChange={e => setSelectedSex(e.target.value)}>
                                                <option value="">Seleccionar...</option>
                                                <option value="1">Masculino</option><option value="2">Femenino</option><option value="3">Mixto</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="form-group"><label>Distancia</label>
                                    <select className="admin-select" value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {distancias.map(d => <option key={d.id} value={d.id}>{DISTANCIA_NAMES[d.id] || d.distanciaRegata + 'm'}</option>)}
                                    </select>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group"><label>Día</label><input type="date" className="admin-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
                                    <div className="form-group"><label>Hora</label><input type="time" className="admin-input" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} /></div>
                                </div>
                                <div className="form-actions mt-md">
                                    {(editingId || editingGrupoId) && <button className="btn-admin-secondary" onClick={resetForm}>Cancelar</button>}
                                    <button className="btn-admin-primary flex-1" onClick={handleAddPrueba} disabled={saving || !canSave}>
                                        {saving ? '...' : (editingId || editingGrupoId ? 'Actualizar' : (isMaraton ? 'Crear largada' : 'Habilitar'))}
                                    </button>
                                </div>
                            </div>

                            {!isMaraton && (
                                <>
                                    <hr className="admin-divider" style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.08)' }} />
                                    <h4 className="section-title">Ajustes del Cronograma</h4>
                                    <div className="admin-grid-form" style={{ gap: '12px' }}>
                                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div className="form-group">
                                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Gap base (min)</label>
                                                <input type="number" className="admin-input" value={gapEntrePruebas} onChange={e => setGapEntrePruebas(parseInt(e.target.value) || 10)} min="1" max="120" />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Descanso atleta (min)</label>
                                                <input type="number" className="admin-input" value={gapRecuperacion} onChange={e => setGapRecuperacion(parseInt(e.target.value) || 40)} min="10" max="180" title="Mínimo entre pruebas distintas misma categoría/sexo" />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <input type="checkbox" id="chkBloqueFinales" checked={usarBloqueFinales} onChange={e => setUsarBloqueFinales(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                            <label htmlFor="chkBloqueFinales" style={{ cursor: 'pointer', marginBottom: 0, fontSize: '0.85rem', opacity: 0.9 }}>Fijar hora para Finales</label>
                                        </div>
                                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <input type="checkbox" id="chkUsarGapVariable" checked={usarGapVariable} onChange={e => setUsarGapVariable(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                            <label htmlFor="chkUsarGapVariable" style={{ cursor: 'pointer', marginBottom: 0, fontSize: '0.85rem', opacity: 0.9 }}>Ajustar gap de largada según distancia (variable)</label>
                                        </div>
                                        {usarBloqueFinales && (
                                            <div className="form-group">
                                                <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Inicio Bloque Finales</label>
                                                <input type="time" className="admin-input" value={horaInicioFinales} onChange={e => setHoraInicioFinales(e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="list-column">
                            <div className="flex-between mb-md">
                                <h4 className="section-title" style={{ margin: 0 }}>
                                    {isMaraton ? 'Programa provisorio (Largadas)' : 'Cronograma Unificado (Pateo en Vivo)'}
                                </h4>
                                <select className="admin-select-sm" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                                    {diasUnicos.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="table-container-mini">
                                {loading ? <div className="loader"></div> : (() => {
                                    const idsPruebasConFases = new Set(fasesLive.map(f => f.eventoPruebaId));

                                    const rawItems = [
                                        ...fasesLive.map(f => ({
                                            tipo: 'fase',
                                            id: `f-${f.id}`,
                                            time: f.fechaHoraProgramada,
                                            fechaHoraOriginal: (f.prueba?.prueba || f.prueba)?.fechaHora,
                                            nombre: f.nombreFase,
                                            raw: f,
                                            numeroFase: f.numeroFase,
                                            etapaId: f.etapaId,
                                            etapaOrden: f.etapa?.orden || 1,
                                            gapSugerido: f.etapa?.eventoPrueba?.prueba?.distancia?.gapSugerido || f.prueba?.prueba?.distancia?.gapSugerido || 0
                                        })),
                                        ...pruebasParaCronograma.filter(ep => {
                                            if (ep._isGrupoLargada && ep._grupoMembers) {
                                                return !ep._grupoMembers.some(m => idsPruebasConFases.has(m.id));
                                            }
                                            return !idsPruebasConFases.has(ep.id);
                                        }).map(ep => ({
                                            tipo: 'prueba',
                                            id: ep._isGrupoLargada ? `g-${ep.grupoLargadaId}` : `p-${ep.id}`,
                                            time: ep.fechaHora,
                                            fechaHoraOriginal: ep.fechaHora,
                                            nombre: ep._isGrupoLargada ? 'Largada combinada' : 'A Sortear',
                                            raw: ep,
                                            etapaOrden: 1,
                                            gapSugerido: ep.prueba?.distancia?.gapSugerido || 0
                                        }))
                                    ];

                                    const itemsProyectados = SchedulerService.recalcularTiempos(rawItems, {
                                        gapEntrePruebas: isMaraton ? 15 : gapEntrePruebas,
                                        gapRecuperacionMs: isMaraton ? 0 : gapRecuperacion * 60 * 1000,
                                        horaInicioFinales: (!isMaraton && usarBloqueFinales) ? horaInicioFinales : null,
                                        horaInicioEvento: evento.horaInicioEvento || '08:00',
                                        horaFinEvento: '18:00',
                                        usarGapVariable: isMaraton ? false : usarGapVariable
                                    });

                                    const itemsFinales = itemsProyectados.filter(item =>
                                        filtroDia === 'Todos' || getISODatePart(item.timeCalculated) === filtroDia
                                    );

                                    return (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
                                                <button
                                                    className="btn-admin-secondary"
                                                    onClick={() => PdfExportService.exportProgramaInicial(itemsFinales, evento || 'Evento')}
                                                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                >
                                                    📥 Exportar Programa PDF
                                                </button>
                                            </div>
                                            <table className="admin-table mini">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Categoría</th>
                                                        <th>Bote</th>
                                                        <th>Distancia</th>
                                                        <th>Rama</th>
                                                        <th>Hora</th>
                                                        <th>Ins</th>
                                                        <th>Acc</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...itemsFinales].reverse().map((it, idx) => {
                                                        const isF = it.tipo === 'fase';
                                                        const raw = it.raw;
                                                        const isGrupo = !isF && raw?._isGrupoLargada;
                                                        const members = isGrupo ? raw._grupoMembers : null;
                                                        const p = isF ? (raw.etapa?.eventoPrueba?.prueba || raw.prueba?.prueba || raw.prueba) : raw.prueba;

                                                        const catLabel = isGrupo
                                                            ? joinUniqueLabels(members, ids => ids.catId, CATEGORIA_NAMES)
                                                            : (CATEGORIA_NAMES[p?.categoriaId || p?.categoria?.id] || 'Cat');
                                                        const botLabel = isGrupo
                                                            ? joinUniqueLabels(members, ids => ids.botId, BOTE_NAMES)
                                                            : (BOTE_NAMES[p?.boteId || p?.bote?.id] || 'Bote');
                                                        const distId = isGrupo
                                                            ? getPruebaIds(members[0]).distId
                                                            : (p?.distanciaId || p?.distancia?.id);
                                                        const sexLabel = isGrupo
                                                            ? joinUniqueLabels(members, ids => ids.sexId, SEXO_NAMES)
                                                            : (SEXO_NAMES[p?.sexoId || p?.sexo?.id] || '—');

                                                        const originalTime = it.fechaHoraOriginal || it.time;
                                                        const isPateada = it.timeCalculated !== originalTime;
                                                        const catId = p?.categoriaId || p?.categoria?.id;

                                                        return (
                                                            <tr key={it.id} className={isF ? 'row-fase' : ''} style={{
                                                                opacity: isF ? 1 : 0.8,
                                                                background: isGrupo
                                                                    ? 'rgba(14, 165, 233, 0.06)'
                                                                    : (isF ? 'rgba(59, 130, 246, 0.03)' : 'transparent')
                                                            }}>
                                                                <td>{itemsFinales.length - idx}</td>
                                                                <td>
                                                                    <span className="badge-outline" style={{ borderColor: CATEGORIA_COLORS[catId]?.text || '#7dd3fc', color: CATEGORIA_COLORS[catId]?.text || '#7dd3fc', whiteSpace: 'normal', textAlign: 'left' }}>
                                                                        {catLabel}
                                                                        {isF && <span className="phase-tag"> - {it.nombre}</span>}
                                                                        {isGrupo && <span className="phase-tag"> · combinada</span>}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className="badge-bote" style={{ whiteSpace: 'normal' }}>{botLabel}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="badge-distancia">{DISTANCIA_NAMES[distId] || (p?.distancia?.metros + 'm')}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="badge-sexo mix" style={{ whiteSpace: 'normal' }}>{sexLabel}</span>
                                                                </td>
                                                                <td style={{ fontWeight: 'bold', color: isPateada ? '#fbbf24' : '#3b82f6' }}>
                                                                    {it.nuevaHora}
                                                                </td>
                                                                <td>
                                                                    <span className="badge-inscritos">
                                                                        {isF
                                                                            ? (it.raw?.resultados?.length || '0')
                                                                            : (it.raw?.cantidadInscritos || it.raw?.prueba?.cantidadInscritos || '0')}
                                                                    </span>
                                                                </td>
                                                                <td className="actions-cell">
                                                                    {!isF && (
                                                                        <>
                                                                            <button className="btn-icon-admin edit" onClick={() => handleEditStart(it.raw)}>✏️</button>
                                                                            <button className="btn-icon-delete" onClick={() => handleDeletePrueba(it.raw)}>🗑️</button>
                                                                        </>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-admin-secondary" onClick={onClose}>Cerrar</button>
                    <button className="btn-admin-primary" onClick={async () => { onRefresh(); onClose(); }}>Finalizar y Actualizar</button>
                </div>
            </div>
            <ConfirmDialog isOpen={modalConfig.show} title={modalConfig.title} message={modalConfig.message} onConfirm={() => setModalConfig({ show: false })} onClose={() => setModalConfig({ show: false })} />
        </div>
    );
};

export default ConfigurarPruebasModal;
