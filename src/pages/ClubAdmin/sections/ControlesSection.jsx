import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Calendar, MapPin, Search, ListFilter, ClipboardList, Lock, Unlock, Timer, ArrowLeft } from 'lucide-react';
import EventoService from '../../../services/EventoService';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/SharedSections/AdminSections.css';
import './Sections.css';

const ControlesSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [controles, setControles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadControles();
    }, []);

    const loadControles = async () => {
        try {
            const queryParams = new URLSearchParams(window.location.search);
            const fedId = queryParams.get('fedId');
            
            const data = await EventoService.getAll(fedId);
            // Filtramos solo los que SON controles
            const onlyControles = data.filter(e => e.nombre.toLowerCase().includes('control'));
            setControles(onlyControles);
        } catch (error) {
            console.error('Error cargando controles:', error);
        } finally {
            setLoading(false);
        }
    };

    const estadoBadge = (estado) => {
        const map = {
            'Programado': { color: '#60a5fa', label: 'Programado' },
            'EnCurso': { color: '#34d399', label: 'En Curso' },
            'Finalizado': { color: '#9ca3af', label: 'Finalizado' },
            'Cancelado': { color: '#f87171', label: 'Cancelado' },
        };
        const s = map[estado] || { color: '#9ca3af', label: estado };
        return <span className="estado-badge" style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }}>{s.label}</span>;
    };

    return (
        <div className="section-container fade-in">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button 
                    className="btn-admin-secondary" 
                    onClick={() => navigate(-1)}
                    title="Volver"
                    style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}>
                        <Timer size={32} />
                    </div>
                    <div>
                        <h2>Controles Técnicos</h2>
                        <p className="subtitle">Historial y gestión de controles internos de la federación</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loader-container"><div className="loader"></div></div>
            ) : controles.length > 0 ? (
                <div className="eventos-grid">
                    {controles.map(control => (
                        <div key={control.id} className="evento-card glass-effect animate-card" style={{ borderTop: '4px solid #f59e0b' }}>
                            <div className="evento-badge" style={{ background: '#f59e0b' }}>Control Técnico</div>
                            <h3>{control.nombre}</h3>
                            <p className="evento-date"><Calendar size={14} style={{marginRight: '6px'}} /> {new Date(control.fecha).toLocaleDateString()}</p>
                            <p className="evento-location"><MapPin size={14} style={{marginRight: '6px'}} /> {control.ubicacion || 'Sin ubicación'}</p>
                            
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {estadoBadge(control.estado)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <Activity size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No se han registrado controles técnicos en esta federación</p>
                </div>
            )}
        </div>
    );
};

export default ControlesSection;
