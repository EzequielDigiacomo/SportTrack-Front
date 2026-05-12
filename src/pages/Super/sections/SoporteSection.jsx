import React, { useState, useEffect } from 'react';
import SupportService from '../../../services/SupportService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import { 
    AlertCircle, 
    Trash2, 
    RefreshCcw, 
    Search,
    Clock,
    User as UserIcon,
    Terminal,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import './SoporteSection.css';

const SoporteSection = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [filter, setFilter] = useState('');

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await SupportService.getLogs({ limit: 150 });
            setLogs(data);
        } catch (err) {
            console.error("Error al cargar logs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

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

    const filteredLogs = logs.filter(log => 
        log.modulo.toLowerCase().includes(filter.toLowerCase()) ||
        log.detalle.toLowerCase().includes(filter.toLowerCase()) ||
        log.accion.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="soporte-section fade-in">
            <div className="section-header-row">
                <div className="title-group">
                    <h2><Terminal size={24} /> Panel de Soporte y Diagnóstico</h2>
                    <p className="section-desc">Monitoreo de errores del sistema y auditoría técnica.</p>
                </div>
                <div className="header-actions">
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
                    placeholder="Filtrar por módulo, error o acción..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
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
                                        <div className="log-badge">
                                            {isError ? '🚨 ERROR' : '📝 INFO'}
                                        </div>
                                        <div className="log-main-info">
                                            <span className="log-modulo">{log.modulo}</span>
                                            <span className="log-message">
                                                {isError ? (detail.Error || log.detalle) : log.accion}
                                            </span>
                                        </div>
                                        <div className="log-meta">
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
                                                    <label>IP:</label> <span>{log.ip}</span>
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
                                                    <pre>{typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail}</pre>
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

            <ConfirmDialog 
                isOpen={confirmClear}
                onClose={() => setConfirmClear(false)}
                onConfirm={handleClearLogs}
                title="Limpiar Logs de Error"
                message="¿Estás seguro de que deseas eliminar todos los registros de ERROR_FATAL? Esta acción no se puede deshacer."
                type="danger"
                confirmText="Sí, Limpiar"
            />
        </div>
    );
};

export default SoporteSection;
