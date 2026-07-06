import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, ArrowLeft, Filter, Link2, X } from 'lucide-react';
import api from '../../../services/api';
import AtletaService from '../../../services/AtletaService';
import FederacionService from '../../../services/FederacionService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import SearchBox from '../../../components/Common/SearchBox';
import CustomSelect from '../../../components/Common/CustomSelect';
import AtletaGrid from './AtletaGrid';
import AtletaForm from './AtletaForm';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import { ENDPOINTS } from '../../../utils/constants';
import { withFederationScope, getClubFederationId, getUserFederationId, pick, filterClubesByFederation, resolveScopeFederationId } from '../../../utils/apiHelpers';
import { isSuperAdminUser } from '../../../utils/authHelpers';
import '../../../components/SharedSections/AdminSections.css';

const GestionAtletasSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isSuper = isSuperAdminUser(user);
    const params = new URLSearchParams(location.search);
    const clubIdFromUrl = params.get('clubId');
    const clubNombreFromUrl = params.get('clubNombre') ? decodeURIComponent(params.get('clubNombre')) : '';
    const fedIdFromUrl = params.get('fedId');

    const scopeFedId = useMemo(
        () => resolveScopeFederationId({ fedIdFromUrl, user, clubes }),
        [fedIdFromUrl, user, clubes]
    );

    const [atletas, setAtletas] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
    const [selectedAtleta, setSelectedAtleta] = useState(null);
    
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        documento: '',
        email: '',
        telefono: '',
        direccion: '',
        fechaNacimiento: '',
        sexoId: 1,
        sexo: 1,
        clubId: '',
        idClub: '',
        pais: '',
        estadoPago: 0,
        presentoAptoMedico: false,
        perteneceSeleccion: false,
        becadoEnard: false,
        becadoSdn: false,
        montoBeca: 0
    });

    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
    const [assignModal, setAssignModal] = useState({ show: false, atleta: null, clubId: '' });

    const [searchTerm, setSearchTerm] = useState('');
    // Si venimos desde un club específico, lo pre-filtramos por nombre
    const [selectedClub, setSelectedClub] = useState(clubNombreFromUrl || '');
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 9;

    useEffect(() => {
        loadData();
    }, [scopeFedId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedClub]);

    const loadData = async () => {
        try {
            const clubesUrl = withFederationScope(ENDPOINTS.CLUBES, scopeFedId);
            const [atletasData, clubesRes, federacionesData] = await Promise.all([
                AtletaService.getAll(),
                api.get(clubesUrl),
                FederacionService.getAll(),
            ]);

            const visibleFederaciones = scopeFedId
                ? federacionesData.filter(f => String(f.id) === String(scopeFedId))
                : federacionesData;

            setAtletas(atletasData);
            setClubes(clubesRes.data || []);
            setFederaciones(visibleFederaciones);
        } catch (error) {
            showAlert('error', 'Error al cargar los datos del sistema.');
        } finally {
            setLoading(false);
        }
    };
 
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleOpenCrear = () => {
        const parsedClubId = clubIdFromUrl ? parseInt(clubIdFromUrl) : '';
        const clubFromUrl = parsedClubId
            ? clubes.find(c => pick(c, 'id', 'Id') === parsedClubId)
            : null;
        const defaultFedId = fedIdFromUrl
            ? parseInt(fedIdFromUrl)
            : (getClubFederationId(clubFromUrl) || (scopeFedId ? parseInt(scopeFedId) : ''));

        setForm({
            nombre: '',
            apellido: '',
            dni: '',
            documento: '',
            email: '',
            telefono: '',
            direccion: '',
            fechaNacimiento: '',
            sexoId: 1,
            sexo: 1,
            clubId: parsedClubId,
            idClub: parsedClubId,
            federacionId: defaultFedId || '',
            pais: '',
            estadoPago: 0,
            presentoAptoMedico: false,
            perteneceSeleccion: false,
            becadoEnard: false,
            becadoSdn: false,
            montoBeca: 0
        });
        setView('crear');
    };

    const handleOpenEditar = (atleta) => {
        setSelectedAtleta(atleta);
        setForm({
            nombre: atleta.nombre || '',
            apellido: atleta.apellido || '',
            dni: atleta.dni || atleta.documento || '',
            documento: atleta.documento || atleta.dni || '',
            email: atleta.email || '',
            telefono: atleta.telefono || '',
            direccion: atleta.direccion || '',
            fechaNacimiento: atleta.fechaNacimiento ? atleta.fechaNacimiento.substring(0, 10) : '',
            sexoId: atleta.sexoId || atleta.sexo || 1,
            sexo: atleta.sexo || atleta.sexoId || 1,
            clubId: atleta.clubId || atleta.idClub || '',
            idClub: atleta.idClub || atleta.clubId || '',
            federacionId: (atleta.clubId || atleta.idClub)
                ? (getClubFederationId(clubes.find(c => pick(c, 'id', 'Id') === (atleta.clubId || atleta.idClub))) || '')
                : (scopeFedId || ''),
            pais: atleta.pais || '',
            estadoPago: atleta.estadoPago ?? 0,
            presentoAptoMedico: atleta.presentoAptoMedico || false,
            perteneceSeleccion: atleta.perteneceSeleccion || false,
            becadoEnard: atleta.becadoEnard || false,
            becadoSdn: atleta.becadoSdn || false,
            montoBeca: atleta.montoBeca || 0
        });
        setView('editar');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (view === 'editar') {
                await AtletaService.update(selectedAtleta.id, form);
                showAlert('success', 'Atleta actualizado correctamente.');
            } else {
                await AtletaService.create(form);
                showAlert('success', 'Atleta registrado exitosamente.');
            }
            setView('lista');
            loadData();
        } catch (error) {
            showAlert('error', 'Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        setDeleteConfirm({ show: true, id });
    };

    const confirmDelete = async () => {
        const { id } = deleteConfirm;
        if (!id) return;
        setSaving(true);
        try {
            await AtletaService.delete(id);
            showAlert('success', 'Atleta eliminado correctamente.');
            setDeleteConfirm({ show: false, id: null });
            loadData();
        } catch (error) {
            showAlert('error', 'Error al eliminar: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleAssignClub = async () => {
        if (!assignModal.clubId || !assignModal.atleta) return;
        setSaving(true);
        try {
            const atleta = assignModal.atleta;
            await AtletaService.update(atleta.id, {
                nombre: atleta.nombre,
                apellido: atleta.apellido,
                dni: atleta.dni,
                email: atleta.email || '',
                fechaNacimiento: atleta.fechaNacimiento,
                sexoId: atleta.sexoId,
                clubId: parseInt(assignModal.clubId),
                pais: atleta.pais || ''
            });
            showAlert('success', `${atleta.nombre} ${atleta.apellido} asignado correctamente.`);
            setAssignModal({ show: false, atleta: null, clubId: '' });
            loadData();
        } catch (err) {
            showAlert('error', 'Error al asignar: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const filteredAtletas = atletas
        .filter(atleta => {
            const searchLower = searchTerm.toLowerCase();
            const searchableText = `${atleta.nombre} ${atleta.apellido} ${atleta.dni} ${atleta.email || ''} ${atleta.categoriaNombre || ''}`.toLowerCase();
            const nameMatch = searchableText.includes(searchLower);
            let clubMatch;
            if (selectedClub === '__SIN_CLUB__') {
                clubMatch = !atleta.clubNombre || atleta.clubId === null || atleta.clubId === 0;
            } else {
                clubMatch = !selectedClub || atleta.clubNombre === selectedClub;
            }

            // Scoping por federación
            let fedMatch = true;
            if (fedIdFromUrl) {
                const targetFedId = parseInt(fedIdFromUrl);
                if (atleta.clubId) {
                    const athleteClub = clubes.find(c => pick(c, 'id', 'Id') === atleta.clubId);
                    fedMatch = athleteClub && String(getClubFederationId(athleteClub)) === String(targetFedId);
                } else {
                    // Atletas sin club (siempre visibles para poder ser asignados a clubes de esta federación)
                    fedMatch = true;
                }
            }

            return nameMatch && clubMatch && fedMatch;
        })
        .sort((a, b) => {
            let aVal = a[sortConfig.key] || '';
            let bVal = b[sortConfig.key] || '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const totalPages = Math.ceil(filteredAtletas.length / rowsPerPage);
    const displayedAtletas = filteredAtletas.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    return (
        <div className="admin-section-container">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            <div className="section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <button 
                        className="btn-admin-secondary" 
                        onClick={() => view === 'lista' ? navigate(-1) : setView('lista')}
                        title="Volver"
                        style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0 }}>
                            {clubNombreFromUrl ? `Atletas — ${clubNombreFromUrl}` : 'Nómina de Atletas'}
                        </h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                            {clubNombreFromUrl 
                                ? `Mostrando atletas del club seleccionado.`
                                : 'Gestión global de atletas y sus representatividades de club.'
                            }
                        </p>
                    </div>
                </div>
                {view === 'lista' && (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <UserPlus size={20} /> Nuevo Atleta
                    </button>
                )}
            </div>

            {view === 'lista' && (
                <div className="admin-filters-bar glass-effect fade-in">
                    <div className="admin-filter-item">
                        <Filter size={18} className="filter-icon" />
                        <CustomSelect 
                            value={selectedClub} 
                            onChange={(val) => setSelectedClub(val)}
                            options={[
                                { value: '', label: 'Todos los Clubes' },
                                { value: '__SIN_CLUB__', label: 'Sin Club asignado' },
                                ...filterClubesByFederation(clubes, fedIdFromUrl)
                                    .map(c => ({ value: c.nombre, label: c.nombre }))
                            ]}
                        />
                    </div>
                    <SearchBox 
                        placeholder="Busca por nombre, DNI o categoría..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>
            )}

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <>
                        <AtletaGrid 
                            atletas={displayedAtletas}
                            onEdit={handleOpenEditar}
                            onDelete={handleDelete}
                            onAssignClub={(atleta) => setAssignModal({ show: true, atleta, clubId: '' })}
                            sortConfig={sortConfig}
                            requestSort={requestSort}
                        />
                        
                        {filteredAtletas.length > rowsPerPage && (
                            <div className="admin-pagination">
                                <button className="btn-pagination" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                                <span className="pagination-info">Página <strong>{currentPage}</strong> de {totalPages}</span>
                                <button className="btn-pagination" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
                            </div>
                        )}
                    </>
                )
            ) : (
                <AtletaForm 
                    initialData={form}
                    clubes={clubes}
                    federaciones={federaciones}
                    scopeFedId={scopeFedId}
                    showFederationSelect={isSuper && !scopeFedId}
                    saving={saving}
                    isEditing={view === 'editar'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                />
            )}

            <ConfirmDialog 
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Atleta"
                message="¿Estás seguro de que deseas eliminar este atleta? Esta acción no se puede deshacer."
                type="danger"
                confirmText="Sí, Eliminar"
                loading={saving}
            />

            {/* MODAL ASIGNAR CLUB */}
            {assignModal.show && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)'
                }}>
                    <div className="glass-effect" style={{
                        background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Link2 size={20} style={{ color: 'var(--color-accent-orange)' }} />
                                <h3 style={{ margin: 0 }}>Asignar Club</h3>
                            </div>
                            <button onClick={() => setAssignModal({ show: false, atleta: null, clubId: '' })}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Atleta: <strong style={{ color: 'var(--color-text)' }}>
                                {assignModal.atleta?.nombre} {assignModal.atleta?.apellido}
                            </strong>
                        </p>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                Seleccionar Club
                            </label>
                            <CustomSelect
                                value={assignModal.clubId}
                                onChange={val => setAssignModal(prev => ({ ...prev, clubId: val }))}
                                options={[
                                    { value: '', label: '-- Elegir un club --' },
                                    ...filterClubesByFederation(clubes, fedIdFromUrl)
                                        .map(c => ({ value: pick(c, 'id', 'Id'), label: c.nombre }))
                                ]}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-admin-secondary"
                                onClick={() => setAssignModal({ show: false, atleta: null, clubId: '' })}>
                                Cancelar
                            </button>
                            <button className="btn-admin-primary"
                                disabled={!assignModal.clubId || saving}
                                onClick={handleAssignClub}
                                style={{ background: 'var(--color-accent-orange)', borderColor: 'var(--color-accent-orange)' }}>
                                {saving ? 'Guardando...' : 'Asignar Club'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAtletasSection;
