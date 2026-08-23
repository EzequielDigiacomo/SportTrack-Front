import React, { useState, useEffect, useMemo } from 'react';
import SupportService from '../../../services/SupportService';
import AuthService from '../../../services/AuthService';
import FederacionService from '../../../services/FederacionService';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import { formatAuditAction, formatAuditDetail, fixAuditEncoding } from '../../../utils/auditHelpers';
import { getFederationNameForUsername } from '../../../utils/apiHelpers';
import SaaSManagement from './SaaSManagement';
import BackupService from '../../../services/BackupService';
import { useToast } from '../../../context/ToastContext';
import { 
    AlertCircle, 
    Trash2, 
    RefreshCcw, 
    Search,
    Clock,
    User as UserIcon,
    Terminal,
    ChevronDown,
    ChevronUp,
    Cloud,
    Monitor,
    Smartphone,
    Globe as GlobeIcon,
    Cpu,
    Info,
    Database,
    Send,
    WifiOff
} from 'lucide-react';
import { parseUserAgent } from '../../../utils/deviceUtils';
import EventAuditCards from '../../../components/Common/EventAuditCards';
import './SoporteSection.css';

const SoporteSection = () => {
    const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'saas'
    const [logs, setLogs] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [filter, setFilter] = useState('');
    const { addToast } = useToast();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [timingOutbox, setTimingOutbox] = useState([]);
    const [outboxLoading, setOutboxLoading] = useState(false);
    const [outboxActionId, setOutboxActionId] = useState(null);
    const [confirmDiscard, setConfirmDiscard] = useState(null);

    const loadTimingOutbox = async () => {
        setOutboxLoading(true);
        try {
            const data = await SupportService.getTimingOutbox();
            setTimingOutbox(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error al cargar cola temporal de tiempos', err);
            addToast('No se pudo cargar la cola temporal de tiempos.', 'error');
        } finally {
            setOutboxLoading(false);
        }
    };

    const handleCommitOutbox = async (entry) => {
        setOutboxActionId(entry.id);
        try {
            await SupportService.commitTimingOutbox(entry.faseId, entry.username);
            addToast(`Tiempos confirmados para fase ${entry.faseId} (${entry.username}).`, 'success');
            await loadTimingOutbox();
        } catch (err) {
            console.error(err);
            addToast(err?.message || 'No se pudo confirmar la cola temporal.', 'error');
        } finally {
            setOutboxActionId(null);
        }
    };

    const handleDiscardOutbox = async () => {
        if (!confirmDiscard) return;
        setOutboxActionId(confirmDiscard.id);
        try {
            await SupportService.discardTimingOutbox(confirmDiscard.id);
            addToast('Cola temporal descartada.', 'success');
            setConfirmDiscard(null);
            await loadTimingOutbox();
        } catch (err) {
            console.error(err);
            addToast('No se pudo descartar la cola.', 'error');
        } finally {
            setOutboxActionId(null);
        }
    };

    const handleDownloadBackup = async () => {
        setIsBackingUp(true);
        addToast("Generando respaldo de la base de datos...", "info");
        try {
            await BackupService.downloadDatabase();
            addToast("Respaldo descargado exitosamente", "success");
        } catch (error) {
            console.error(error);
            addToast("Error al descargar: verifica que el backend de Render esté actualizado.", "error");
        } finally {
            setIsBackingUp(false);
        }
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const [data, usersRes, clubesRes, federacionesData] = await Promise.all([
                SupportService.getLogs({ limit: 150 }),
                AuthService.getUsuarios().catch(() => []),
                api.get(ENDPOINTS.CLUBES).catch(() => ({ data: [] })),
                FederacionService.getAll().catch(() => []),
            ]);
            setLogs(data);
            setUsuarios(usersRes || []);
            setClubes(clubesRes.data || []);
            setFederaciones(federacionesData || []);
            await loadTimingOutbox();
        } catch (err) {
            console.error("Error al cargar logs", err);
        } finally {
            setLoading(false);
        }
    };

    const logsConFederacion = useMemo(
        () => logs.map(log => ({
            ...log,
            federacionNombre: getFederationNameForUsername(log.usuario, usuarios, clubes, federaciones),
        })),
        [logs, usuarios, clubes, federaciones]
    );

    useEffect(() => {
        if (activeTab === 'logs') {
            loadLogs();
        }
    }, [activeTab]);

    const handleClearLogs = async () => {
        try {
            await SupportService.clearErrorLogs();
            await loadLogs();
            setConfirmClear(false);
        } catch (err) {
            console.error("Error al limpiar logs", err);
        }
    };

    const parseDetail = (detail) => {
        try {
            return JSON.parse(detail);
        } catch {
            return detail;
        }
    };

    const filteredLogs = logsConFederacion.filter(log => 
        log.modulo.toLowerCase().includes(filter.toLowerCase()) ||
        log.detalle.toLowerCase().includes(filter.toLowerCase()) ||
        log.accion.toLowerCase().includes(filter.toLowerCase()) ||
        (log.federacionNombre || '').toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="soporte-section fade-in">
            <div className="soporte-tabs">
                <button 
                    className="soporte-tab active"
                >
                    <Terminal size={18} /> Auditoría y Logs de Error
                </button>
            </div>

            <div className="tab-content fade-in">
                <div className="section-header-row">
                        <div className="title-group">
                            <h2><Terminal size={24} /> Panel de Soporte y Diagnóstico</h2>
                            <p className="section-desc">Monitoreo de errores del sistema y auditoría técnica.</p>
                        </div>
                        <div className="header-actions">
                            <button 
                                className="btn-admin-primary" 
                                onClick={handleDownloadBackup} 
                                disabled={isBackingUp}
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--color-accent-orange), #f97316)', 
                                    borderColor: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: 'bold'
                                }}
                                title="Generar un respaldo SQL completo de la base de datos PostgreSQL de Render"
                            >
                                {isBackingUp ? <RefreshCcw size={16} className="spin" /> : <Database size={16} />}
                                {isBackingUp ? "Generando Backup..." : "Descargar DB (Backup)"}
                            </button>
                            <button className="btn-admin-secondary" onClick={loadLogs} disabled={loading}>
                                <RefreshCcw size={16} className={loading ? 'spin' : ''} /> Actualizar
                            </button>
                            <button className="btn-admin-danger" onClick={() => setConfirmClear(true)}>
                                <Trash2 size={16} /> Limpiar Errores
                            </button>
                        </div>
                    </div>

                    <div className="logs-filter-bar glass-effect">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Filtrar por módulo, federación, error o acción..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <EventAuditCards preview eventosLimit={3} />

                    <div className="timing-outbox-panel glass-effect">
                        <div className="timing-outbox-header">
                            <div>
                                <h3><WifiOff size={20} /> Colas temporales de tiempos (cronometrista)</h3>
                                <p className="section-desc">
                                    Envíos que fallaron por red y quedaron pendientes en el servidor. Podés confirmarlos manualmente en la DB principal.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn-admin-secondary"
                                onClick={loadTimingOutbox}
                                disabled={outboxLoading}
                            >
                                <RefreshCcw size={16} className={outboxLoading ? 'spin' : ''} /> Actualizar colas
                            </button>
                        </div>

                        {outboxLoading ? (
                            <div className="loader-row"><div className="loader"></div></div>
                        ) : timingOutbox.length === 0 ? (
                            <div className="timing-outbox-empty">
                                <Send size={28} />
                                <span>No hay envíos pendientes en cola temporal.</span>
                            </div>
                        ) : (
                            <div className="timing-outbox-table-wrap">
                                <table className="timing-outbox-table">
                                    <thead>
                                        <tr>
                                            <th>Evento / Fase</th>
                                            <th>Cronometrista</th>
                                            <th>Tiempos</th>
                                            <th>Capturado</th>
                                            <th>Expira</th>
                                            <th>Intentos</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timingOutbox.map(entry => (
                                            <tr key={entry.id} className={entry.isExpired ? 'is-expired' : ''}>
                                                <td>
                                                    <strong>{entry.eventoNombre || `Evento #${entry.eventoId || '?'}`}</strong>
                                                    <div className="timing-outbox-sub">
                                                        Fase {entry.faseId} · {entry.faseNombre || 'Sin nombre'}
                                                        {entry.soloMode ? ' · Modo solo' : ''}
                                                    </div>
                                                </td>
                                                <td>{entry.username}</td>
                                                <td>{entry.tiempoCount ?? entry.resultados?.length ?? 0}</td>
                                                <td>{new Date(entry.createdAtUtc).toLocaleString('es-AR')}</td>
                                                <td>{new Date(entry.expiresAtUtc).toLocaleString('es-AR')}</td>
                                                <td>{entry.attemptCount ?? 0}</td>
                                                <td className="timing-outbox-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-admin-primary btn-outbox-commit"
                                                        disabled={outboxActionId === entry.id || entry.isExpired}
                                                        onClick={() => handleCommitOutbox(entry)}
                                                        title="Confirmar en DB principal y vaciar cola"
                                                    >
                                                        {outboxActionId === entry.id ? (
                                                            <RefreshCcw size={14} className="spin" />
                                                        ) : (
                                                            <Send size={14} />
                                                        )}
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-admin-danger btn-outbox-discard"
                                                        disabled={outboxActionId === entry.id}
                                                        onClick={() => setConfirmDiscard(entry)}
                                                        title="Descartar sin confirmar (solo si ya se cargó por otro medio)"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="logs-container">
                        {loading ? (
                            <div className="loader-row"><div className="loader"></div></div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="empty-state glass-effect">
                                <AlertCircle size={48} />
                                <p>No se encontraron registros de error o auditoría.</p>
                            </div>
                        ) : (
                            <div className="logs-list">
                                {filteredLogs.map(log => {
                                    const isError = log.accion === 'ERROR_FATAL';
                                    const detail = parseDetail(log.detalle);
                                    const isExpanded = expandedLog === log.id;

                                    return (
                                        <div key={log.id} className={`log-item glass-effect ${isError ? 'is-error' : ''} ${isExpanded ? 'is-expanded' : ''}`}>
                                            <div className="log-summary" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                                                <div className="log-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {isError ? <><AlertCircle size={14} /> ERROR</> : <><Info size={14} /> INFO</>}
                                                </div>
                                                <div className="log-main-info">
                                                    <span className="log-modulo">{log.modulo}</span>
                                                    <span className="log-message">
                                                        {isError ? (detail.Error ? fixAuditEncoding(detail.Error) : formatAuditDetail(log)) : formatAuditAction(log.accion)}
                                                    </span>
                                                </div>
                                                <div className="log-meta">
                                                    <span className="log-fed-pill" title="Federación del usuario">
                                                        <GlobeIcon size={12} /> {log.federacionNombre || '—'}
                                                    </span>
                                                    <span className="log-device-pill" title={log.userAgent}>
                                                        {parseUserAgent(log.userAgent).isMobile ? <Smartphone size={14} /> : <Monitor size={14} />}
                                                        {parseUserAgent(log.userAgent).os}
                                                    </span>
                                                    <span className="log-ip-pill"><GlobeIcon size={12} /> {log.ip || '0.0.0.0'}</span>
                                                    <span title="Usuario"><UserIcon size={14} /> {log.usuario}</span>
                                                    <span title="Fecha"><Clock size={14} /> {new Date(log.fecha).toLocaleString()}</span>
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="log-details fade-in">
                                                    <div className="details-grid">
                                                        <div className="detail-field">
                                                            <label>Acción:</label> <span>{log.accion}</span>
                                                        </div>
                                                        <div className="detail-field">
                                                            <label>Federación:</label> <span>{log.federacionNombre || '—'}</span>
                                                        </div>
                                                        <div className="detail-field">
                                                            <label>IP del Cliente:</label> <span>{log.ip}</span>
                                                        </div>
                                                        <div className="detail-field full-width">
                                                            <label>Navegador (User Agent):</label> 
                                                            <div className="ua-box">
                                                                <pre>{log.userAgent}</pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isError && detail.StackTrace && (
                                                        <div className="stack-trace">
                                                            <label>Stack Trace:</label>
                                                            <pre>{detail.StackTrace}</pre>
                                                        </div>
                                                    )}
                                                    {!isError && (
                                                        <div className="raw-detail">
                                                            <label>Detalle:</label>
                                                            <pre>{formatAuditDetail(log)}</pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            <ConfirmDialog 
                isOpen={confirmClear}
                onClose={() => setConfirmClear(false)}
                onConfirm={handleClearLogs}
                title="Limpiar Logs de Error"
                message="¿Estás seguro de que deseas eliminar todos los registros de ERROR_FATAL? Esta acción no se puede deshacer."
                type="danger"
                confirmText="Sí, Limpiar"
            />

            <ConfirmDialog
                isOpen={!!confirmDiscard}
                onClose={() => setConfirmDiscard(null)}
                onConfirm={handleDiscardOutbox}
                title="Descartar cola temporal"
                message={`¿Descartar el envío pendiente de ${confirmDiscard?.username || 'usuario'} para fase ${confirmDiscard?.faseId}? Solo hacelo si los tiempos ya están en la DB por otro medio.`}
                type="danger"
                confirmText="Descartar"
            />
        </div>
    );
};

export default SoporteSection;

