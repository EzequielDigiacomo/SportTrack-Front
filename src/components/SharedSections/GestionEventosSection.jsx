import React, { useState, useEffect } from 'react';
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
import ConfigurarPruebasModal from './ConfigurarPruebasModal';
import GestionResultadosSection from './GestionResultadosSection';
import ConfirmDialog from '../Common/ConfirmDialog';
import ClubService from '../../services/ClubService';
import EventGrid from './EventGrid';
import EventForm from './EventForm';
import { useAlert } from '../../hooks/useAlert';
import './AdminSections.css';

const GestionEventosSection = () => {
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar', 'dashboard'
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [activeSubView, setActiveSubView] = useState(null); // 'startlist', 'resultados'
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [clubes, setClubes] = useState([]);
    
    const [form, setForm] = useState({
        nombre: '',
        fecha: '',
        fechaFin: '',
        fechaFinInscripciones: '',
        ubicacion: '',
        descripcion: '',
        estado: 'Programado',
        inscripcionesHabilitadas: true,
        restringirSoloCategoriaPropia: false,
        permitirSub23EnSenior: false,
        permitirMasterBajarASenior: false,
        permitirCompletarK4: false,
        limitacionBotesAB: false,
        clubId: ''
    });

    const { alert: msg, showAlert } = useAlert();
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, evento: null });

    useEffect(() => {
        loadEventos();
        loadClubes();
        
        const handlePopState = (e) => {
            if (!e.state) { setView('lista'); setSelectedEvento(null); setActiveSubView(null); setShowConfigModal(false); }
            else if (e.state.panel === 'dashboard') { setView('dashboard'); setActiveSubView(null); setShowConfigModal(false); }
            else if (e.state.panel === 'config') { setShowConfigModal(true); }
            else if (e.state.panel === 'startlist') { setActiveSubView('startlist'); }
            else if (e.state.panel === 'resultados') { setActiveSubView('resultados'); }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const loadEventos = async () => {
        setLoading(true);
        try {
            const data = await EventoService.getAll();
            setEventos(data);
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
        } catch (e) {
            console.error("Error al cargar clubes", e);
        }
    };

    const handleOpenDashboard = (evento) => {
        setSelectedEvento(evento);
        window.history.pushState({ panel: 'dashboard' }, '');
        setView('dashboard');
    };

    const handleOpenConfig = () => {
        window.history.pushState({ panel: 'config' }, '');
        setShowConfigModal(true);
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            ...form,
            clubId: form.clubId === "" ? null : parseInt(form.clubId)
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
            showAlert('error', 'Error al guardar: ' + err.message);
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
            inscripcionesHabilitadas: evento.inscripcionesHabilitadas ?? true,
            restringirSoloCategoriaPropia: evento.restringirSoloCategoriaPropia || false,
            permitirSub23EnSenior: evento.permitirSub23EnSenior || false,
            permitirMasterBajarASenior: evento.permitirMasterBajarASenior || false,
            permitirCompletarK4: evento.permitirCompletarK4 || false,
            limitacionBotesAB: evento.limitacionBotesAB || false,
            clubId: evento.clubId || ''
        });
        setView('editar');
    };

    const handleCopyLiveLink = (id, nombre) => {
        const url = `${window.location.origin}/resultados/${id}`;
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
        <div className="admin-section-container">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}
            
            {view === 'lista' && (
                <div className="fade-in">
                    <div className="section-header-row">
                        <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800' }}>Gestión de Eventos</h1>
                        <button className="btn-admin-primary" onClick={() => setView('crear')}>
                            <Plus size={20} /> Nuevo Evento
                        </button>
                    </div>

                    {loading ? (
                        <div className="loader-container"><div className="loader"></div></div>
                    ) : (
                        <EventGrid 
                            eventos={eventos}
                            onOpenDashboard={handleOpenDashboard}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onCopyLink={handleCopyLiveLink}
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
                    clubes={clubes}
                />
            )}
            
            {view === 'dashboard' && (
                <div className="event-dashboard fade-in">
                    <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1.5rem' }}>Gestión de Eventos</h1>
                    {!activeSubView ? (
                        <>
                            <div className="event-dashboard-header glass-effect">
                                <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>{selectedEvento.nombre}</h2>
                                <p className="dashboard-meta">
                                    <Calendar size={16} /> {new Date(selectedEvento.fecha).toLocaleDateString('es-AR')} | <MapPin size={16} /> {selectedEvento.ubicacion || 'Sin ubicación'}
                                </p>
                                <div className="dashboard-chips">
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
                                    window.history.pushState({ panel: 'startlist' }, ''); 
                                    setActiveSubView('startlist'); 
                                }}>
                                    <div className="card-icon"><ClipboardList size={32} /></div>
                                    <h3>2. Start List</h3>
                                    <p>Cerrar inscripciones, armar series y sortear carriles aleatoriamente.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => { 
                                    window.history.pushState({ panel: 'resultados' }, ''); 
                                    setActiveSubView('resultados'); 
                                }}>
                                    <div className="card-icon"><Trophy size={32} /></div>
                                    <h3>3. Result List</h3>
                                    <p>Cargar tiempos oficiales al cruzar la meta y publicarlos en vivo.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <div className="subview-header">
                                <button className="btn-admin-secondary" onClick={() => window.history.back()}>
                                    <ArrowLeft size={16} /> Volver al Dashboard
                                </button>
                                <h3>{activeSubView === 'startlist' ? 'Gestión de Start List y Sorteos' : 'Carga de Tiempos Oficiales'}</h3>
                            </div>
                            <GestionResultadosSection 
                                preselectedEventoId={selectedEvento.id} 
                                defaultTab={activeSubView === 'startlist' ? 'startList' : 'resultados'} 
                                isEmbedded={true}
                            />
                        </div>
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
        </div>
    );
};

export default GestionEventosSection;
