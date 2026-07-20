import React, { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList, Search, RefreshCw, Download, Trash2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import InscripcionService from '../../../services/InscripcionService';
import EventoService from '../../../services/EventoService';
import ClubService from '../../../services/ClubService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import '../../../components/SharedSections/AdminSections.css';

const normalizeRegistro = (item) => ({
    id: item.id ?? item.Id ?? item.idInscripcion ?? item.IdInscripcion,
    participanteNombre: item.participanteNombre ?? item.ParticipanteNombre ?? '',
    participanteDocumento: item.participanteDocumento ?? item.ParticipanteDocumento ?? '',
    clubNombre: item.clubNombre ?? item.ClubNombre ?? '',
    eventoNombre: item.eventoNombre ?? item.EventoNombre ?? '',
    pruebaNombre: item.pruebaNombre ?? item.PruebaNombre ?? '',
    fechaInscripcion: item.fechaInscripcion ?? item.FechaInscripcion,
    estado: item.estado ?? item.Estado ?? '',
    pagado: item.pagado ?? item.Pagado ?? false,
    tripulantesNombres: item.tripulantesNombres ?? item.TripulantesNombres ?? [],
});

const formatFecha = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
};

const formatPrueba = (row) => {
    if (row.tripulantesNombres?.length > 0) {
        const crew = [row.participanteNombre, ...row.tripulantesNombres].filter(Boolean).join(' / ');
        return `${row.pruebaNombre} (${crew})`;
    }
    return row.pruebaNombre || '—';
};

/**
 * @param {{ modo?: 'club' | 'admin' }} props
 */
const RegistroInscripcionesSection = ({ modo = 'club' }) => {
    const { user } = useAuth();
    const esAdmin = modo === 'admin';

    const [inscripciones, setInscripciones] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroBusqueda, setFiltroBusqueda] = useState('');
    const [filtroEventoId, setFiltroEventoId] = useState('');
    const [filtroClubId, setFiltroClubId] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

    const loadCatalogos = useCallback(async () => {
        try {
            const [eventosData, clubesData] = await Promise.all([
                EventoService.getAll().catch(() => []),
                esAdmin ? ClubService.getAll().catch(() => []) : Promise.resolve([]),
            ]);
            setEventos(Array.isArray(eventosData) ? eventosData : []);
            setClubes(Array.isArray(clubesData) ? clubesData : []);
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    }, [esAdmin]);

    const loadInscripciones = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filtroEventoId) params.eventoId = filtroEventoId;
            if (esAdmin && filtroClubId) params.clubId = filtroClubId;
            if (filtroBusqueda.trim()) params.busqueda = filtroBusqueda.trim();

            const data = await InscripcionService.getRegistro(params);
            setInscripciones(Array.isArray(data) ? data.map(normalizeRegistro) : []);
        } catch (error) {
            console.error('Error cargando registro de inscripciones:', error);
            setInscripciones([]);
        } finally {
            setLoading(false);
        }
    }, [esAdmin, filtroEventoId, filtroClubId, filtroBusqueda]);

    useEffect(() => {
        loadCatalogos();
    }, [loadCatalogos]);

    useEffect(() => {
        const timer = setTimeout(loadInscripciones, filtroBusqueda ? 350 : 0);
        return () => clearTimeout(timer);
    }, [loadInscripciones, filtroBusqueda]);

    const handleDelete = async (id) => {
        try {
            await InscripcionService.delete(id);
            setDeleteConfirm({ show: false, id: null });
            loadInscripciones();
        } catch (error) {
            console.error('Error eliminando inscripción:', error);
            alert('No se pudo eliminar la inscripción');
        }
    };

    const exportCsv = () => {
        if (inscripciones.length === 0) return;

        const headers = esAdmin
            ? ['Atleta', 'Documento', 'Club', 'Evento', 'Prueba', 'Fecha inscripción', 'Estado', 'Pagado']
            : ['Atleta', 'Documento', 'Evento', 'Prueba', 'Fecha inscripción', 'Estado', 'Pagado'];

        const rows = inscripciones.map((r) => {
            const base = [
                r.participanteNombre,
                r.participanteDocumento,
                r.eventoNombre,
                formatPrueba(r),
                formatFecha(r.fechaInscripcion),
                r.estado,
                r.pagado ? 'Sí' : 'No',
            ];
            if (esAdmin) base.splice(2, 0, r.clubNombre);
            return base;
        });

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `registro-inscripciones-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const titulo = esAdmin ? 'Registro de Inscripciones' : 'Mis Inscripciones';
    const subtitulo = esAdmin
        ? 'Consulta de atletas inscriptos por evento y prueba en toda la federación'
        : 'Historial de inscripciones de atletas de tu club';

    const colSpan = esAdmin ? 9 : 7;

    return (
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardList size={28} color="var(--color-primary-light)" />
                    <div>
                        <h2 className="admin-title">{titulo}</h2>
                        <p className="admin-subtitle">{subtitulo}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-admin-secondary" onClick={loadInscripciones} disabled={loading}>
                        <RefreshCw size={16} /> Actualizar
                    </button>
                    {esAdmin && (
                        <button
                            type="button"
                            className="btn-admin-secondary"
                            onClick={exportCsv}
                            disabled={inscripciones.length === 0}
                        >
                            <Download size={16} /> Exportar CSV
                        </button>
                    )}
                </div>
            </div>

            <div className="search-bar-container mb-md" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                    <input
                        type="text"
                        className="admin-input with-search-icon"
                        placeholder="Buscar atleta, documento, evento o club..."
                        value={filtroBusqueda}
                        onChange={(e) => setFiltroBusqueda(e.target.value)}
                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
                <select
                    className="admin-input"
                    value={filtroEventoId}
                    onChange={(e) => setFiltroEventoId(e.target.value)}
                    style={{ flex: '0 1 200px', minWidth: '160px' }}
                >
                    <option value="">Todos los eventos</option>
                    {eventos.map((ev) => {
                        const id = ev.id ?? ev.Id ?? ev.idEvento;
                        const nombre = ev.nombre ?? ev.Nombre ?? `Evento ${id}`;
                        return <option key={id} value={id}>{nombre}</option>;
                    })}
                </select>
                {esAdmin && (
                    <select
                        className="admin-input"
                        value={filtroClubId}
                        onChange={(e) => setFiltroClubId(e.target.value)}
                        style={{ flex: '0 1 200px', minWidth: '160px' }}
                    >
                        <option value="">Todos los clubes</option>
                        {clubes.map((c) => {
                            const id = c.id ?? c.Id ?? c.idClub;
                            const nombre = c.nombre ?? c.Nombre ?? `Club ${id}`;
                            return <option key={id} value={id}>{nombre}</option>;
                        })}
                    </select>
                )}
            </div>

            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Atleta</th>
                            <th style={{ padding: '1rem' }}>Documento</th>
                            {esAdmin && <th style={{ padding: '1rem' }}>Club</th>}
                            <th style={{ padding: '1rem' }}>Evento</th>
                            <th style={{ padding: '1rem' }}>Prueba</th>
                            <th style={{ padding: '1rem' }}>Fecha</th>
                            <th style={{ padding: '1rem' }}>Estado</th>
                            <th style={{ padding: '1rem' }}>Pagado</th>
                            {esAdmin && <th style={{ padding: '1rem' }}>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    Cargando...
                                </td>
                            </tr>
                        ) : inscripciones.length === 0 ? (
                            <tr>
                                <td colSpan={colSpan} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                    No hay inscripciones registradas
                                </td>
                            </tr>
                        ) : (
                            inscripciones.map((row) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                    <td style={{ padding: '1rem' }}><strong>{row.participanteNombre || '—'}</strong></td>
                                    <td style={{ padding: '1rem' }}>{row.participanteDocumento || '—'}</td>
                                    {esAdmin && <td style={{ padding: '1rem' }}>{row.clubNombre || '—'}</td>}
                                    <td style={{ padding: '1rem' }}>{row.eventoNombre || '—'}</td>
                                    <td style={{ padding: '1rem' }}>{formatPrueba(row)}</td>
                                    <td style={{ padding: '1rem' }}>{formatFecha(row.fechaInscripcion)}</td>
                                    <td style={{ padding: '1rem' }}>{row.estado || '—'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            background: row.pagado ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                            color: row.pagado ? '#10B981' : '#F59E0B',
                                        }}>
                                            {row.pagado ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                            {row.pagado ? 'Sí' : 'No'}
                                        </span>
                                    </td>
                                    {esAdmin && (
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                type="button"
                                                className="btn-admin-danger"
                                                style={{ padding: '0.4rem 0.6rem' }}
                                                onClick={() => setDeleteConfirm({ show: true, id: row.id })}
                                                title="Eliminar inscripción"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && inscripciones.length > 0 && (
                <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    {inscripciones.length} inscripción{inscripciones.length !== 1 ? 'es' : ''} encontrada{inscripciones.length !== 1 ? 's' : ''}
                    {!esAdmin && user?.clubId ? ` · Club #${user.clubId}` : ''}
                </p>
            )}

            <ConfirmDialog
                isOpen={deleteConfirm.show}
                title="Eliminar inscripción"
                message="¿Eliminar esta inscripción del registro? Esta acción no se puede deshacer."
                type="danger"
                onConfirm={() => handleDelete(deleteConfirm.id)}
                onClose={() => setDeleteConfirm({ show: false, id: null })}
            />
        </div>
    );
};

export default RegistroInscripcionesSection;
