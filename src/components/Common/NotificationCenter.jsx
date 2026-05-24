import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, X, CreditCard } from 'lucide-react';
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
                await timingSignalRService.connect();

                // 1. Escuchar regatas que entran en revisión (terminadas por el cronometrista)
                timingSignalRService.onGlobalRaceInReview((fase) => {
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
                    setNotifications(prev => prev.filter(n => String(n.id) !== String(faseId)));
                });

                // 3. Escuchar inicios de regata (opcional, para alerta general)
                timingSignalRService.onGlobalRaceStarted(({ faseId, serverTime }) => {
                    // Si el juez ya está viendo esta regata (basado en la URL), no mostramos la notificación
                    const params = new URLSearchParams(window.location.search);
                    const currentFaseId = params.get('faseId');
                    
                    if (String(currentFaseId) === String(faseId)) {
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

                // 4. Escuchar solicitudes de cambio de estado de pago de clubes
                timingSignalRService.onPaymentStatusChangeRequested(({ clubNombre, clubId, motive }) => {
                    setNotifications(prev => {
                        // Evitar duplicados por id de notificación único por club
                        const notifId = `pay_${clubId}_${Date.now()}`;
                        return [
                            {
                                id: notifId,
                                title: `Solicitud de Pago: ${clubNombre}`,
                                desc: motive,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                type: 'payment',
                                clubId: clubId
                            },
                            ...prev
                        ];
                    });
                });
            } catch (err) {
                console.error("[NotifCenter] SignalR Setup Error:", err);
            }
        };

        setup();
    }, [isAdmin]);

    if (!isAdmin) return null;

    const handleGoToRace = (faseId) => {
        const roleStr = String(user?.rol || user?.role || user?.Rol || '').toLowerCase();
        const isAdminUser = roleStr.includes('admin');
        const base = isAdminUser ? '/super/resultados' : '/juez-control';
        navigate(`${base}?faseId=${faseId}&tab=resultados`);
        setIsVisible(false);
    };

    const handleNotificationClick = (n) => {
        if (n.type === 'payment') {
            navigate('/super/pagos');
            setIsVisible(false);
        } else {
            handleGoToRace(n.id);
        }
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
                    <h3>Notificaciones y Alertas</h3>
                    <button onClick={() => setIsVisible(false)} className="close-btn">
                        <X size={18} />
                    </button>
                </div>

                <div className="notification-list">
                    {notifications.length === 0 ? (
                        <div className="empty-notifications">
                            <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No hay alertas ni notificaciones pendientes</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div 
                                key={n.id} 
                                className="notification-item"
                                onClick={() => handleNotificationClick(n)}
                            >
                                <div className="notif-icon">
                                    {n.type === 'payment' ? <CreditCard size={16} color="var(--color-primary-light)" /> : <Clock size={16} />}
                                </div>
                                <div className="notif-content">
                                    <span className="notif-title">{n.title}</span>
                                    {n.desc && (
                                        <span className="notif-desc" style={{ 
                                            fontSize: '0.8rem', 
                                            color: 'var(--color-text-secondary)', 
                                            display: 'block', 
                                            marginTop: '2px',
                                            lineHeight: '1.2' 
                                        }}>
                                            {n.desc}
                                        </span>
                                    )}
                                    <span className="notif-time" style={{ display: 'block', marginTop: '4px' }}>
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
