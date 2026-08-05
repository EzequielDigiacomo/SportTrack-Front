import React, { useCallback, useEffect, useState } from 'react';
import {
    Database,
    Download,
    RefreshCw,
    Building2,
    HardDrive,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import BackupService from '../../../services/BackupService';
import FederacionService from '../../../services/FederacionService';
import { useToast } from '../../../context/ToastContext';
import './BackupsSection.css';

const formatFecha = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('es-AR');
};

const BackupsSection = () => {
    const { addToast } = useToast();
    const [scope, setScope] = useState('full');
    const [federaciones, setFederaciones] = useState([]);
    const [idFederacion, setIdFederacion] = useState('');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const data = await BackupService.getHistory(50);
            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            addToast(err?.message || 'No se pudo cargar el historial de backups', 'error');
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadHistory();
        FederacionService.getAll()
            .then((data) => setFederaciones(Array.isArray(data) ? data : []))
            .catch(() => setFederaciones([]));
    }, [loadHistory]);

    const handleDownload = async () => {
        if (scope === 'federacion' && !idFederacion) {
            addToast('Seleccioná una federación', 'error');
            return;
        }

        setDownloading(true);
        try {
            const filename = await BackupService.downloadDatabase({
                scope,
                idFederacion: scope === 'federacion' ? Number(idFederacion) : undefined,
            });
            addToast(`Backup descargado: ${filename}`, 'success');
            await loadHistory();
        } catch (err) {
            console.error(err);
            addToast(err?.message || 'Error al generar el backup', 'error');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="backups-section fade-in">
            <div className="section-header-row mb-3">
                <div className="title-group">
                    <h2><Database size={24} /> Backups de base de datos</h2>
                    <p className="section-desc">
                        Generá un archivo .sql restaurable. El historial es compartido con SIGDEF (misma BD).
                    </p>
                </div>
                <button
                    type="button"
                    className="btn-admin-secondary"
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    title="Actualizar historial"
                >
                    <RefreshCw size={16} className={loadingHistory ? 'spin' : ''} />
                    Actualizar
                </button>
            </div>

            <div className="backups-grid">
                <div className="backups-card glass-effect">
                    <h3><HardDrive size={18} /> Generar backup</h3>

                    <div className="backup-scope-options">
                        <label className={`scope-option ${scope === 'full' ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="backup-scope"
                                value="full"
                                checked={scope === 'full'}
                                onChange={() => setScope('full')}
                            />
                            <div>
                                <strong>Base completa (recomendado)</strong>
                                <span>Estructura + datos de todos los esquemas. Ideal para disaster recovery.</span>
                            </div>
                        </label>

                        <label className={`scope-option ${scope === 'federacion' ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="backup-scope"
                                value="federacion"
                                checked={scope === 'federacion'}
                                onChange={() => setScope('federacion')}
                            />
                            <div>
                                <strong>Por federación</strong>
                                <span>Export SQL filtrado (federación, clubes, usuarios, eventos, etc.). Requiere esquema destino ya migrado.</span>
                            </div>
                        </label>
                    </div>

                    {scope === 'federacion' && (
                        <div className="backup-fed-select">
                            <label htmlFor="backup-fed">
                                <Building2 size={14} /> Federación
                            </label>
                            <select
                                id="backup-fed"
                                value={idFederacion}
                                onChange={(e) => setIdFederacion(e.target.value)}
                            >
                                <option value="">Seleccioná…</option>
                                {federaciones.map((f) => {
                                    const id = f.idFederacion ?? f.IdFederacion ?? f.id;
                                    const nombre = f.nombre ?? f.Nombre ?? `Fed #${id}`;
                                    const sigla = f.sigla ?? f.Sigla;
                                    return (
                                        <option key={id} value={id}>
                                            {nombre}{sigla ? ` (${sigla})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    <div className="backup-hint">
                        <AlertTriangle size={14} />
                        <span>
                            El archivo incluye cuentas y hashes de contraseña. Guardalo en un lugar seguro.
                            Los PDFs/fotos de Cloudinary no vienen en el dump (solo las URLs).
                        </span>
                    </div>

                    <button
                        type="button"
                        className="btn-backup-download"
                        onClick={handleDownload}
                        disabled={downloading}
                    >
                        <Download size={18} />
                        {downloading ? 'Generando backup…' : 'Descargar .sql'}
                    </button>
                </div>

                <div className="backups-card glass-effect backups-history">
                    <h3><Clock size={18} /> Historial (SportTrack + SIGDEF)</h3>
                    {loadingHistory ? (
                        <div className="loader-row"><div className="loader" /></div>
                    ) : history.length === 0 ? (
                        <p className="empty-history">Todavía no se generó ningún backup desde la app.</p>
                    ) : (
                        <div className="history-table-wrap">
                            <table className="backup-history-table">
                                <thead>
                                    <tr>
                                        <th>Fecha (UTC→local)</th>
                                        <th>Acción</th>
                                        <th>Origen</th>
                                        <th>Usuario</th>
                                        <th>Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h) => (
                                        <tr key={h.id ?? h.Id}>
                                            <td>{formatFecha(h.fecha ?? h.Fecha)}</td>
                                            <td>
                                                <span className="history-accion">
                                                    {h.accion ?? h.Accion}
                                                </span>
                                            </td>
                                            <td>{h.sistemaOrigen ?? h.SistemaOrigen ?? '—'}</td>
                                            <td>{h.usuario ?? h.Usuario}</td>
                                            <td className="history-detalle">{h.detalle ?? h.Detalle}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BackupsSection;
