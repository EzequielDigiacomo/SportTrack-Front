import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    Calendar,
    MapPin,
    Settings,
    ArrowLeft,
    ClipboardList,
    Trophy,
} from 'lucide-react';
import EventoService from '../../services/EventoService';
import { PruebaService, CategoriaService, BoteService, DistanciaService } from '../../services/ConfigService';
import ConfigurarPruebasModal from './ConfigurarPruebasModal';
import GestionResultadosSection from './GestionResultadosSection';
import ConfirmDialog from '../Common/ConfirmDialog';
import ClubService from '../../services/ClubService';
import FederacionService from '../../services/FederacionService';
import EventGrid from './EventGrid';
import EventForm from './EventForm';
import { useAlert } from '../../hooks/useAlert';
import { getEventFederationName, eventBelongsToFederation, resolveScopeFederationId, filterClubesByFederation } from '../../utils/apiHelpers';
import {
    MODALIDAD_VELOCIDAD,
    isModalidadMaraton,
    resolveIsMaratonEvent,
    isDistanciaMaratonEligible,
    isDistanciaVelocidadEligible,
    isCategoriaMaratonEligible,
} from '../../utils/pruebaLabelUtils';
import { liveResultsUrl } from '../../utils/constants';
import './AdminSections.css';

const GestionEventosSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const fedIdFromUrl = new URLSearchParams(location.search).get('fedId');
    const role = user?.rol?.trim();
    const isSuperAdmin = role?.toLowerCase() === 'superadmin' || user?.username === 'soporte_tecnico';
    const isAdmin = role?.toLowerCase() === 'admin' || isSuperAdmin;
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar', 'dashboard'
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [activeSubView, setActiveSubView] = useState(null); // 'startlist', 'resultados'
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [clubes, setClubes] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const scopeFedId = useMemo(
        () => resolveScopeFederationId({ fedIdFromUrl, user, clubes }),
        [fedIdFromUrl, user, clubes]
    );
    const clubesDelAlcance = useMemo(
        () => filterClubesByFederation(clubes, scopeFedId),
        [clubes, scopeFedId]
    );
    const [allCategorias, setAllCategorias] = useState([]);
    const [allBotes, setAllBotes] = useState([]);
    const [allDistancias, setAllDistancias] = useState([]);

    const [form, setForm] = useState({
        nombre: '',
        fecha: '',
        fechaFin: '',
        fechaFinInscripciones: '',
        ubicacion: '',
        descripcion: '',
        estado: 'Programada',
        modalidad: MODALIDAD_VELOCIDAD,
        inscripcionesHabilitadas: true,
        restringirSoloCategoriaPropia: false,
        permitirSub23EnSenior: false,
        permitirMasterBajarASenior: false,
        permitirCompletarK4: false,
        limitacionBotesAB: false,
        clubId: '',
        horaInicioEvento: '08:00',
        carrilesDisponibles: 9,
        perfilTiempo: 'Estandar',
        horaInicioReceso: '13:00',
        horaFinReceso: '14:00',
        sinReceso: false,
        gapEntrePruebas: 10,
        gapRecuperacionMinutos: 40,
        permitirCombinadas: false,
        usarGapVariable: false,
        timeZoneId: 'America/Argentina/Buenos_Aires',
        categoriasHabilitadas: '',
        botesHabilitados: '',
        distanciasHabilitadas: '',
        controlNombreExtra: '',
        controlFecha: new Date().toISOString().substring(0, 10),
    });

    const { alert: msg, showAlert } = useAlert();
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, evento: null });
    const [validationErrors, setValidationErrors] = useState(null);

    useEffect(() => {
        (async () => {
            const clubesData = await loadClubes();
            await loadEventos(clubesData);
        })();
        if (isSuperAdmin) loadFederaciones();
        loadConfigData();

        const handlePopState = (e) => {
            if (!e.state) { 
                setView('lista'); 
                setSelectedEvento(null); 
                setActiveSubView(null); 
                setShowConfigModal(false); 
            }
            else {
                if (e.state.evento) setSelectedEvento(e.state.evento);
                
                if (e.state.panel === 'dashboard') { 
                    setView('dashboard'); 
                    setActiveSubView(null); 
                    setShowConfigModal(false); 
                }
                else if (e.state.panel === 'config') { 
                    setShowConfigModal(true); 
                }
                else if (e.state.panel === 'startlist') { 
                    setView('dashboard');
                    setActiveSubView('startlist'); 
                }
                else if (e.state.panel === 'resultados') { 
                    setView('dashboard');
                    setActiveSubView('resultados'); 
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [fedIdFromUrl]);

    const loadEventos = async (clubesForFilter = clubes) => {
        setLoading(true);
        try {
            const scopeFedId = resolveScopeFederationId({
                fedIdFromUrl,
                user,
                clubes: clubesForFilter,
            });
            const data = scopeFedId
                ? await EventoService.getAll(scopeFedId, { asFederation: true })
                : await EventoService.getAll();

            let filtered = isSuperAdmin
                ? (data || [])
                : (data || []).filter(e => !e.nombre?.toLowerCase().includes('control'));

            if (scopeFedId != null) {
                filtered = filtered.filter(e =>
                    eventBelongsToFederation(e, clubesForFilter, scopeFedId, { trustApiScope: true })
                );
            }

            setEventos(filtered);
        } catch (e) {
            showAlert('error', 'Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    const loadClubes = async () => {
        try {
            const data = await ClubService.getAll();
            setClubes(data);
            return data;
        } catch (e) {
            console.error("Error al cargar clubes", e);
            return [];
        }
    };

    const loadFederaciones = async () => {
        try {
            const data = await FederacionService.getAll();
            setFederaciones(data || []);
        } catch (e) {
            console.error("Error al cargar federaciones", e);
        }
    };

    const eventosConFederacion = useMemo(
        () => eventos.map(ev => ({
            ...ev,
            federacionNombre: getEventFederationName(ev, clubes, federaciones),
        })),
        [eventos, clubes, federaciones]
    );

    const loadConfigData = async () => {
        try {
            const [c, b, d] = await Promise.all([
                CategoriaService.getAll(),
                BoteService.getAll(),
                DistanciaService.getAll()
            ]);
            setAllCategorias(c);
            setAllBotes(b);
            setAllDistancias(d);
        } catch (e) {
            console.error("Error al cargar datos de configuración", e);
        }
    };

    const handleOpenDashboard = async (evento) => {
        setSelectedEvento(evento);
        window.history.pushState({ panel: 'dashboard', evento }, '');
        setView('dashboard');
        try {
            const fresh = await EventoService.getById(evento.id);
            if (fresh) setSelectedEvento(prev => ({ ...prev, ...fresh }));
        } catch (e) {
            console.warn('No se pudo refrescar el evento', e);
        }
    };

    const handleOpenConfig = async () => {
        let eventoForModal = selectedEvento;
        try {
            if (selectedEvento?.id) {
                const fresh = await EventoService.getById(selectedEvento.id);
                if (fresh) {
                    eventoForModal = { ...selectedEvento, ...fresh };
                    setSelectedEvento(eventoForModal);
                }
            }
        } catch (e) {
            console.warn('No se pudo refrescar el evento antes de configurar', e);
        }
        window.history.pushState({ panel: 'config', evento: eventoForModal }, '');
        setShowConfigModal(true);
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => {
            if (name !== 'modalidad') {
                return { ...prev, [name]: value };
            }

            const next = { ...prev, modalidad: value };
            if (isModalidadMaraton(value)) {
                const distIds = (prev.distanciasHabilitadas || '').split(',').filter(Boolean)
                    .filter(id => isDistanciaMaratonEligible(id));
                const catIds = (prev.categoriasHabilitadas || '').split(',').filter(Boolean)
                    .filter(id => isCategoriaMaratonEligible(id));
                next.distanciasHabilitadas = distIds.join(',');
                next.categoriasHabilitadas = catIds.join(',');
                next.restringirSoloCategoriaPropia = false;
                next.permitirSub23EnSenior = false;
                next.permitirMasterBajarASenior = false;
                next.limitacionBotesAB = false;
                next.usarGapVariable = false;
                next.permitirCombinadas = false;
            } else {
                const distIds = (prev.distanciasHabilitadas || '').split(',').filter(Boolean)
                    .filter(id => isDistanciaVelocidadEligible(id));
                next.distanciasHabilitadas = distIds.join(',');
            }
            return next;
        });
    };

    const validateForm = () => {
        const errors = [];
        if (!form.nombre || !form.nombre.trim()) errors.push("Nombre del Evento");
        if (!form.fecha) errors.push("Fecha de Inicio");
        if (!form.fechaFin) errors.push("Fecha de Finalización");
        if (!form.ubicacion || !form.ubicacion.trim()) errors.push("Ubicación / Pista");
        
        if (form.fecha && form.fechaFin && new Date(form.fechaFin) < new Date(form.fecha)) {
            errors.push("La fecha de fin debe ser posterior o igual a la de inicio");
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        const errors = validateForm();
        if (errors.length > 0) {
            setValidationErrors({ title: "Datos Faltantes o Incorrectos", list: errors });
            return;
        }

        setSaving(true);

        const payload = {
            ...form,
            clubId: form.clubId === "" ? null : parseInt(form.clubId),
            federacionId: scopeFedId != null ? Number(scopeFedId) : (form.federacionId || null),
            modalidad: isModalidadMaraton(form.modalidad) ? 'Maraton' : 'Velocidad',
        };

        try {
            if (view === 'editar' && selectedEvento) {
                await EventoService.update(selectedEvento.id, payload);
                showAlert('success', '¡Evento actualizado exitosamente!');
            } else {
                await EventoService.create(payload);
                showAlert('success', '¡Evento creado exitosamente!');
            }
            setView('lista');
            loadEventos();
        } catch (err) {
            // En lugar de toast, mostramos el error del servidor en el modal
            setValidationErrors({ 
                title: "Error al Guardar", 
                list: [err.message || "Ocurrió un error inesperado al procesar la solicitud."] 
            });
        } finally { setSaving(false); }
    };

    const handleEdit = (evento) => {
        setSelectedEvento(evento);
        setForm({
            nombre: evento.nombre || '',
            fecha: evento.fecha ? evento.fecha.substring(0, 10) : '',
            fechaFin: evento.fechaFin ? evento.fechaFin.substring(0, 10) : '',
            fechaFinInscripciones: evento.fechaFinInscripciones ? evento.fechaFinInscripciones.substring(0, 10) : '',
            ubicacion: evento.ubicacion || '',
            descripcion: evento.descripcion || '',
            estado: evento.estado || 'Programado',
            modalidad: evento.modalidad || MODALIDAD_VELOCIDAD,
            inscripcionesHabilitadas: evento.inscripcionesHabilitadas ?? true,
            restringirSoloCategoriaPropia: evento.restringirSoloCategoriaPropia || false,
            permitirSub23EnSenior: evento.permitirSub23EnSenior || false,
            permitirMasterBajarASenior: evento.permitirMasterBajarASenior || false,
            permitirCompletarK4: evento.permitirCompletarK4 || false,
            limitacionBotesAB: evento.limitacionBotesAB || false,
            clubId: evento.clubId || '',
            horaInicioEvento: evento.horaInicioEvento || '08:00',
            carrilesDisponibles: evento.carrilesDisponibles || 9,
            perfilTiempo: evento.perfilTiempo || 'Estandar',
            horaInicioReceso: evento.horaInicioReceso || '13:00',
            horaFinReceso: evento.horaFinReceso || '14:00',
            sinReceso: evento.sinReceso || false,
            gapEntrePruebas: evento.gapEntrePruebas || 10,
            gapRecuperacionMinutos: evento.gapRecuperacionMinutos ?? 40,
            permitirCombinadas: evento.permitirCombinadas || false,
            usarGapVariable: evento.usarGapVariable || false,
            timeZoneId: evento.timeZoneId || 'America/Argentina/Buenos_Aires',
            categoriasHabilitadas: evento.categoriasHabilitadas || '',
            botesHabilitados: evento.botesHabilitados || '',
            distanciasHabilitadas: evento.distanciasHabilitadas || '',
        });
        setView('editar');
    };

    const handleCopyLiveLink = (id, nombre) => {
        const url = liveResultsUrl(id);
        navigator.clipboard.writeText(url);
        showAlert('info', `¡Link de "${nombre}" copiado!`);
    };

    const handleDelete = (evento) => {
        setDeleteConfirm({ show: true, evento });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.evento) return;
        setSaving(true);
        try {
            await EventoService.delete(deleteConfirm.evento.id);
            showAlert('success', '¡Evento eliminado correctamente!');
            setDeleteConfirm({ show: false, evento: null });
            loadEventos();
        } catch (err) {
            showAlert('error', 'Error al eliminar: ' + err.message);
        } finally { setSaving(false); }
    };

    return (
        <div className="admin-section-container gestion-eventos-section">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            {view === 'lista' && (
                <div className="fade-in">
                    <div className="section-header-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            <button
                                className="btn-admin-secondary"
                                onClick={() => navigate(-1)}
                                title="Volver"
                                style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Gestión de Eventos</h1>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            {isAdmin && (
                                <button className="btn-admin-secondary" style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }} onClick={() => setView('crearControl')}>
                                    <Plus size={20} /> Nuevo Control
                                </button>
                            )}
                            <button className="btn-admin-primary" onClick={() => {
                                setSelectedEvento(null);
                                setForm(prev => ({
                                    ...prev,
                                    nombre: '',
                                    fecha: '',
                                    fechaFin: '',
                                    fechaFinInscripciones: '',
                                    ubicacion: '',
                                    descripcion: '',
                                    estado: 'Programada',
                                    modalidad: MODALIDAD_VELOCIDAD,
                                    inscripcionesHabilitadas: true,
                                    restringirSoloCategoriaPropia: false,
                                    permitirSub23EnSenior: false,
                                    permitirMasterBajarASenior: false,
                                    permitirCompletarK4: false,
                                    limitacionBotesAB: false,
                                    clubId: '',
                                    horaInicioEvento: '08:00',
                                    carrilesDisponibles: 9,
                                    perfilTiempo: 'Estandar',
                                    horaInicioReceso: '13:00',
                                    horaFinReceso: '14:00',
                                    sinReceso: false,
                                    gapEntrePruebas: 10,
                                    gapRecuperacionMinutos: 40,
                                    permitirCombinadas: false,
                                    usarGapVariable: false,
                                    timeZoneId: 'America/Argentina/Buenos_Aires',
                                    categoriasHabilitadas: '',
                                    botesHabilitados: '',
                                    distanciasHabilitadas: '',
                                }));
                                setView('crear');
                            }}>
                                <Plus size={20} /> Nuevo Evento
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loader-container"><div className="loader"></div></div>
                    ) : (
                        <EventGrid
                            eventos={eventosConFederacion}
                            onOpenDashboard={handleOpenDashboard}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onCopyLink={handleCopyLiveLink}
                            isAdmin={isAdmin}
                            showFederation={isSuperAdmin && !scopeFedId}
                        />
                    )}
                </div>
            )}

            {(view === 'crear' || view === 'editar') && (
                <EventForm
                    initialData={form}
                    saving={saving}
                    isEditing={view === 'editar'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                    clubes={clubesDelAlcance}
                    allCategorias={allCategorias}
                    allBotes={allBotes}
                    allDistancias={allDistancias}
                />
            )}

            {view === 'crearControl' && (
                <div className="fade-in">
                    <div className="section-header-row" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            <button className="btn-admin-secondary" onClick={() => setView('lista')} style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%' }}>
                                <ArrowLeft size={20} />
                            </button>
                            <h2 style={{ margin: 0 }}>Nuevo Control Técnico</h2>
                        </div>
                    </div>
                    <div className="admin-form-card glass-effect" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className="admin-grid-form" style={{ padding: '2rem' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Nombre del Control (Opcional - ej: Tanda 1, Mañana, etc)</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    placeholder="Ej: Tanda Mañana" 
                                    value={form.controlNombreExtra} 
                                    onChange={e => handleFieldChange('controlNombreExtra', e.target.value)} 
                                />
                                <small style={{ color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                    Esto se añadirá al nombre automático para diferenciar los controles.
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Bote / Embarcación</label>
                                <select className="admin-select" value={form.controlBote} onChange={e => handleFieldChange('controlBote', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="1">K1 - Kayak Individual</option>
                                    <option value="2">K2 - Kayak Doble</option>
                                    <option value="3">K4 - Kayak Cuádruple</option>
                                    <option value="4">C1 - Canoa Individual</option>
                                    <option value="5">C2 - Canoa Doble</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Distancia</label>
                                <select className="admin-select" value={form.controlDist} onChange={e => handleFieldChange('controlDist', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="1">200m</option>
                                    <option value="5">500m</option>
                                    <option value="6">1000m</option>
                                    <option value="8">2000m</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Rama (Sexo)</label>
                                <select className="admin-select" value={form.controlSex} onChange={e => handleFieldChange('controlSex', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="1">Masculino</option>
                                    <option value="2">Femenino</option>
                                    <option value="3">Mixto</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Fecha del Control</label>
                                <input 
                                    type="date" 
                                    className="admin-input" 
                                    value={form.controlFecha} 
                                    onChange={e => handleFieldChange('controlFecha', e.target.value)} 
                                />
                            </div>
                            <div className="form-footer-actions mt-lg">
                                <button className="btn-admin-secondary" onClick={() => setView('lista')}>Cancelar</button>
                                <button 
                                    className="btn-admin-primary" 
                                    disabled={saving}
                                    onClick={async () => {
                                        // Validación para Control
                                        const cErrors = [];
                                        if (!form.controlBote) cErrors.push("Bote / Embarcación");
                                        if (!form.controlDist) cErrors.push("Distancia");
                                        if (!form.controlSex) cErrors.push("Rama (Sexo)");
                                        if (!form.controlFecha) cErrors.push("Fecha del Control");

                                        if (cErrors.length > 0) {
                                            setValidationErrors({ title: "Faltan Datos para el Control", list: cErrors });
                                            return;
                                        }

                                        setSaving(true);
                                        try {
                                            const boteMap = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2' };
                                            const distMap = { 1: '200m', 5: '500m', 6: '1000m', 8: '2000m', 9: '3000m', 10: '5000m' };
                                            const sexMap = { 1: 'Masc', 2: 'Fem', 3: 'Mixto' };
                                            const boteName = boteMap[form.controlBote] || 'K1';
                                            const distName = distMap[form.controlDist] || '500m';
                                            const sexName = sexMap[form.controlSex] || 'Masc';
                                            const extraName = form.controlNombreExtra ? ` - ${form.controlNombreExtra}` : '';
                                            
                                            // 1. Crear Evento
                                            const evPayload = {
                                                nombre: `Control ${distName} ${boteName} ${sexName}${extraName}`,
                                                fecha: form.controlFecha,
                                                fechaFin: form.controlFecha,
                                                estado: 'Programada',
                                                inscripcionesHabilitadas: true,
                                                clubId: form.clubId || null,
                                                federacionId: scopeFedId != null ? Number(scopeFedId) : null,
                                            };
                                            const newEv = await EventoService.create(evPayload);
                                            
                                            // 2. Crear Prueba (Categoría 11 = Control)
                                            const prPayload = {
                                                categoriaId: 11,
                                                boteId: parseInt(form.controlBote),
                                                distanciaId: parseInt(form.controlDist),
                                                sexoId: parseInt(form.controlSex),
                                                fechaHora: new Date(`${form.controlFecha}T08:00:00`).toISOString()
                                            };
                                            await PruebaService.assignToEvento(newEv.id, null, prPayload);
                                            
                                            showAlert('success', '¡Control creado exitosamente!');
                                            setView('lista');
                                            loadEventos();
                                        } catch (err) {
                                            setValidationErrors({ 
                                                title: "Error al Crear Control", 
                                                list: [err.message || "Error al conectar con el servidor."] 
                                            });
                                        } finally { setSaving(false); }
                                    }}
                                >
                                    {saving ? 'Creando...' : 'Crear Control'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'dashboard' && (
                <div className="event-dashboard fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.5rem' }}>
                        <button
                            className="btn-admin-secondary"
                            onClick={() => {
                                setView('lista');
                                setSelectedEvento(null);
                                window.history.pushState(null, '');
                            }}
                            title="Volver a la lista"
                            style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Gestión de Eventos</h1>
                    </div>
                    {selectedEvento && !activeSubView ? (
                        <>
                            <div className="event-dashboard-header glass-effect">
                                <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>{selectedEvento.nombre}</h2>
                                <p className="dashboard-meta">
                                    <Calendar size={16} /> {new Date(selectedEvento.fecha).toLocaleDateString('es-AR')} | <MapPin size={16} /> {selectedEvento.ubicacion || 'Sin ubicación'}
                                </p>
                                <div className="dashboard-chips">
                                    {resolveIsMaratonEvent(selectedEvento) ? (
                                        <span className="chip" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#7dd3fc' }}>Maratón</span>
                                    ) : (
                                        <span className="chip" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}>Velocidad</span>
                                    )}
                                    {selectedEvento.restringirSoloCategoriaPropia && <span className="chip chip-ecu-yellow">Categoría Única</span>}
                                    {selectedEvento.permitirSub23EnSenior && <span className="chip chip-ecu-blue">S23 en Senior</span>}
                                    {selectedEvento.permitirMasterBajarASenior && <span className="chip chip-ecu-red">Master en Senior</span>}
                                    {selectedEvento.permitirCompletarK4 && <span className="chip chip-ecu-yellow">Refuerzo K4</span>}
                                    {selectedEvento.limitacionBotesAB && <span className="chip chip-ecu-red">Máx Botes A/B</span>}
                                </div>
                            </div>

                            <div className="dashboard-grid dashboard-grid-3col">
                                <div className="dashboard-card glass-effect clickable" onClick={handleOpenConfig}>
                                    <div className="card-icon"><Calendar size={32} /></div>
                                    <h3>1. Armar Schedule</h3>
                                    <p>Crear pruebas y horarios para que los clubes inscriban a sus atletas.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => {
                                    window.history.pushState({ panel: 'startlist', evento: selectedEvento }, '');
                                    setActiveSubView('startlist');
                                }}>
                                    <div className="card-icon"><ClipboardList size={32} /></div>
                                    <h3>2. Start List</h3>
                                    <p>Cerrar inscripciones, armar series y sortear carriles aleatoriamente.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => {
                                    window.history.pushState({ panel: 'resultados', evento: selectedEvento }, '');
                                    setActiveSubView('resultados');
                                }}>
                                    <div className="card-icon"><Trophy size={32} /></div>
                                    <h3>3. Result List</h3>
                                    <p>Ver resultados finales, generar reportes y exportar PDFs de la competencia.</p>
                                </div>
                            </div>
                        </>
                    ) : selectedEvento ? (
                        <div>
                            <div className="subview-header" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.5rem' }}>
                                <button
                                    className="btn-admin-secondary"
                                    onClick={() => window.history.back()}
                                    title="Volver al Dashboard"
                                    style={{ padding: '0', width: '30px', height: '30px', borderRadius: '10%', flexShrink: 0 }}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 style={{ margin: 0 }}>
                                    {activeSubView === 'startlist' && 'Gestión de Start List y Sorteos'}
                                    {activeSubView === 'tiempos' && 'Carga de Tiempos Oficiales'}
                                    {activeSubView === 'resultados' && 'Resultados Finales y Reportes'}
                                </h3>
                            </div>
                            <GestionResultadosSection
                                preselectedEventoId={selectedEvento.id}
                                defaultTab={activeSubView === 'startlist' ? 'startList' : 'resultados'}
                                isEmbedded={true}
                                viewMode={activeSubView} // Pasamos la subvista para filtrar UI
                            />
                        </div>
                    ) : (
                        <div className="loader-container"><div className="loader"></div></div>
                    )}
                </div>
            )}

            {showConfigModal && (
                <ConfigurarPruebasModal
                    evento={selectedEvento}
                    onClose={() => window.history.back()}
                    onRefresh={loadEventos}
                />
            )}

            <ConfirmDialog
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, evento: null })}
                onConfirm={confirmDelete}
                title="Eliminar Evento"
                message={`¿Estás seguro de que deseas eliminar el evento "${deleteConfirm.evento?.nombre}"? Esta acción no se puede deshacer.`}
                type="danger"
                confirmText="Sí, Eliminar"
                loading={saving}
            />

            <ConfirmDialog
                isOpen={!!validationErrors}
                onClose={() => setValidationErrors(null)}
                title={validationErrors?.title || "Atención"}
                message={
                    <div style={{ textAlign: 'left' }}>
                        {validationErrors?.list?.length > 1 ? (
                            <>
                                <p>Por favor, revisa los siguientes campos obligatorios:</p>
                                <ul style={{ marginTop: '10px', color: 'var(--color-secondary)', fontWeight: 'bold' }}>
                                    {validationErrors.list.map((err, i) => (
                                        <li key={i} style={{ marginBottom: '5px' }}>• {err}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p style={{ fontWeight: '500' }}>{validationErrors?.list?.[0]}</p>
                        )}
                    </div>
                }
                type={validationErrors?.title?.includes('Error') ? 'danger' : 'warning'}
                confirmText="Entendido"
                cancelText={null}
            />
        </div>
    );
};

export default GestionEventosSection;
