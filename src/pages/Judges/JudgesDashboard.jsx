import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Flag, List, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Judges.css';

const JudgesDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = user?.rol?.trim().toLowerCase() || '';
    const isAdmin = role === 'admin';
    const isStarter = role === 'largador' || isAdmin;
    const isFinisher = role === 'cronometrista' || isAdmin;

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
                <p>Seleccione su rol para la competencia actual</p>
            </header>

            <div className="judges-grid">
                {isStarter && (
                    <div className="judge-card starter" onClick={() => navigate('/jueces/largador')}>
                        <div className="card-icon">
                            <Play size={48} />
                        </div>
                        <h2>Largador</h2>
                        <p>Control de salida, check-in de atletas y disparo oficial.</p>
                        <button className="btn-judge">Entrar como Largador</button>
                    </div>
                )}

                {isFinisher && (
                    <div className="judge-card finisher" onClick={() => navigate('/jueces/llegada')}>
                        <div className="card-icon">
                            <Flag size={48} />
                        </div>
                        <h2>Cronometrista</h2>
                        <p>Toma de tiempos, orden de llegada y cierre de serie.</p>
                        <button className="btn-judge">Entrar como Cronometrista</button>
                    </div>
                )}

                {isAdmin && (
                    <div className="judge-card manual-timing" onClick={() => navigate('/jueces/carga-manual')}>
                        <div className="card-icon">
                            <List size={48} color="#ffdd00" />
                        </div>
                        <h2>Carga Manual</h2>
                        <p>Salvavidas: Carga directa de tiempos y posiciones si el cronómetro falla.</p>
                        <button className="btn-judge" style={{ borderColor: 'rgba(255,221,0,0.3)', color: '#ffdd00' }}>Abrir Salvavidas</button>
                    </div>
                )}
            </div>

            <div className="judges-info glass-effect">
                <h3><List size={20} /> Hoja de Ruta del Día</h3>
                <p>Las pruebas se sincronizan automáticamente con el servidor central.</p>
            </div>
        </div>
    );
};

export default JudgesDashboard;
