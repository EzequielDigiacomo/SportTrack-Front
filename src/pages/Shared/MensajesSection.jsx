import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, PenSquare, RefreshCcw, Send, ArrowLeft, Megaphone } from 'lucide-react';
import MessageService from '../../services/MessageService';
import AuthService from '../../services/AuthService';
import FederacionService from '../../services/FederacionService';
import EmptyState from '../../components/Common/EmptyState';
import DestinatariosMultiSelect from './DestinatariosMultiSelect';
import CampanaDetalle from './CampanaDetalle';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { pick } from '../../utils/apiHelpers';
import { isSuperAdminUser, isFederationAdminUser, isClubUser } from '../../utils/authHelpers';
import '../../components/SharedSections/AdminSections.css';
import './MensajesSection.css';

const pickNum = (obj, ...keys) => {
    const value = pick(obj, ...keys);
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** Id de usuario real (evita 0 por mapeo incompleto del DTO). */
const pickUsuarioId = (usuario) => {
    const id = pickNum(usuario, 'idUsuario', 'IdUsuario', 'id', 'Id');
    return id != null && id > 0 ? id : null;
};

const pickFederacionId = (obj) => {
    const id = pickNum(obj, 'federacionId', 'FederacionId', 'idFederacion', 'IdFederacion', 'id', 'Id');
    return id != null && id > 0 ? id : null;
};

const pickStr = (obj, ...keys) => pick(obj, ...keys) ?? '';

const getRol = (usuario) =>
    pickStr(usuario, 'rolFederacion', 'RolFederacion', 'rol', 'Rol').toLowerCase();

const isActivo = (usuario) => usuario?.activo !== false && usuario?.Activo !== false;

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
    idCampana: pickNum(detalle, 'idCampana', 'IdCampana'),
    mensajes: (detalle.mensajes || detalle.Mensajes || []).map(normalizeMensaje),
});

const normalizeCampanaList = (item) => ({
    idCampana: pickNum(item, 'idCampana', 'IdCampana'),
    asunto: pickStr(item, 'asunto', 'Asunto'),
    enviadoEn: pick(item, 'enviadoEn', 'EnviadoEn'),
    cantidadDestinatarios: pickNum(item, 'cantidadDestinatarios', 'CantidadDestinatarios') || 0,
    tipoCampana: pickStr(item, 'tipoCampana', 'TipoCampana'),
    cantidadLeidos: pickNum(item, 'cantidadLeidos', 'CantidadLeidos') || 0,
    cantidadRespondidos: pickNum(item, 'cantidadRespondidos', 'CantidadRespondidos') || 0,
});

const resolveModo = (modo, user) => {
    if (modo === 'super' || modo === 'admin' || modo === 'club') return modo;
    if (isSuperAdminUser(user)) return 'super';
    if (isFederationAdminUser(user)) return 'admin';
    if (isClubUser(user)) return 'club';
    return 'super';
};

const subtituloPorModo = {
    super: 'Comunicación privada y comunicados a administradores de federación.',
    admin: 'Comunicación con SuperAdmin y clubes de tu federación.',
    club: 'Comunicación privada con el administrador de tu federación.',
};

const MensajesSection = ({ modo: modoProp = 'auto' }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const modo = resolveModo(modoProp, user);
    const isSuper = modo === 'super';
    const isAdmin = modo === 'admin';
    const isClub = modo === 'club';
    const puedeMasivo = isSuper || isAdmin;

    const [tab, setTab] = useState('bandeja'); // bandeja | comunicados
    const [hilos, setHilos] = useState([]);
    const [campanas, setCampanas] = useState([]);
    const [campanaDetalle, setCampanaDetalle] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedHiloId, setSelectedHiloId] = useState(null);
    const [hiloDetalle, setHiloDetalle] = useState(null);
    const [vista, setVista] = useState('bandeja'); // bandeja | redactar | campana
    const [modoEnvio, setModoEnvio] = useState('individual'); // individual | masivo
    const [filtro, setFiltro] = useState('');
    const [respuesta, setRespuesta] = useState('');
    const [compose, setCompose] = useState({
        destinatarioId: '',
        destinatarioIds: [],
        asunto: '',
        cuerpo: '',
    });

    const currentUserId = pickUsuarioId(user);
    const userFedId = pickFederacionId(user);

    const gruposMasivo = useMemo(() => {
        const activos = (usuarios || []).filter(isActivo);

        if (isSuper) {
            const admins = activos.filter((u) => getRol(u) === 'admin' && pickUsuarioId(u));
            const fedMap = Object.fromEntries(
                (federaciones || []).map((f) => {
                    const fid = pickFederacionId(f);
                    return [String(fid || 'sin-fed'), pickStr(f, 'nombre', 'Nombre') || 'Federación'];
                })
            );
            const grouped = {};
            admins.forEach((admin) => {
                const fedId = String(pickFederacionId(admin) || 'sin-fed');
                if (!grouped[fedId]) {
                    grouped[fedId] = {
                        id: `fed-${fedId}`,
                        label: fedMap[fedId] || 'Sin federación',
                        items: [],
                    };
                }
                grouped[fedId].items.push(admin);
            });
            return Object.values(grouped).sort((a, b) => a.label.localeCompare(b.label));
        }

        if (isAdmin) {
            const clubes = activos.filter((u) => {
                if (getRol(u) !== 'club' || !pickUsuarioId(u)) return false;
                const fedId = pickFederacionId(u);
                return userFedId == null || fedId == null || Number(fedId) === Number(userFedId);
            });
            return clubes.length
                ? [{ id: 'clubes', label: 'Clubes de tu federación', items: clubes }]
                : [];
        }

        return [];
    }, [usuarios, federaciones, isSuper, isAdmin, userFedId]);

    const destinatariosIndividual = useMemo(() => {
        const activos = (usuarios || []).filter((u) => isActivo(u) && pickUsuarioId(u));

        if (isSuper) {
            return {
                tipo: 'grupos',
                label: 'Destinatario (Admin de federación)',
                placeholder: 'Seleccionar administrador...',
                grupos: gruposMasivo,
            };
        }

        if (isAdmin) {
            const superAdmins = activos.filter((u) => getRol(u) === 'superadmin');
            const clubes = activos.filter((u) => {
                if (getRol(u) !== 'club') return false;
                const fedId = pickFederacionId(u);
                return userFedId == null || fedId == null || Number(fedId) === Number(userFedId);
            });
            return {
                tipo: 'grupos',
                label: 'Destinatario',
                placeholder: 'Seleccionar destinatario...',
                grupos: [
                    ...(superAdmins.length ? [{ id: 'super', label: 'SuperAdmin', items: superAdmins }] : []),
                    ...(clubes.length ? [{ id: 'clubes', label: 'Clubes de tu federación', items: clubes }] : []),
                ],
            };
        }

        const admins = activos.filter((u) => {
            if (getRol(u) !== 'admin') return false;
            const fedId = pickFederacionId(u);
            return userFedId == null || fedId == null || Number(fedId) === Number(userFedId);
        });

        return {
            tipo: 'lista',
            label: 'Destinatario (Admin de federación)',
            placeholder: 'Seleccionar administrador...',
            items: admins,
        };
    }, [usuarios, gruposMasivo, isSuper, isAdmin, userFedId]);

    const hilosNormalizados = useMemo(() => (hilos || []).map(normalizeHiloListItem), [hilos]);
    const campanasNormalizadas = useMemo(() => (campanas || []).map(normalizeCampanaList), [campanas]);

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

    const loadCampanas = useCallback(async () => {
        if (!puedeMasivo) return;
        try {
            const data = await MessageService.getCampanas();
            setCampanas(data || []);
        } catch (error) {
            console.error(error);
            addToast('No se pudieron cargar los comunicados', 'error');
        }
    }, [addToast, puedeMasivo]);

    const loadCatalogos = useCallback(async () => {
        try {
            const usersPromise = AuthService.getUsuarios().catch(() => []);
            const fedPromise = isSuper
                ? FederacionService.getAll().catch(() => [])
                : Promise.resolve([]);
            const [usersRes, federacionesRes] = await Promise.all([usersPromise, fedPromise]);
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
                window.dispatchEvent(new Event('mensajes:refresh-unread'));
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
        if (puedeMasivo) loadCampanas();
    }, [loadHilos, loadCatalogos, loadCampanas, puedeMasivo]);

    useEffect(() => {
        if (!isClub || compose.destinatarioId) return;
        if (destinatariosIndividual.tipo === 'lista' && destinatariosIndividual.items?.length === 1) {
            const id = pickUsuarioId(destinatariosIndividual.items[0]);
            if (id) setCompose((prev) => ({ ...prev, destinatarioId: String(id) }));
        }
    }, [isClub, destinatariosIndividual, compose.destinatarioId]);

    const handleSelectHilo = async (hiloId) => {
        setSelectedHiloId(hiloId);
        setVista('bandeja');
        setTab('bandeja');
        setCampanaDetalle(null);
        setRespuesta('');
        await loadHiloDetalle(hiloId);
    };

    const openCampana = async (campanaId) => {
        setLoadingDetalle(true);
        try {
            const data = await MessageService.getCampana(campanaId);
            setCampanaDetalle(data);
            setVista('campana');
            setSelectedHiloId(null);
            setHiloDetalle(null);
        } catch (error) {
            console.error(error);
            addToast('No se pudo cargar el comunicado', 'error');
        } finally {
            setLoadingDetalle(false);
        }
    };

    const handleEnviarNuevo = async (e) => {
        e.preventDefault();
        if (!compose.asunto.trim() || !compose.cuerpo.trim()) {
            addToast('Completá asunto y mensaje', 'warning');
            return;
        }

        setSending(true);
        try {
            if (modoEnvio === 'masivo' && puedeMasivo) {
                if (!compose.destinatarioIds.length) {
                    addToast('Seleccioná al menos un destinatario', 'warning');
                    setSending(false);
                    return;
                }
                const result = await MessageService.enviarMasivo({
                    asunto: compose.asunto.trim(),
                    cuerpo: compose.cuerpo.trim(),
                    destinatarioIds: compose.destinatarioIds,
                });
                const campanaId = pickNum(result, 'campanaId', 'CampanaId');
                addToast(`Comunicado enviado a ${pickNum(result, 'cantidadHilos', 'CantidadHilos') || compose.destinatarioIds.length} destinatarios`, 'success');
                setCompose({ destinatarioId: '', destinatarioIds: [], asunto: '', cuerpo: '' });
                setModoEnvio('individual');
                await Promise.all([loadHilos(), loadCampanas()]);
                setTab('comunicados');
                if (campanaId) await openCampana(campanaId);
            } else {
                const destinatarioId = Number(compose.destinatarioId);
                if (!destinatarioId || destinatarioId <= 0) {
                    addToast('Seleccioná un destinatario válido', 'warning');
                    setSending(false);
                    return;
                }
                const creado = await MessageService.crearHilo({
                    destinatarioId,
                    asunto: compose.asunto.trim(),
                    cuerpo: compose.cuerpo.trim(),
                });
                const normalizado = normalizeHiloDetalle(creado);
                addToast('Mensaje enviado', 'success');
                setCompose({ destinatarioId: '', destinatarioIds: [], asunto: '', cuerpo: '' });
                setVista('bandeja');
                setTab('bandeja');
                await loadHilos();
                setSelectedHiloId(normalizado.idHilo);
                setHiloDetalle(normalizado);
            }
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

    const renderDestinatarioOptions = () => {
        if (destinatariosIndividual.tipo === 'lista') {
            return (destinatariosIndividual.items || []).map((item) => {
                const id = pickUsuarioId(item);
                if (!id) return null;
                return (
                    <option key={`user-${id}`} value={id}>
                        {displayUsuario(item)} ({pickStr(item, 'username', 'Username')})
                    </option>
                );
            });
        }

        return (destinatariosIndividual.grupos || []).map((grupo) => (
            <optgroup key={grupo.id || grupo.label} label={grupo.label}>
                {(grupo.items || []).map((item) => {
                    const id = pickUsuarioId(item);
                    if (!id) return null;
                    return (
                        <option key={`user-${id}`} value={id}>
                            {displayUsuario(item)} ({pickStr(item, 'username', 'Username')})
                        </option>
                    );
                })}
            </optgroup>
        ));
    };

    return (
        <section className="admin-section mensajes-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2 className="admin-title">
                        <Mail size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Mensajes
                    </h2>
                    <p className="admin-subtitle">{subtituloPorModo[modo]}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        className="btn-admin-secondary"
                        onClick={() => {
                            loadHilos();
                            if (puedeMasivo) loadCampanas();
                        }}
                        title="Actualizar"
                    >
                        <RefreshCcw size={16} />
                    </button>
                    <button
                        type="button"
                        className="btn-admin-primary"
                        onClick={() => {
                            setVista('redactar');
                            setSelectedHiloId(null);
                            setHiloDetalle(null);
                            setCampanaDetalle(null);
                            setModoEnvio(puedeMasivo ? modoEnvio : 'individual');
                        }}
                    >
                        <PenSquare size={16} />
                        Nuevo mensaje
                    </button>
                </div>
            </div>

            {puedeMasivo && (
                <div className="mensajes-tabs">
                    <button
                        type="button"
                        className={tab === 'bandeja' ? 'active' : ''}
                        onClick={() => {
                            setTab('bandeja');
                            setVista('bandeja');
                            setCampanaDetalle(null);
                        }}
                    >
                        Bandeja
                    </button>
                    <button
                        type="button"
                        className={tab === 'comunicados' ? 'active' : ''}
                        onClick={() => {
                            setTab('comunicados');
                            setVista('bandeja');
                            setSelectedHiloId(null);
                            setHiloDetalle(null);
                            setCampanaDetalle(null);
                            loadCampanas();
                        }}
                    >
                        <Megaphone size={14} />
                        Comunicados enviados
                    </button>
                </div>
            )}

            <div className={`mensajes-layout ${selectedHiloId && vista === 'bandeja' ? 'has-selection' : ''}`}>
                <div className={`mensajes-panel list-panel ${selectedHiloId || vista === 'campana' ? 'collapsed-mobile' : ''}`}>
                    {tab === 'comunicados' && puedeMasivo ? (
                        <>
                            <div className="mensajes-panel-header">
                                <strong style={{ fontSize: '0.9rem' }}>Comunicados masivos</strong>
                            </div>
                            <div className="mensajes-list">
                                {campanasNormalizadas.length === 0 ? (
                                    <EmptyState
                                        message="Sin comunicados"
                                        description="Cuando envíes un mensaje a varios destinatarios, aparecerá acá."
                                    />
                                ) : (
                                    campanasNormalizadas.map((c) => (
                                        <button
                                            key={c.idCampana}
                                            type="button"
                                            className={`mensaje-hilo-item ${campanaDetalle && pickNum(campanaDetalle, 'idCampana', 'IdCampana') === c.idCampana ? 'active' : ''}`}
                                            onClick={() => openCampana(c.idCampana)}
                                        >
                                            <div className="mensaje-hilo-top">
                                                <span className="mensaje-hilo-asunto">{c.asunto}</span>
                                                <span className="mensaje-hilo-fecha">{formatFecha(c.enviadoEn)}</span>
                                            </div>
                                            <div className="mensaje-hilo-meta">
                                                Enviado a {c.cantidadDestinatarios} · {c.cantidadRespondidos} respondieron · {c.cantidadLeidos} leídos
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <>
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
                        </>
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
                                Volver
                            </button>

                            {puedeMasivo && (
                                <div className="mensajes-modo-envio">
                                    <button
                                        type="button"
                                        className={modoEnvio === 'individual' ? 'active' : ''}
                                        onClick={() => setModoEnvio('individual')}
                                    >
                                        Individual
                                    </button>
                                    <button
                                        type="button"
                                        className={modoEnvio === 'masivo' ? 'active' : ''}
                                        onClick={() => setModoEnvio('masivo')}
                                    >
                                        Comunicado masivo
                                    </button>
                                </div>
                            )}

                            {modoEnvio === 'masivo' && puedeMasivo ? (
                                <label>
                                    Destinatarios
                                    <DestinatariosMultiSelect
                                        grupos={gruposMasivo}
                                        selectedIds={compose.destinatarioIds}
                                        onChange={(ids) => setCompose((prev) => ({ ...prev, destinatarioIds: ids }))}
                                        emptyMessage={isSuper ? 'No hay administradores disponibles' : 'No hay clubes en tu federación'}
                                    />
                                    <small style={{ marginTop: 6, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                                        Se creará un hilo privado por cada destinatario. Cada uno responderá por separado.
                                    </small>
                                </label>
                            ) : (
                                <label>
                                    {destinatariosIndividual.label}
                                    <select
                                        value={compose.destinatarioId}
                                        onChange={(e) => setCompose((prev) => ({ ...prev, destinatarioId: e.target.value }))}
                                        required={modoEnvio !== 'masivo'}
                                    >
                                        <option value="">{destinatariosIndividual.placeholder}</option>
                                        {renderDestinatarioOptions()}
                                    </select>
                                </label>
                            )}

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
                                    {sending
                                        ? 'Enviando...'
                                        : modoEnvio === 'masivo'
                                            ? `Enviar a ${compose.destinatarioIds.length || 0}`
                                            : 'Enviar'}
                                </button>
                            </div>
                        </form>
                    ) : vista === 'campana' && campanaDetalle ? (
                        loadingDetalle ? (
                            <div className="mensajes-empty-detail">Cargando comunicado...</div>
                        ) : (
                            <CampanaDetalle
                                campana={campanaDetalle}
                                onBack={() => {
                                    setVista('bandeja');
                                    setCampanaDetalle(null);
                                    setTab('comunicados');
                                }}
                                onOpenHilo={async (hiloId) => {
                                    setTab('bandeja');
                                    await handleSelectHilo(hiloId);
                                }}
                            />
                        )
                    ) : !selectedHiloId || !hiloDetalle ? (
                        <div className="mensajes-empty-detail">
                            <div>
                                <Mail size={36} style={{ opacity: 0.35, marginBottom: 12 }} />
                                <p>
                                    {tab === 'comunicados'
                                        ? 'Seleccioná un comunicado para ver el desglose.'
                                        : 'Seleccioná una conversación o creá un mensaje nuevo.'}
                                </p>
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
