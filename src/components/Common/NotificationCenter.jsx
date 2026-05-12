import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, X } from 'lucide-react';
import timingSignalRService from '../../services/TimingSignalRService';
import { useNavigate } from 'react-router-dom';
import './NotificationCenter.css';

import { useAuth } from '../../context/AuthContext';

const NotificationCenter = ({ isAdmin }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAdmin) return;

        const setup = async () => {
            try {
                console.log("[NotifCenter] Connecting to SignalR...");
                await timingSignalRService.connect();
                console.log("[NotifCenter] Connected. Setting up global listeners.");

                // 1. Escuchar regatas que entran en revisión (terminadas por el cronometrista)
                timingSignalRService.onGlobalRaceInReview((fase) => {
                    console.log("[NotifCenter] Race in review received:", fase);
                    setNotifications(prev => {
                        // Evitar duplicados
                        if (prev.some(n => n.id === fase.id)) return prev;
                        return [{
                            id: fase.id,
                            title: `Por Validar: ${fase.nombre}`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            type: 'review'
                        }, ...prev];
                    });
                });

                // 2. Escuchar regatas que se oficializan (para quitarlas de la lista si estaban)
                timingSignalRService.onGlobalRaceOfficialized((faseId) => {
                    console.log("[NotifCenter] Race officialized, removing if present:", faseId);
                    setNotifications(prev => prev.filter(n => String(n.id) !== String(faseId)));
                });

                // 3. Escuchar inicios de regata (opcional, para alerta general)
                timingSignalRService.onGlobalRaceStarted(({ faseId, serverTime }) => {
                    // Si el juez ya está viendo esta regata (basado en la URL), no mostramos la notificación
                    const params = new URLSearchParams(window.location.search);
                    const currentFaseId = params.get('faseId');
                    
                    if (String(currentFaseId) === String(faseId)) {
                        console.log("[NotifCenter] User already viewing this race, skipping notification.");
                        return;
                    }

                    setNotifications(prev => [
                        {
                            id: faseId,
                            title: `¡Regata Iniciada!`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            type: 'start'
                        },
                        ...prev
                    ]);
                });
            } catch (err) {
                console.error("[NotifCenter] SignalR Setup Error:", err);
            }
        };

        setup();
    }, [isAdmin]);

    if (!isAdmin) return null;

    console.log("[NotifCenter] Rendering for Admin/Judge. Notif count:", notifications.length);

    const handleGoToRace = (faseId) => {
        const roleStr = String(user?.rol || user?.role || user?.Rol || '').toLowerCase();
        const isAdminUser = roleStr.includes('admin');
        const base = isAdminUser ? '/super/resultados' : '/juez-control';
        console.log(`[NotifCenter] Routing user to: ${base}?faseId=${faseId}`);
        navigate(`${base}?faseId=${faseId}&tab=resultados`);
        setIsVisible(false);
    };

    return (
        <div className={`notification-center-container ${isVisible ? 'open' : ''}`}>
            <button 
                className={`notification-trigger ${notifications.length > 0 ? 'pulse' : ''}`}
                onClick={() => setIsVisible(!isVisible)}
            >
                <Bell size={24} />
                {notifications.length > 0 && (
                    <span className="notification-badge">{notifications.length}</span>
                )}
            </button>

            <div className="notification-panel glass-effect">
                <div className="notification-header">
                    <h3>Regatas Pendientes</h3>
                    <button onClick={() => setIsVisible(false)} className="close-btn">
                        <X size={18} />
                    </button>
                </div>

                <div className="notification-list">
                    {notifications.length === 0 ? (
                        <div className="empty-notifications">
                            <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No hay regatas pendientes de validación</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div 
                                key={n.id} 
                                className="notification-item"
                                onClick={() => handleGoToRace(n.id)}
                            >
                                <div className="notif-icon">
                                    <Clock size={16} />
                                </div>
                                <div className="notif-content">
                                    <span className="notif-title">{n.title}</span>
                                    <span className="notif-time">
                                        {n.time}
                                    </span>
                                </div>
                                <div className="notif-action">
                                    ➔
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
