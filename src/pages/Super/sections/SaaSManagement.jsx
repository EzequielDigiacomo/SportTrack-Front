import React, { useState, useEffect } from 'react';
import SaaSService from '../../../services/SaaSService';
import { 
    Cloud, 
    CheckCircle, 
    XCircle,
    Edit,
    Plus,
    Users,
    Shield
} from 'lucide-react';
import './SaaSManagement.css';

const SaaSManagement = () => {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlanes = async () => {
            try {
                const data = await SaaSService.getPlanes();
                
                // Mapear los datos del backend al formato necesario para la UI
                const planesMapeados = data.map(p => {
                    let color = 'var(--color-text-secondary)';
                    if (p.nombre.toLowerCase().includes('estándar')) color = 'var(--color-primary-light)';
                    if (p.nombre.toLowerCase().includes('premium')) color = 'var(--color-accent)';

                    return {
                        id: p.id,
                        nombre: p.nombre,
                        precio: p.precio === 0 ? 'Gratis' : `$${p.precio} USD / mes`,
                        federaciones: 0, // Por ahora 0 o mock
                        caracteristicas: [
                            { nombre: p.maxAtletas === -1 ? 'Gestión de Atletas Ilimitada' : `Gestión de Atletas (hasta ${p.maxAtletas})`, activo: true },
                            { nombre: p.maxTorneosActivos === -1 ? 'Torneos Activos Ilimitados' : `Torneos Activos (hasta ${p.maxTorneosActivos})`, activo: true },
                            { nombre: 'Resultados en Tiempo Real', activo: p.resultadosTiempoReal },
                            { nombre: 'Exportación a Excel / CSV', activo: p.exportacionExcel },
                            { nombre: 'Soporte Prioritario', activo: p.soportePrioritario }
                        ],
                        color
                    };
                });
                
                setPlanes(planesMapeados);
            } catch (error) {
                console.error("Error fetching SaaS plans:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlanes();
    }, []);

    return (
        <div className="saas-management fade-in">
            <div className="section-header-row mb-3">
                <div className="title-group">
                    <h2><Cloud size={24} /> Planes y Suscripciones SaaS</h2>
                    <p className="section-desc">Configura los límites del sistema según el plan de cada federación (Próximamente funcional).</p>
                </div>
                <div className="header-actions">
                    <button className="btn-admin-primary">
                        <Plus size={16} /> Crear Nuevo Plan
                    </button>
                </div>
            </div>

            <div className="saas-plans-grid">
                {loading ? (
                    <div className="loader-row" style={{ gridColumn: '1 / -1' }}><div className="loader"></div></div>
                ) : (
                    planes.map(plan => (
                        <div key={plan.id} className="saas-plan-card glass-effect" style={{ borderTop: `4px solid ${plan.color}` }}>
                            <div className="plan-header">
                                <h3 style={{ color: plan.color }}>{plan.nombre}</h3>
                                <div className="plan-price">{plan.precio}</div>
                            </div>
                            
                            <div className="plan-stats">
                                <span className="stat-badge">
                                    <Users size={14} /> {plan.federaciones} Federaciones Activas
                                </span>
                            </div>

                            <div className="plan-features">
                                <h4>Características del Plan</h4>
                                <ul>
                                    {plan.caracteristicas.map((caract, idx) => (
                                        <li key={idx} className={caract.activo ? 'feature-active' : 'feature-inactive'}>
                                            {caract.activo ? <CheckCircle size={16} className="icon-success" /> : <XCircle size={16} className="icon-error" />}
                                            <span>{caract.nombre}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="plan-actions">
                                <button className="btn-admin-secondary full-width">
                                    <Edit size={16} /> Configurar Límites
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="saas-federations-section glass-effect mt-4">
                <div className="section-header-row">
                    <div className="title-group">
                        <h3><Shield size={20} /> Asignación de Planes por Federación</h3>
                        <p className="section-desc">Aquí podrás cambiar el plan activo de cada federación y monitorear su cuota de uso.</p>
                    </div>
                </div>
                
                <div className="placeholder-table-container">
                    <table className="admin-table mt-2" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                        <thead>
                            <tr>
                                <th>Federación</th>
                                <th>Plan Actual</th>
                                <th>Uso de Atletas</th>
                                <th>Torneos Activos</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Federación de Remo</td>
                                <td><span className="badge" style={{ backgroundColor: 'var(--color-primary-light)' }}>Estándar</span></td>
                                <td>1,450 / 2,000</td>
                                <td>2 / 5</td>
                                <td><span className="badge success">Al día</span></td>
                                <td><button className="btn-admin-secondary btn-sm">Gestionar</button></td>
                            </tr>
                            <tr>
                                <td>Asociación de Canotaje</td>
                                <td><span className="badge" style={{ backgroundColor: 'var(--color-text-secondary)' }}>Básico</span></td>
                                <td>480 / 500 (¡Cerca del límite!)</td>
                                <td>1 / 1</td>
                                <td><span className="badge success">Al día</span></td>
                                <td><button className="btn-admin-secondary btn-sm">Gestionar</button></td>
                            </tr>
                            <tr>
                                <td>Liga Nacional Acuática</td>
                                <td><span className="badge" style={{ backgroundColor: 'var(--color-accent)' }}>Premium</span></td>
                                <td>3,200 / ∞</td>
                                <td>8 / ∞</td>
                                <td><span className="badge success">Al día</span></td>
                                <td><button className="btn-admin-secondary btn-sm">Gestionar</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mockup-overlay">
                        <div className="mockup-badge">Interfaz en preparación</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaaSManagement;
