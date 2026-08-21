import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { List, RotateCcw, RefreshCw, Pencil, Save, X, Trash2 } from 'lucide-react';
import ClubService from '../../../services/ClubService';
import PdfExportService from '../../../services/PdfExportService';
import ConfirmDialog from '../../Common/ConfirmDialog';
import { getUserFacingError } from '../../../utils/userFacingError';
import {
    loadMaratonLargadaInscriptos,
    sortearYArmarLargadaMaraton,
    sortInscriptosByNumero,
    buildMaratonClasificacionOptions,
    buildMaratonLargadaOptions,
    updateMaratonNominaRow,
    buildCrewFromInscripcion,
    removeMaratonNominaRow,
    getCategoriaLabelFromEventoPrueba,
} from './maratonStartListUtils';
import '../ConfigurarPruebas.css';

const stripCategoryAges = (text) => String(text || '')
    .replace(/\s*\([^)]*años?\)/gi, '')
    .replace(/\s*\(\d+\s*[-–]\s*\d+[^)]*\)/g, '')
    .trim();

/**
 * Start List exclusivo de Maratón.
 * - Muestra todos los atletas de la largada combinada (selectedPrueba = representante del grupo)
 * - Columna Bote (no cabeza de serie / carril)
 * - Sorteo: NumeroCompetidor 1..N + genera fase "Largada" para el cronometraje
 * - Edición de nómina: Nº, nombre, club, categoría/bote/sexo (permitidos en la largada)
 */
const MaratonStartListPanel = ({
    pruebas = [],
    selectedPrueba,
    evento = null,
    isAdmin = true,
    onMessage,
    onPdfStateChange,
}) => {
    const [inscriptos, setInscriptos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isNominaCollapsed, setIsNominaCollapsed] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingIns, setEditingIns] = useState(null);
    const [form, setForm] = useState(null);
    const [savingRow, setSavingRow] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const selectedLargada = useMemo(() => {
        if (!selectedPrueba) return null;
        return buildMaratonLargadaOptions(pruebas).find(o =>
            o.memberIds.some(id => String(id) === String(selectedPrueba))
        ) || null;
    }, [pruebas, selectedPrueba]);

    const clasificacionOptions = useMemo(
        () => buildMaratonClasificacionOptions(pruebas, selectedPrueba),
        [pruebas, selectedPrueba]
    );

    const loadInscriptos = async (pruebaId) => {
        if (!pruebaId) {
            setInscriptos([]);
            return;
        }
        setLoading(true);
        try {
            const list = await loadMaratonLargadaInscriptos(pruebas, pruebaId);
            setInscriptos(sortInscriptosByNumero(list));
        } catch (err) {
            console.error(err);
            onMessage?.('Error al cargar inscritos de la largada.');
            setInscriptos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInscriptos(selectedPrueba);
        setEditMode(false);
        setEditingIns(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPrueba, pruebas]);

    useEffect(() => {
        if (!editMode) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const list = await ClubService.getAll();
                if (!cancelled) setClubes(Array.isArray(list) ? list : []);
            } catch {
                if (!cancelled) setClubes([]);
            }
        })();
        return () => { cancelled = true; };
    }, [editMode]);

    const handleSortearYArmar = async () => {
        if (!inscriptos.length) {
            onMessage?.('No hay inscritos para sortear.');
            return;
        }
        setSaving(true);
        try {
            const { inscriptos: updated } = await sortearYArmarLargadaMaraton(
                pruebas,
                selectedPrueba,
                inscriptos
            );
            setInscriptos(sortInscriptosByNumero(updated));
            onMessage?.(
                `✅ Números sorteados (1–${updated.length}) y largada lista para cronometrar.`
            );
        } catch (err) {
            console.error(err);
            onMessage?.('❌ ' + getUserFacingError(err, 'No se pudo sortear números / armar largada.'));
        } finally {
            setSaving(false);
        }
    };

    const openEditRow = (ins) => {
        const crew = buildCrewFromInscripcion(ins);
        const titular = crew.find(m => m.isTitular) || crew[0];
        setEditingIns(ins);
        setForm({
            numeroCompetidor: ins.numeroCompetidor || '',
            clubId: titular?.clubId || ins.participanteClubId || ins.clubId || '',
            eventoPruebaId: ins.eventoPruebaId || '',
            crew,
        });
    };

    const closeEditRow = () => {
        setEditingIns(null);
        setForm(null);
    };

    const updateCrewMember = (index, field, value) => {
        setForm(f => {
            const crew = [...(f.crew || [])];
            crew[index] = { ...crew[index], [field]: value };
            const next = { ...f, crew };
            if (crew[index]?.isTitular && field === 'clubId') {
                next.clubId = value;
            }
            return next;
        });
    };

    const handleSaveRow = async () => {
        if (!editingIns || !form) return;

        const num = String(form.numeroCompetidor || '').trim();
        if (num) {
            const dup = inscriptos.find(i =>
                i.id !== editingIns.id
                && String(i.numeroCompetidor || '') === num
            );
            if (dup) {
                onMessage?.(`❌ El Nº ${num} ya está asignado a otro atleta.`);
                return;
            }
        }

        if (!form.eventoPruebaId) {
            onMessage?.('❌ Elegí una clasificación (categoría / sexo / bote) permitida.');
            return;
        }

        const crew = form.crew || [];
        if (crew.some(m => !String(m.nombre || '').trim() && !String(m.apellido || '').trim())) {
            onMessage?.('❌ Completá nombre y apellido de todos los tripulantes.');
            return;
        }

        setSavingRow(true);
        try {
            const titular = crew.find(m => m.isTitular) || crew[0];
            await updateMaratonNominaRow({
                pruebas,
                selectedPruebaId: selectedPrueba,
                inscripcion: editingIns,
                patch: {
                    numeroCompetidor: num,
                    clubId: form.clubId || titular?.clubId || '',
                    eventoPruebaId: form.eventoPruebaId,
                    crew: crew.map(m => ({
                        ...m,
                        clubId: m.isTitular ? (form.clubId || m.clubId) : m.clubId,
                    })),
                },
            });
            await loadInscriptos(selectedPrueba);
            closeEditRow();
            onMessage?.('✅ Nómina actualizada (inscripción, tripulación y fase si aplica).');
        } catch (err) {
            console.error(err);
            onMessage?.('❌ ' + getUserFacingError(err, 'No se pudo guardar la fila.'));
        } finally {
            setSavingRow(false);
        }
    };

    const askDeleteRow = (ins) => {
        setDeleteTarget(ins);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget?.id) return;
        setDeleting(true);
        try {
            await removeMaratonNominaRow(deleteTarget.id);
            if (editingIns?.id === deleteTarget.id) closeEditRow();
            setDeleteTarget(null);
            await loadInscriptos(selectedPrueba);
            onMessage?.('✅ Inscripción eliminada de la nómina.');
        } catch (err) {
            console.error(err);
            onMessage?.('❌ ' + getUserFacingError(err, 'No se pudo eliminar. Si el evento ya cerró inscripciones, necesitás rol Admin.'));
        } finally {
            setDeleting(false);
        }
    };

    const hasNumeros = inscriptos.some(i => i.numeroCompetidor && String(i.numeroCompetidor).trim() !== '');
    const isCrewBoat = (form?.crew?.length || 0) > 1;

    const clasificacionGroups = useMemo(() => {
        const map = new Map();
        for (const ins of inscriptos) {
            if (!ins.numeroCompetidor || String(ins.numeroCompetidor).trim() === '') continue;
            const key = ins.clasificacionKey || 'sin-clasificacion';
            const title = ins.clasificacionTitle || 'Sin clasificación';
            if (!map.has(key)) map.set(key, { key, title, count: 0 });
            map.get(key).count += 1;
        }
        return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'es'));
    }, [inscriptos]);

    const categoriasLabelCorta = useMemo(() => {
        const members = selectedLargada?.members || [];
        const cats = [...new Set(
            members
                .map(ep => stripCategoryAges(getCategoriaLabelFromEventoPrueba(ep)))
                .filter(c => c && c !== '—')
        )];
        return cats.join(' + ');
    }, [selectedLargada]);

    const runExport = async (options = {}) => {
        if (!hasNumeros) return;
        setExportingPdf(true);
        try {
            await PdfExportService.exportMaratonLargadaStartList(
                inscriptos,
                evento || 'Evento',
                {
                    largadaLabel: selectedLargada?.label || 'Largada',
                    fechaHora: selectedLargada?.fechaHora || null,
                    categoriasLabel: categoriasLabelCorta,
                    ...options,
                }
            );
        } catch (err) {
            console.error(err);
            onMessage?.('❌ No se pudo generar el PDF de la grilla de largada.');
        } finally {
            setExportingPdf(false);
        }
    };

    const handleExportGrillaPdf = () => runExport({ pdfKind: 'Grilla Completa' });
    const handleExportSubdividedPdf = () => runExport({ subdivide: true, pdfKind: 'Grilla Completa por Categ' });
    const handleExportGroupPdf = (clasificacionKey) => runExport({ clasificacionKey, pdfKind: 'Grilla Completa' });

    useEffect(() => {
        if (!onPdfStateChange) return undefined;
        onPdfStateChange({
            hasNumeros,
            groups: clasificacionGroups,
            exporting: exportingPdf,
            onExportFull: handleExportGrillaPdf,
            onExportSubdivided: handleExportSubdividedPdf,
            onExportGroup: handleExportGroupPdf,
        });
    }, [hasNumeros, clasificacionGroups, exportingPdf, selectedPrueba, selectedLargada, inscriptos, evento, onPdfStateChange]);

    useEffect(() => () => onPdfStateChange?.(null), [onPdfStateChange]);

    const deleteLabel = deleteTarget
        ? (deleteTarget.tripulantes?.length
            ? [deleteTarget.participanteNombreCompleto, ...deleteTarget.tripulantes.map(t => t.participanteNombreCompleto)].filter(Boolean).join(' - ')
            : (deleteTarget.participanteNombreCompleto || `Nº ${deleteTarget.numeroCompetidor || deleteTarget.id}`))
        : '';

    const editModal = editingIns && form && createPortal(
        <div className="admin-modal-overlay" onClick={closeEditRow}>
            <div
                className="admin-modal admin-modal--nomina-edit"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header nomina-edit-header">
                    <div>
                        <h3>Editar nómina</h3>
                        <p className="nomina-edit-subtitle">Cambios de atleta y club impactan en todo el sistema.</p>
                    </div>
                    <button type="button" className="btn-admin-icon" onClick={closeEditRow} title="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="nomina-edit-body">
                    <section className="nomina-edit-section">
                        <h4 className="nomina-edit-section-title">
                            {isCrewBoat ? `Tripulación (${form.crew.length})` : 'Atleta'}
                        </h4>

                        {(form.crew || []).map((member, idx) => (
                            <div key={member.key || idx} className="nomina-edit-crew-card">
                                <div className="nomina-edit-crew-label">{member.rol}</div>
                                <div className="nomina-edit-grid nomina-edit-grid--2">
                                    <label className="nomina-edit-field">
                                        <span>Nombre</span>
                                        <input
                                            className="admin-input"
                                            value={member.nombre}
                                            onChange={e => updateCrewMember(idx, 'nombre', e.target.value)}
                                            disabled={!member.participanteId}
                                        />
                                    </label>
                                    <label className="nomina-edit-field">
                                        <span>Apellido</span>
                                        <input
                                            className="admin-input"
                                            value={member.apellido}
                                            onChange={e => updateCrewMember(idx, 'apellido', e.target.value)}
                                            disabled={!member.participanteId}
                                        />
                                    </label>
                                </div>
                            </div>
                        ))}

                        {!(form.crew || []).length && (
                            <p className="nomina-edit-hint">No hay atletas asociados a esta inscripción.</p>
                        )}

                        <label className="nomina-edit-field">
                            <span>{isCrewBoat ? 'Club del bote (titular)' : 'Club'}</span>
                            <select
                                className="admin-input"
                                value={form.clubId || ''}
                                onChange={e => setForm(f => ({ ...f, clubId: e.target.value }))}
                                disabled={!form.crew?.some(m => m.isTitular && m.participanteId)}
                            >
                                <option value="">Sin club / Independiente</option>
                                {clubes.map(c => (
                                    <option key={c.id || c.Id} value={c.id || c.Id}>
                                        {c.nombre || c.Nombre}{c.siglas || c.Siglas ? ` (${c.siglas || c.Siglas})` : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </section>

                    <section className="nomina-edit-section">
                        <h4 className="nomina-edit-section-title">Competencia</h4>
                        <div className="nomina-edit-grid nomina-edit-grid--numero-clasif">
                            <label className="nomina-edit-field">
                                <span>Nº competidor</span>
                                <input
                                    className="admin-input"
                                    type="number"
                                    min={1}
                                    value={form.numeroCompetidor}
                                    onChange={e => setForm(f => ({ ...f, numeroCompetidor: e.target.value }))}
                                />
                            </label>
                            <label className="nomina-edit-field">
                                <span>Clasificación</span>
                                <select
                                    className="admin-input"
                                    value={form.eventoPruebaId || ''}
                                    onChange={e => setForm(f => ({ ...f, eventoPruebaId: e.target.value }))}
                                >
                                    <option value="">Seleccionar…</option>
                                    {clasificacionOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <p className="nomina-edit-hint">
                            Solo categorías, sexos y botes habilitados en esta largada.
                        </p>
                    </section>
                </div>

                <div className="nomina-edit-footer">
                    <button
                        type="button"
                        className="btn-admin-secondary nomina-edit-btn-danger"
                        onClick={() => askDeleteRow(editingIns)}
                        disabled={savingRow || deleting}
                        title="Eliminar de la nómina"
                    >
                        <Trash2 size={14} style={{ marginRight: 6 }} />
                        Eliminar
                    </button>
                    <div className="nomina-edit-footer-right">
                        <button type="button" className="btn-admin-secondary" onClick={closeEditRow} disabled={savingRow}>
                            Cancelar
                        </button>
                        <button type="button" className="btn-admin-primary" onClick={handleSaveRow} disabled={savingRow}>
                            <Save size={14} style={{ marginRight: 6 }} />
                            {savingRow ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

    return (
        <div className="start-list-view fade-in maraton-start-list">
            {!selectedPrueba ? (
                <div className="empty-state-box glass-effect" style={{ padding: '2rem', textAlign: 'center', opacity: 0.8 }}>
                    Seleccioná una largada arriba para ver todos los atletas inscritos juntos.
                </div>
            ) : loading ? (
                <div className="loader-container"><div className="loader" /></div>
            ) : (
                <>
                    <div
                        className="action-bar-premium glass-effect mb-md"
                        style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
                    >
                        <div className="info-badge-modern">
                            <List size={14} />
                            <span><strong>{inscriptos.length}</strong> Inscritos en la largada</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {isAdmin && (
                                <button
                                    className="btn-admin-action primary"
                                    onClick={handleSortearYArmar}
                                    disabled={saving || !inscriptos.length}
                                >
                                    <RotateCcw size={16} />
                                    {hasNumeros ? 'Regenerar números y largada' : 'Sortear números y armar largada'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="seeding-status-banner info mb-md">
                        <span>
                            Maratón: comparten salida. El sorteo asigna números (1…N) y genera la fase de largada
                            para el Largador / Finalizador (sin carriles ni heats de pista).
                        </span>
                    </div>

                    <div className="inscriptos-seeding-panel glass-effect p-md mb-lg" style={{ borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isNominaCollapsed ? 0 : '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>
                                Nómina de la largada
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className={`btn-admin-icon ${editMode ? 'active' : ''}`}
                                        onClick={() => {
                                            setEditMode(v => !v);
                                            closeEditRow();
                                        }}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '4px',
                                            border: editMode ? '1px solid var(--color-primary)' : undefined,
                                            background: editMode ? 'rgba(59, 130, 246, 0.2)' : undefined,
                                        }}
                                        title={editMode ? 'Salir de edición' : 'Editar nómina'}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-admin-icon"
                                    onClick={() => setIsNominaCollapsed(v => !v)}
                                    style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                                    title={isNominaCollapsed ? 'Expandir' : 'Minimizar'}
                                >
                                    {isNominaCollapsed ? '+' : '−'}
                                </button>
                            </div>
                        </div>

                        {!isNominaCollapsed && (
                            <div className="admin-table-wrapper" style={{ maxHeight: '420px', borderRadius: 'var(--radius-md)' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '70px', textAlign: 'center' }}>Nº</th>
                                            <th>Atleta / Tripulación</th>
                                            <th>Club</th>
                                            <th>Categoría</th>
                                            <th style={{ textAlign: 'center' }}>Sexo</th>
                                            <th style={{ textAlign: 'center' }}>Bote</th>
                                            {editMode && <th style={{ width: '96px' }} />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inscriptos.length === 0 && (
                                            <tr>
                                                <td colSpan={editMode ? 7 : 6} style={{ textAlign: 'center', opacity: 0.7 }}>
                                                    No hay inscritos en esta largada todavía.
                                                </td>
                                            </tr>
                                        )}
                                        {inscriptos.map(ins => (
                                            <tr key={ins.id}>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                    {ins.numeroCompetidor || '—'}
                                                </td>
                                                <td>
                                                    <strong>
                                                        {ins.tripulantes?.length
                                                            ? [ins.participanteNombreCompleto, ...ins.tripulantes.map(t => t.participanteNombreCompleto)].join(' - ')
                                                            : (ins.participanteNombreCompleto || 'Bote de Equipo')}
                                                    </strong>
                                                </td>
                                                <td>{ins.clubNombre || ins.clubSigla || 'Independiente'}</td>
                                                <td style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{ins.categoriaLabel || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`badge-sexo ${
                                                        String(ins.sexoLabel || '').toLowerCase().startsWith('masc') ? 'masc'
                                                            : String(ins.sexoLabel || '').toLowerCase().startsWith('fem') ? 'fem'
                                                                : 'mix'
                                                    }`}>
                                                        {ins.sexoLabel || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="badge-bote">{ins.boteLabel || '—'}</span>
                                                </td>
                                                {editMode && (
                                                    <td>
                                                        <div className="nomina-row-actions">
                                                            <button
                                                                type="button"
                                                                className="btn-admin-icon"
                                                                title="Editar fila"
                                                                onClick={() => openEditRow(ins)}
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-admin-icon nomina-btn-delete"
                                                                title="Eliminar de la nómina"
                                                                onClick={() => askDeleteRow(ins)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '1rem', fontStyle: 'italic' }}>
                            {editMode
                                ? '* Editar impacta atleta/club en todo el sistema. Eliminar saca el bote de la nómina (y de la fase si ya estaba armada) antes de largar.'
                                : '* Tras armar la largada, debería aparecer en el cronograma del Largador / Finalizador.'}
                        </p>
                    </div>

                    {hasNumeros && (
                        <div className="glass-effect p-md maraton-orden-largada" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <h3 style={{ marginTop: 0, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={16} /> Orden de largada (por número)
                            </h3>
                            <ul className="maraton-orden-list">
                                {sortInscriptosByNumero(inscriptos.filter(i => i.numeroCompetidor)).map(ins => (
                                    <li key={ins.id} className="maraton-orden-row">
                                        <span className="maraton-orden-num">#{ins.numeroCompetidor}</span>
                                        <span className="maraton-orden-body">
                                            <strong>{ins.participanteNombreCompleto || 'Atleta'}</strong>
                                            {' · '}
                                            <span className="badge-bote">{ins.boteLabel}</span>
                                            {ins.sexoLabel ? ` · ${ins.sexoLabel}` : ''}
                                            {ins.categoriaLabel ? ` · ${ins.categoriaLabel}` : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
            {editModal}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Eliminar de la nómina"
                message={
                    deleteTarget
                        ? `¿Sacar a ${deleteLabel}${deleteTarget.numeroCompetidor ? ` (Nº ${deleteTarget.numeroCompetidor})` : ''} de esta largada? Se elimina la inscripción y, si la fase ya estaba armada, también su lugar en el cronómetro. No borra al atleta del club.`
                        : ''
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                loading={deleting}
                onClose={() => !deleting && setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

export default MaratonStartListPanel;
