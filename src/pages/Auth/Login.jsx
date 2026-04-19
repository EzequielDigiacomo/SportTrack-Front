import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthService from '../../services/AuthService';
import './Login.css';

const Login = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // Redirigir si ya está autenticado
    React.useEffect(() => {
        if (isAuthenticated && user) {
            const path = user.rol === 'Admin' ? '/super' : (user.rol === 'Club' ? '/club' : '/');
            navigate(path, { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await AuthService.login(credentials);
            login(data, data.token);
            
            // Redirect based on role
            const targetPath = data.rol === 'Admin' ? '/super' : (data.rol === 'Club' ? '/club' : '/');
            navigate(targetPath, { replace: true });
            
        } catch (err) {
            setError(err.message || 'Usuario o contraseña incorrectos');
        } finally {
            setLoading(false);
        }
    };

    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryMsg, setRecoveryMsg] = useState(null);

    const handleRecoverySubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulamos envío de correo
        setTimeout(() => {
            setLoading(false);
            setRecoveryMsg({ type: 'success', text: `Se ha enviado un enlace de recuperación a ${recoveryEmail}. Revisa tu bandeja de entrada.` });
        }, 1500);
    };

    return (
        <div className="login-container">
            <div className="login-card glass-effect fade-in">
                {!showRecovery ? (
                    <>
                        <div className="login-header">
                            <h2>SportTrack</h2>
                            <p>Bienvenido de nuevo, Club</p>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre de Usuario</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    placeholder="ej: club_nautico"
                                    required
                                    autoComplete="username"
                                />
                            </div>

                            <div className="form-group">
                                <label>Contraseña</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            <div className="recovery-link-container">
                                <button type="button" className="btn-link" onClick={() => setShowRecovery(true)}>
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>

                            <button 
                                type="submit" 
                                className="login-button" 
                                disabled={loading}
                            >
                                {loading ? <div className="loader"></div> : 'Iniciar Sesión'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <div className="login-header">
                            <h2>Recuperar Acceso</h2>
                            <p>Ingresa tu correo para restablecer tu contraseña</p>
                        </div>

                        {recoveryMsg ? (
                            <div className={`alert-msg ${recoveryMsg.type}`}>
                                {recoveryMsg.text}
                                <button className="btn-login-back" onClick={() => setShowRecovery(false)} style={{marginTop: '1rem', width: '100%'}}>
                                    Volver al Login
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRecoverySubmit}>
                                <div className="form-group">
                                    <label>Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={recoveryEmail}
                                        onChange={(e) => setRecoveryEmail(e.target.value)}
                                        placeholder="tu-correo@ejemplo.com"
                                        required
                                    />
                                </div>
                                <button type="submit" className="login-button" disabled={loading}>
                                    {loading ? <div className="loader"></div> : 'Enviar Instrucciones'}
                                </button>
                                <button type="button" className="btn-link" onClick={() => setShowRecovery(false)} style={{marginTop: '1rem', display: 'block', margin: '1rem auto'}}>
                                    Cancelar y Volver
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
