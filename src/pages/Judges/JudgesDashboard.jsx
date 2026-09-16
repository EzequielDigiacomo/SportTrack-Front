import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Flag, List, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Judges.css';

const JudgesDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const roleStr = user?.rol || user?.Rol || user?.role || '';
    const roles = roleStr.toLowerCase().split(/[,;]/).map(r => r.trim());

    const isAdmin = roles.includes('admin') || roles.includes('superadmin');
    const isControlTecnico = roles.includes('controltecnico');
    const isStarter = roles.includes('largador') || isAdmin || isControlTecnico;
    const isFinisher = roles.includes('cronometrista') || roles.includes('finalizador') || isAdmin || isControlTecnico;
    const isControl = roles.includes('juezcontrol') || isAdmin;

    return (
        <div className="judges-container glass-effect">
            <header className="judges-header">
                {isAdmin && (
                    <button
                        className="btn-back-header"
                        onClick={() => navigate('/super')}
                        title="Volver al Panel Admin"
                    >
                        <ArrowLeft size={24} />
                    </button>
                )}
                <h1>Módulo de Jueces Oficiales</h1>
                <p>Seleccioná tu rol. Podés operar eventos oficiales y controles técnicos de la federación.</p>
            </header>

            <div className="judges-grid">
                {isControlTecnico && !isAdmin && (
                    <>
                    <div className="judge-card starter" onClick={() => navigate('/control-tecnico')}>
                        <div className="card-icon">
                            <Users size={48} />
                        </div>
                        <h2>Gestionar controles</h2>
                        <p>Creá el evento, inscribí atletas de club y armá la start list.</p>
                        <button className="btn-judge">Abrir gestión</button>
                    </div>
                    <div className="judge-card finisher" onClick={() => navigate('/jueces/largador')}>
                        <div className="card-icon">
                            <Play size={48} />
                        </div>
                        <h2>Cronometrar</h2>
                        <p>Largá la prueba y tomá tiempos en el mismo dispositivo.</p>
                        <button className="btn-judge">Entrar</button>
                    </div>
                    </>
                )}

                {isStarter && !(isControlTecnico && !isAdmin) && (
                    <div className="judge-card starter" onClick={() => navigate('/jueces/largador')}>
                        <div className="card-icon">
                            <Play size={48} />
                        </div>
                        <h2>Largador</h2>
                        <p>Salida, check-in y disparo oficial en eventos y controles.</p>
                        <button className="btn-judge">Entrar como Largador</button>
                    </div>
                )}

                {isFinisher && !(isControlTecnico && !isAdmin) && (
                    <div className="judge-card finisher" onClick={() => navigate('/jueces/llegada')}>
                        <div className="card-icon">
                            <Flag size={48} />
                        </div>
                        <h2>Finalizador</h2>
                        <p>Toma de tiempos y cierre de serie (cronometrista) en eventos y controles.</p>
                        <button className="btn-judge">Entrar como Finalizador</button>
                    </div>
                )}

                {isControl && (
                    <div className="judge-card control" onClick={() => navigate('/juez-control')}>
                        <div className="card-icon">
                            <Users size={48} />
                        </div>
                        <h2>Juez de Control</h2>
                        <p>Series, grilla y resultados oficiales en eventos y controles.</p>
                        <button className="btn-judge">Panel de Control</button>
                    </div>
                )}

                {isAdmin && (
                    <div className="judge-card manual-timing" onClick={() => navigate('/jueces/carga-manual')}>
                        <div className="card-icon">
                            <List size={48} />
                        </div>
                        <h2>Carga Manual</h2>
                        <p>Salvavidas: Carga directa de tiempos y posiciones si el cronómetro falla.</p>
                        <button className="btn-judge">Abrir Salvavidas</button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default JudgesDashboard;
