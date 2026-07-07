import React, { useState, useEffect } from 'react';
import { CategoriaService, BoteService, DistanciaService, PruebaService } from '../../services/ConfigService';
import SchedulerService from '../../services/SchedulerService';
import PdfExportService from '../../services/PdfExportService';
import ConfirmDialog from '../Common/ConfirmDialog';
import './ConfigurarPruebas.css';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { pick } from '../../utils/apiHelpers';

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

const BOTE_COLORS = {
    1: { text: '#6366f1' }, 2: { text: '#8b5cf6' }, 3: { text: '#a855f7' },
    4: { text: '#f59e0b' }, 5: { text: '#f97316' }, 6: { text: '#ef4444' }
};

const getISODatePart = (dateString) => dateString ? dateString.substring(0, 10) : '';

const ConfigurarPruebasModal = ({ evento, onClose, onRefresh }) => {
    const [categorias, setCategorias] = useState([]);
    const [botes, setBotes] = useState([]);
    const [distancias, setDistancias] = useState([]);
    const [pruebasActuales, setPruebasActuales] = useState([]);
    const [fasesLive, setFasesLive] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedCat, setSelectedCat] = useState('');
    const [selectedBote, setSelectedBote] = useState('');
    const [selectedDist, setSelectedDist] = useState('');
    const [selectedSex, setSelectedSex] = useState('');
    const [selectedDate, setSelectedDate] = useState(evento.fecha ? evento.fecha.substring(0, 10) : '');
    const [selectedTime, setSelectedTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [filtroDia, setFiltroDia] = useState('Todos');
    const [editingId, setEditingId] = useState(null);

    const [gapEntrePruebas, setGapEntrePruebas] = useState(evento.gapEntrePruebas || 10);
    const [gapRecuperacion, setGapRecuperacion] = useState(40);
    const [horaInicioFinales, setHoraInicioFinales] = useState('10:30');
    const [usarBloqueFinales, setUsarBloqueFinales] = useState(true);
    const [usarGapVariable, setUsarGapVariable] = useState(evento.usarGapVariable || false);

    const [modalConfig, setModalConfig] = useState({ show: false, type: 'warning', title: '', message: '' });

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

    // Automatically pre-fill the estimated time based on the last scheduled race and the gap
    useEffect(() => {
        if (!editingId && pruebasActuales.length > 0) {
            const sortedPruebas = [...pruebasActuales].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            const lastPrueba = sortedPruebas[sortedPruebas.length - 1];
            const lastTime = new Date(lastPrueba.fechaHora);
            const nextTime = new Date(lastTime.getTime() + gapEntrePruebas * 60 * 1000);
            const hours = String(nextTime.getHours()).padStart(2, '0');
            const minutes = String(nextTime.getMinutes()).padStart(2, '0');
            setSelectedTime(`${hours}:${minutes}`);
        } else if (!editingId) {
            setSelectedTime('');
        }
    }, [gapEntrePruebas, pruebasActuales, editingId]);

    const resetForm = () => {
        setSelectedCat(''); setSelectedBote(''); setSelectedDist('');
        setSelectedSex(''); 
        
        // Suggest time for the next race automatically
        if (pruebasActuales.length > 0) {
            const sortedPruebas = [...pruebasActuales].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            const lastPrueba = sortedPruebas[sortedPruebas.length - 1];
            const lastTime = new Date(lastPrueba.fechaHora);
            const nextTime = new Date(lastTime.getTime() + gapEntrePruebas * 60 * 1000);
            const hours = String(nextTime.getHours()).padStart(2, '0');
            const minutes = String(nextTime.getMinutes()).padStart(2, '0');
            setSelectedTime(`${hours}:${minutes}`);
        } else {
            setSelectedTime('');
        }
        
        setEditingId(null);
    };

    const handleAddPrueba = async () => {
        if (!selectedCat || !selectedBote || !selectedDist || !selectedSex || !selectedDate) return false;
        
        let finalTime = selectedTime;
        if (!finalTime) {
            if (editingId) {
                const currentEp = pruebasActuales.find(p => p.id === editingId);
                if (currentEp) {
                    const originalDate = new Date(currentEp.fechaHora);
                    const hours = String(originalDate.getHours()).padStart(2, '0');
                    const minutes = String(originalDate.getMinutes()).padStart(2, '0');
                    finalTime = `${hours}:${minutes}`;
                }
            } else if (pruebasActuales.length > 0) {
                const sortedPruebas = [...pruebasActuales].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
                const lastPrueba = sortedPruebas[sortedPruebas.length - 1];
                const lastTime = new Date(lastPrueba.fechaHora);
                const nextTime = new Date(lastTime.getTime() + gapEntrePruebas * 60 * 1000);
                const hours = String(nextTime.getHours()).padStart(2, '0');
                const minutes = String(nextTime.getMinutes()).padStart(2, '0');
                finalTime = `${hours}:${minutes}`;
            } else {
                setModalConfig({
                    show: true,
                    title: 'Hora de inicio requerida',
                    message: 'Debe ingresar la hora de inicio para la primera prueba del evento.',
                    type: 'warning'
                });
                return false;
            }
        }

        setSaving(true);
        try {
            const payload = {
                eventoId: evento.id,
                categoriaId: parseInt(selectedCat),
                boteId: parseInt(selectedBote),
                distanciaId: parseInt(selectedDist),
                sexoId: parseInt(selectedSex),
                fechaHora: new Date(`${selectedDate}T${finalTime}:00`).toISOString()
            };
            if (editingId) await PruebaService.updateAssign(editingId, payload);
            else await PruebaService.assignToEvento(evento.id, null, payload);
            
            const updated = await PruebaService.getByEvento(evento.id);
            setPruebasActuales(updated);
            resetForm();
            return true;
        } catch (err) {
            console.error(err);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePrueba = async (id) => {
        try {
            await PruebaService.deleteAssign(id);
            setPruebasActuales(prev => prev.filter(p => p.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleEditStart = (ep) => {
        if (!ep || !ep.prueba) return;
        setEditingId(ep.id);
        setSelectedCat((ep.prueba.categoriaId || ep.prueba.categoria?.id || '').toString());
        setSelectedBote((ep.prueba.boteId || ep.prueba.bote?.id || '').toString());
        setSelectedDist((ep.prueba.distanciaId || ep.prueba.distancia?.id || '').toString());
        setSelectedSex((ep.prueba.sexoId || ep.prueba.sexo?.id || '').toString());
        const date = new Date(ep.fechaHora);
        if (!isNaN(date.getTime())) {
            setSelectedDate(getISODatePart(ep.fechaHora));
            setSelectedTime(date.toTimeString().substring(0, 5));
        }
    };

    const diasUnicos = ['Todos', ...new Set([
        ...pruebasActuales.map(ep => getISODatePart(ep.fechaHora)),
        ...fasesLive.map(f => getISODatePart(f.fechaHoraProgramada))
    ])].filter(Boolean).sort();

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal glass-effect fade-in">
                <div className="modal-header">
                    <h3>Configurar Evento - {evento.nombre}</h3>
                    <button className="btn-icon-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body overflow-y">
                    <div className="admin-grid-layout">
                        <div className="form-column">
                            <h4 className="section-title">{editingId ? 'Editar Prueba' : 'Nueva Prueba'}</h4>
                            <div className="admin-grid-form">
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
                                <div className="form-group"><label>Distancia</label>
                                    <select className="admin-select" value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {distancias.map(d => <option key={d.id} value={d.id}>{DISTANCIA_NAMES[d.id] || d.distanciaRegata + 'm'}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label>Rama</label>
                                    <select className="admin-select" value={selectedSex} onChange={e => setSelectedSex(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="1">Masculino</option><option value="2">Femenino</option><option value="3">Mixto</option>
                                    </select>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group"><label>Día</label><input type="date" className="admin-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
                                    <div className="form-group"><label>Hora</label><input type="time" className="admin-input" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} /></div>
                                </div>
                                <div className="form-actions mt-md">
                                    {editingId && <button className="btn-admin-secondary" onClick={resetForm}>Cancelar</button>}
                                    <button className="btn-admin-primary flex-1" onClick={handleAddPrueba} disabled={saving}>{saving ? '...' : (editingId ? 'Actualizar' : 'Habilitar')}</button>
                                </div>
                            </div>

                            <hr className="admin-divider" style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.08)' }} />
                            <h4 className="section-title">Ajustes del Cronograma</h4>
                            <div className="admin-grid-form" style={{ gap: '12px' }}>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Gap base (min)</label>
                                        <input type="number" className="admin-input" value={gapEntrePruebas} onChange={e => setGapEntrePruebas(parseInt(e.target.value) || 10)} min="1" max="120" />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>Descanso (min)</label>
                                        <input type="number" className="admin-input" value={gapRecuperacion} onChange={e => setGapRecuperacion(parseInt(e.target.value) || 40)} min="10" max="180" />
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
                        </div>

                        <div className="list-column">
                            <div className="flex-between mb-md">
                                <h4 className="section-title" style={{margin:0}}>Cronograma Unificado (Pateo en Vivo)</h4>
                                <select className="admin-select-sm" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                                    {diasUnicos.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="table-container-mini">
                                {loading ? <div className="loader"></div> : (() => {
                                    const idsPruebasConFases = new Set(fasesLive.map(f => f.eventoPruebaId));
                                    
                                    // 1. Unificar items base
                                    const rawItems = [
                                        ...fasesLive.map(f => ({ 
                                            tipo: 'fase', 
                                            id: `f-${f.id}`, 
                                            time: f.fechaHoraProgramada, 
                                            fechaHoraOriginal: (f.prueba?.prueba || f.prueba)?.fechaHora, // Hora base del programa
                                            nombre: f.nombreFase, 
                                            raw: f,
                                            numeroFase: f.numeroFase,
                                            etapaId: f.etapaId,
                                            etapaOrden: f.etapa?.orden || 1, // FUNDAMENTAL para que las Series vayan primero
                                            gapSugerido: f.etapa?.eventoPrueba?.prueba?.distancia?.gapSugerido || f.prueba?.prueba?.distancia?.gapSugerido || 0
                                        })),
                                        ...pruebasActuales.filter(ep => !idsPruebasConFases.has(ep.id)).map(ep => ({ 
                                            tipo: 'prueba', 
                                            id: `p-${ep.id}`, 
                                            time: ep.fechaHora, 
                                            fechaHoraOriginal: ep.fechaHora,
                                            nombre: 'A Sortear', 
                                            raw: ep,
                                            etapaOrden: 1, // Las pruebas sin sortear se asumen como Eliminatorias
                                            gapSugerido: ep.prueba?.distancia?.gapSugerido || 0
                                        }))
                                    ];

                                    // 2. Aplicar Motor de Pateo en Vivo
                                    const itemsProyectados = SchedulerService.recalcularTiempos(rawItems, {
                                        gapEntrePruebas: gapEntrePruebas,
                                        gapRecuperacionMs: gapRecuperacion * 60 * 1000,
                                        horaInicioFinales: usarBloqueFinales ? horaInicioFinales : null,
                                        horaInicioEvento: evento.horaInicioEvento || "08:00",
                                        horaFinEvento: "18:00",
                                        usarGapVariable: usarGapVariable
                                    });

                                    // 3. Filtrar por día
                                    const itemsFinales = itemsProyectados.filter(item => 
                                        filtroDia === 'Todos' || getISODatePart(item.timeCalculated) === filtroDia
                                    );

                                    return (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
                                                <button 
                                                    className="btn-admin-secondary" 
                                                    onClick={() => PdfExportService.exportProgramaInicial(itemsFinales, evento?.nombre || 'Evento')}
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
                                                    const p = isF ? (raw.etapa?.eventoPrueba?.prueba || raw.prueba?.prueba || raw.prueba) : raw.prueba;
                                                    
                                                    const catId = p?.categoriaId || p?.categoria?.id;
                                                    const botId = p?.boteId || p?.bote?.id;
                                                    const distId = p?.distanciaId || p?.distancia?.id;
                                                    const sexId = p?.sexoId || p?.sexo?.id;

                                                    const originalTime = it.fechaHoraOriginal || it.time;
                                                    const isPateada = it.timeCalculated !== originalTime;

                                                    return (
                                                        <tr key={it.id} className={isF ? 'row-fase' : ''} style={{ 
                                                            opacity: isF ? 1 : 0.8,
                                                            background: isF ? 'rgba(59, 130, 246, 0.03)' : 'transparent'
                                                        }}>
                                                            <td>{itemsFinales.length - idx}</td>
                                                            <td>
                                                                <span className="badge-outline" style={{ borderColor: CATEGORIA_COLORS[catId]?.text, color: CATEGORIA_COLORS[catId]?.text }}>
                                                                    {CATEGORIA_NAMES[catId] || 'Cat'}
                                                                    {isF && <span className="phase-tag"> - {it.nombre}</span>}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="badge-bote">
                                                                    {BOTE_NAMES[botId] || 'Bote'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="badge-distancia">
                                                                    {DISTANCIA_NAMES[distId] || (p?.distancia?.metros + 'm')}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge-sexo ${sexId === 1 ? 'masc' : sexId === 2 ? 'fem' : 'mix'}`}>
                                                                    {sexId === 1 ? 'Masculino' : sexId === 2 ? 'Femenino' : 'Mixto'}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontWeight: 'bold', color: isPateada ? '#fbbf24' : '#3b82f6' }}>
                                                                {it.nuevaHora}
                                                            </td>
                                                            <td>
                                                                <span className="badge-inscritos">
                                                                    {isF 
                                                                        ? (it.raw?.resultados?.length || '0')
                                                                        : (it.raw?.cantidadInscritos || it.raw?.prueba?.cantidadInscritos || '0')
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="actions-cell">
                                                                {!isF && (
                                                                    <>
                                                                        <button className="btn-icon-admin edit" onClick={() => handleEditStart(it.raw)}>✏️</button>
                                                                        <button className="btn-icon-delete" onClick={() => handleDeletePrueba(it.raw.id)}>🗑️</button>
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
            <ConfirmDialog isOpen={modalConfig.show} title={modalConfig.title} message={modalConfig.message} onConfirm={() => setModalConfig({show:false})} onClose={() => setModalConfig({show:false})} />
        </div>
    );
};

export default ConfigurarPruebasModal;
