import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, PenSquare, RefreshCcw, Send, ArrowLeft } from 'lucide-react';
import MessageService from '../../services/MessageService';
import AuthService from '../../services/AuthService';
import FederacionService from '../../services/FederacionService';
import EmptyState from '../../components/Common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { pick } from '../../utils/apiHelpers';
import { isSuperAdminUser } from '../../utils/authHelpers';
import '../../components/SharedSections/AdminSections.css';
import './MensajesSection.css';

const pickNum = (obj, ...keys) => {
    const value = pick(obj, ...keys);
    return value != null ? Number(value) : null;
};

const pickStr = (obj, ...keys) => pick(obj, ...keys) ?? '';

const displayUsuario = (usuario) => {
    if (!usuario) return 'Usuario';
    const nombre = pickStr(usuario, 'nombre', 'Nombre');
    const apellido = pickStr(usuario, 'apellido', 'Apellido');
    const full = `${nombre} ${apellido}`.trim();
    return full || pickStr(usuario, 'username', 'Username') || 'Usuario';
};

const formatFecha = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const normalizeHiloListItem = (item) => ({
    idHilo: pickNum(item, 'idHilo', 'IdHilo'),
    asunto: pickStr(item, 'asunto', 'Asunto'),
    ultimoMensajeEn: pick(item, 'ultimoMensajeEn', 'UltimoMensajeEn'),
    contraparte: item.contraparte || item.Contraparte || {},
    ultimoMensajePreview: pickStr(item, 'ultimoMensajePreview', 'UltimoMensajePreview'),
    cantidadNoLeidos: pickNum(item, 'cantidadNoLeidos', 'CantidadNoLeidos') || 0,
});

const normalizeMensaje = (msg) => ({
    idMensaje: pickNum(msg, 'idMensaje', 'IdMensaje'),
    remitenteId: pickNum(msg, 'remitenteId', 'RemitenteId'),
    destinatarioId: pickNum(msg, 'destinatarioId', 'DestinatarioId'),
    remitente: msg.remitente || msg.Remitente || {},
    cuerpo: pickStr(msg, 'cuerpo', 'Cuerpo'),
    enviadoEn: pick(msg, 'enviadoEn', 'EnviadoEn'),
    leidoEn: pick(msg, 'leidoEn', 'LeidoEn'),
    esPropio: Boolean(msg.esPropio ?? msg.EsPropio),
});

const normalizeHiloDetalle = (detalle) => ({
    idHilo: pickNum(detalle, 'idHilo', 'IdHilo'),
    asunto: pickStr(detalle, 'asunto', 'Asunto'),
    creadoEn: pick(detalle, 'creadoEn', 'CreadoEn'),
    ultimoMensajeEn: pick(detalle, 'ultimoMensajeEn', 'UltimoMensajeEn'),
    mensajes: (detalle.mensajes || detalle.Mensajes || []).map(normalizeMensaje),
});

const MensajesSection = ({ modo = 'super' }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const isSuper = modo === 'super' || isSuperAdminUser(user);

    const [hilos, setHilos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedHiloId, setSelectedHiloId] = useState(null);
    const [hiloDetalle, setHiloDetalle] = useState(null);
    const [vista, setVista] = useState('bandeja');
    const [filtro, setFiltro] = useState('');
    const [respuesta, setRespuesta] = useState('');
    const [compose, setCompose] = useState({
        destinatarioId: '',
        asunto: '',
        cuerpo: '',
    });

    const currentUserId = pickNum(user, 'id', 'Id', 'idUsuario', 'IdUsuario');

    const adminsPorFederacion = useMemo(() => {
        const admins = (usuarios || []).filter((u) => {
            const rol = pickStr(u, 'rolFederacion', 'RolFederacion', 'rol', 'Rol').toLowerCase();
            return rol === 'admin' && u.activo !== false && u.Activo !== false;
        });

        const fedMap = Object.fromEntries(
            (federaciones || []).map((f) => [
                String(pickNum(f, 'id', 'Id', 'idFederacion', 'IdFederacion')),
                pickStr(f, 'nombre', 'Nombre') || 'Federación',
            ])
        );

        const grouped = {};
        admins.forEach((admin) => {
            const fedId = String(pickNum(admin, 'federacionId', 'FederacionId', 'idFederacion', 'IdFederacion') || 'sin-fed');
            const fedNombre = fedMap[fedId] || 'Sin federación';
            if (!grouped[fedId]) {
                grouped[fedId] = { fedId, fedNombre, admins: [] };
            }
            grouped[fedId].admins.push(admin);
        });

        return Object.values(grouped).sort((a, b) => a.fedNombre.localeCompare(b.fedNombre));
    }, [usuarios, federaciones]);

    const hilosNormalizados = useMemo(
        () => (hilos || []).map(normalizeHiloListItem),
        [hilos]
    );

    const hilosFiltrados = useMemo(() => {
        const q = filtro.trim().toLowerCase();
        if (!q) return hilosNormalizados;
        return hilosNormalizados.filter((h) => {
            const contraparte = displayUsuario(h.contraparte).toLowerCase();
            return h.asunto.toLowerCase().includes(q)
                || contraparte.includes(q)
                || h.ultimoMensajePreview.toLowerCase().includes(q);
        });
    }, [hilosNormalizados, filtro]);

    const loadHilos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await MessageService.getHilos();
            setHilos(data || []);
        } catch (error) {
            console.error(error);
            addToast('No se pudieron cargar los mensajes', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    const loadCatalogos = useCallback(async () => {
        if (!isSuper) return;
        try {
            const [usersRes, federacionesRes] = await Promise.all([
                AuthService.getUsuarios().catch(() => []),
                FederacionService.getAll().catch(() => []),
            ]);
            setUsuarios(usersRes || []);
            setFederaciones(federacionesRes || []);
        } catch (error) {
            console.error(error);
        }
    }, [isSuper]);

    const loadHiloDetalle = useCallback(async (hiloId, markRead = true) => {
        setLoadingDetalle(true);
        try {
            const detalle = await MessageService.getHilo(hiloId);
            setHiloDetalle(normalizeHiloDetalle(detalle));
            if (markRead) {
                await MessageService.marcarLeido(hiloId).catch(() => {});
                await loadHilos();
            }
        } catch (error) {
            console.error(error);
            addToast('No se pudo cargar la conversación', 'error');
        } finally {
            setLoadingDetalle(false);
        }
    }, [addToast, loadHilos]);

    useEffect(() => {
        loadHilos();
        loadCatalogos();
    }, [loadHilos, loadCatalogos]);

    const handleSelectHilo = async (hiloId) => {
        setSelectedHiloId(hiloId);
        setVista('bandeja');
        setRespuesta('');
        await loadHiloDetalle(hiloId);
    };

    const handleEnviarNuevo = async (e) => {
        e.preventDefault();
        if (!compose.destinatarioId || !compose.asunto.trim() || !compose.cuerpo.trim()) {
            addToast('Completá destinatario, asunto y mensaje', 'warning');
            return;
        }

        setSending(true);
        try {
            const creado = await MessageService.crearHilo({
                destinatarioId: Number(compose.destinatarioId),
                asunto: compose.asunto.trim(),
                cuerpo: compose.cuerpo.trim(),
            });
            const normalizado = normalizeHiloDetalle(creado);
            addToast('Mensaje enviado', 'success');
            setCompose({ destinatarioId: '', asunto: '', cuerpo: '' });
            setVista('bandeja');
            await loadHilos();
            setSelectedHiloId(normalizado.idHilo);
            setHiloDetalle(normalizado);
        } catch (error) {
            console.error(error);
            addToast(error.message || 'No se pudo enviar el mensaje', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleResponder = async (e) => {
        e.preventDefault();
        if (!selectedHiloId || !respuesta.trim()) {
            addToast('Escribí una respuesta', 'warning');
            return;
        }

        setSending(true);
        try {
            const actualizado = await MessageService.responderHilo(selectedHiloId, respuesta.trim());
            setHiloDetalle(normalizeHiloDetalle(actualizado));
            setRespuesta('');
            addToast('Respuesta enviada', 'success');
            await loadHilos();
        } catch (error) {
            console.error(error);
            addToast(error.message || 'No se pudo enviar la respuesta', 'error');
        } finally {
            setSending(false);
        }
    };

    const hiloSeleccionado = hilosFiltrados.find((h) => h.idHilo === selectedHiloId);
    const totalNoLeidos = hilosNormalizados.reduce((acc, h) => acc + (h.cantidadNoLeidos || 0), 0);

    return (
        <section className="admin-section mensajes-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2 className="admin-title">
                        <Mail size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Mensajes
                    </h2>
                    <p className="admin-subtitle">
                        Comunicación privada tipo email con administradores de federación.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn-admin-secondary" onClick={loadHilos} title="Actualizar">
                        <RefreshCcw size={16} />
                    </button>
                    <button
                        type="button"
                        className="btn-admin-primary"
                        onClick={() => {
                            setVista('redactar');
                            setSelectedHiloId(null);
                            setHiloDetalle(null);
                        }}
                    >
                        <PenSquare size={16} />
                        Nuevo mensaje
                    </button>
                </div>
            </div>

            <div className={`mensajes-layout ${selectedHiloId && vista === 'bandeja' ? 'has-selection' : ''}`}>
                <div className={`mensajes-panel list-panel ${selectedHiloId ? 'collapsed-mobile' : ''}`}>
                    <div className="mensajes-panel-header">
                        <input
                            className="mensajes-search"
                            placeholder="Buscar por asunto o destinatario..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                    <div className="mensajes-list">
                        {loading ? (
                            <div className="mensajes-empty-detail">Cargando conversaciones...</div>
                        ) : hilosFiltrados.length === 0 ? (
                            <EmptyState
                                message="No hay mensajes"
                                description="Cuando envíes o recibas mensajes, aparecerán acá."
                            />
                        ) : (
                            hilosFiltrados.map((hilo) => (
                                <button
                                    key={hilo.idHilo}
                                    type="button"
                                    className={`mensaje-hilo-item ${selectedHiloId === hilo.idHilo ? 'active' : ''} ${hilo.cantidadNoLeidos > 0 ? 'unread' : ''}`}
                                    onClick={() => handleSelectHilo(hilo.idHilo)}
                                >
                                    <div className="mensaje-hilo-top">
                                        <span className="mensaje-hilo-asunto">{hilo.asunto}</span>
                                        <span className="mensaje-hilo-fecha">{formatFecha(hilo.ultimoMensajeEn)}</span>
                                    </div>
                                    <div className="mensaje-hilo-meta">
                                        {displayUsuario(hilo.contraparte)}
                                        {hilo.cantidadNoLeidos > 0 && (
                                            <span className="mensajes-badge-unread" style={{ marginLeft: 8 }}>
                                                {hilo.cantidadNoLeidos}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mensaje-hilo-preview">{hilo.ultimoMensajePreview}</div>
                                </button>
                            ))
                        )}
                    </div>
                    {totalNoLeidos > 0 && (
                        <div style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-surface-hover)' }}>
                            {totalNoLeidos} mensaje{totalNoLeidos === 1 ? '' : 's'} sin leer
                        </div>
                    )}
                </div>

                <div className="mensajes-panel">
                    {vista === 'redactar' ? (
                        <form className="mensajes-compose" onSubmit={handleEnviarNuevo}>
                            <button
                                type="button"
                                className="btn-admin-secondary"
                                style={{ alignSelf: 'flex-start' }}
                                onClick={() => setVista('bandeja')}
                            >
                                <ArrowLeft size={16} />
                                Volver a bandeja
                            </button>

                            <label>
                                Destinatario (Admin de federación)
                                <select
                                    value={compose.destinatarioId}
                                    onChange={(e) => setCompose((prev) => ({ ...prev, destinatarioId: e.target.value }))}
                                    required
                                >
                                    <option value="">Seleccionar administrador...</option>
                                    {adminsPorFederacion.map((grupo) => (
                                        <optgroup key={grupo.fedId} label={grupo.fedNombre}>
                                            {grupo.admins.map((admin) => {
                                                const id = pickNum(admin, 'id', 'Id', 'idUsuario', 'IdUsuario');
                                                return (
                                                    <option key={id} value={id}>
                                                        {displayUsuario(admin)} ({pickStr(admin, 'username', 'Username')})
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Asunto
                                <input
                                    type="text"
                                    value={compose.asunto}
                                    onChange={(e) => setCompose((prev) => ({ ...prev, asunto: e.target.value }))}
                                    placeholder="Asunto del mensaje"
                                    maxLength={300}
                                    required
                                />
                            </label>

                            <label>
                                Mensaje
                                <textarea
                                    rows={8}
                                    value={compose.cuerpo}
                                    onChange={(e) => setCompose((prev) => ({ ...prev, cuerpo: e.target.value }))}
                                    placeholder="Escribí tu mensaje..."
                                    required
                                />
                            </label>

                            <div className="mensajes-compose-actions">
                                <button type="button" className="btn-admin-secondary" onClick={() => setVista('bandeja')}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-admin-primary" disabled={sending}>
                                    <Send size={16} />
                                    {sending ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </form>
                    ) : !selectedHiloId || !hiloDetalle ? (
                        <div className="mensajes-empty-detail">
                            <div>
                                <Mail size={36} style={{ opacity: 0.35, marginBottom: 12 }} />
                                <p>Seleccioná una conversación o creá un mensaje nuevo.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mensajes-detail">
                            <button
                                type="button"
                                className="btn-admin-secondary"
                                style={{ alignSelf: 'flex-start', display: 'inline-flex' }}
                                onClick={() => {
                                    setSelectedHiloId(null);
                                    setHiloDetalle(null);
                                }}
                            >
                                <ArrowLeft size={16} />
                                Volver
                            </button>

                            <div className="mensajes-detail-header">
                                <h3>{hiloDetalle.asunto}</h3>
                                <p>
                                    Conversación con {displayUsuario(hiloSeleccionado?.contraparte)}
                                </p>
                            </div>

                            <div className="mensajes-thread">
                                {loadingDetalle ? (
                                    <div className="mensajes-empty-detail">Cargando historial...</div>
                                ) : (
                                    hiloDetalle.mensajes.map((mensaje) => (
                                        <div
                                            key={mensaje.idMensaje}
                                            className={`mensaje-bubble ${mensaje.esPropio || mensaje.remitenteId === currentUserId ? 'propio' : ''}`}
                                        >
                                            <div className="mensaje-bubble-meta">
                                                <span>{displayUsuario(mensaje.remitente)}</span>
                                                <span>{formatFecha(mensaje.enviadoEn)}</span>
                                            </div>
                                            <p className="mensaje-bubble-body">{mensaje.cuerpo}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form className="mensajes-reply" onSubmit={handleResponder}>
                                <textarea
                                    rows={4}
                                    value={respuesta}
                                    onChange={(e) => setRespuesta(e.target.value)}
                                    placeholder="Escribí tu respuesta..."
                                />
                                <div className="mensajes-compose-actions">
                                    <button type="submit" className="btn-admin-primary" disabled={sending}>
                                        <Send size={16} />
                                        {sending ? 'Enviando...' : 'Responder'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default MensajesSection;
