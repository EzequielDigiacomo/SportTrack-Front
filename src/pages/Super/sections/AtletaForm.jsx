import React from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { getClubFederationId, pick } from '../../../utils/apiHelpers';

const SEXO_OPTIONS = [
    { value: 1, label: 'Masculino' },
    { value: 2, label: 'Femenino' },
    { value: 3, label: 'Mixto' },
];

const ESTADO_PAGO_OPTIONS = [
    { value: 0, label: 'Adeudado (Pendiente)' },
    { value: 1, label: 'Abonado (Pagado)' },
    { value: 2, label: 'Vencido' },
    { value: 3, label: 'Parcial' },
];

const AtletaForm = ({ 
    initialData, 
    clubes = [],
    federaciones = [],
    onCancel, 
    onSubmit, 
    onChange, 
    saving, 
    isEditing,
    hideClubSelect = false
}) => {
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="atleta-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">

                    {/* SECCIÓN: DATOS PERSONALES */}
                    <div className="form-section">
                        <h4>Datos Personales</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre *</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="nombre"
                                    value={initialData.nombre} 
                                    onChange={(e) => onChange('nombre', e.target.value)} 
                                    required 
                                    minLength={2}
                                />
                            </div>
                            <div className="form-group">
                                <label>Apellido *</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="apellido"
                                    value={initialData.apellido} 
                                    onChange={(e) => onChange('apellido', e.target.value)} 
                                    required 
                                    minLength={2}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>DNI / Cédula / Documento *</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="dni"
                                    value={initialData.dni || initialData.documento || ''} 
                                    onChange={(e) => { onChange('dni', e.target.value); onChange('documento', e.target.value); }} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Sexo</label>
                                <select 
                                    className="admin-select"
                                    name="sexoId"
                                    value={initialData.sexoId || initialData.sexo || 1} 
                                    onChange={(e) => { onChange('sexoId', parseInt(e.target.value)); onChange('sexo', parseInt(e.target.value)); }}
                                >
                                    {SEXO_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Fecha de Nacimiento *</label>
                            <input 
                                className="admin-input"
                                type="date" 
                                name="fechaNacimiento"
                                value={initialData.fechaNacimiento} 
                                onChange={(e) => onChange('fechaNacimiento', e.target.value)} 
                                required 
                                min="1940-01-01"
                                max={today}
                            />
                            <small style={{color: 'var(--color-text-dim)', fontSize: '0.75rem'}}>Permitido desde 1940 hasta hoy</small>
                        </div>
                    </div>

                    {/* SECCIÓN: CONTACTO Y AFILIACIÓN */}
                    <div className="form-section">
                        <h4>Contacto y Afiliación</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Email</label>
                                <input 
                                    className="admin-input"
                                    type="email" 
                                    name="email"
                                    value={initialData.email} 
                                    onChange={(e) => onChange('email', e.target.value)} 
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="telefono"
                                    value={initialData.telefono || ''} 
                                    onChange={(e) => onChange('telefono', e.target.value)} 
                                    placeholder="+54 11 ..."
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Dirección</label>
                            <input 
                                className="admin-input"
                                type="text" 
                                name="direccion"
                                value={initialData.direccion || ''} 
                                onChange={(e) => onChange('direccion', e.target.value)} 
                                placeholder="Ciudad, Provincia..."
                            />
                        </div>
                        <div className="form-group">
                            <label>País / Nacionalidad</label>
                            <input 
                                className="admin-input"
                                type="text" 
                                name="pais"
                                value={initialData.pais || ''} 
                                onChange={(e) => onChange('pais', e.target.value)} 
                            />
                        </div>
                        
                        {!hideClubSelect && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Federación</label>
                                    <select 
                                        className="admin-select"
                                        name="federacionId"
                                        value={initialData.federacionId || ''} 
                                        onChange={(e) => { 
                                            onChange('federacionId', e.target.value); 
                                            onChange('clubId', ''); 
                                            onChange('idClub', ''); 
                                        }}
                                    >
                                        <option value="">Seleccionar Federación</option>
                                        {federaciones.map(fed => (
                                            <option key={fed.id} value={fed.id}>{fed.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Club / Entidad</label>
                                    <select 
                                        className="admin-select"
                                        name="clubId"
                                        value={initialData.clubId || initialData.idClub || ''} 
                                        onChange={(e) => { onChange('clubId', e.target.value); onChange('idClub', e.target.value); }}
                                        disabled={!initialData.federacionId && federaciones.length > 0}
                                    >
                                        <option value="">Sin Asignar (Agente Libre)</option>
                                        {clubes
                                            .filter(c => {
                                                const clubFedId = getClubFederationId(c);
                                                return clubFedId && (!initialData.federacionId || String(clubFedId) === String(initialData.federacionId));
                                            })
                                            .map(club => {
                                                const clubId = pick(club, 'id', 'Id', 'idClub', 'IdClub');
                                                return (
                                                    <option key={clubId} value={clubId}>{club.nombre}</option>
                                                );
                                            })}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN: DATOS DEPORTIVOS */}
                    <div className="form-section">
                        <h4>Datos Deportivos y Administrativos</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Estado de Pago (Matrícula)</label>
                                <select 
                                    className="admin-select"
                                    name="estadoPago"
                                    value={initialData.estadoPago ?? 0} 
                                    onChange={(e) => onChange('estadoPago', parseInt(e.target.value))}
                                >
                                    {ESTADO_PAGO_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    id="presentoAptoMedico"
                                    name="presentoAptoMedico" 
                                    checked={initialData.presentoAptoMedico || false} 
                                    onChange={(e) => onChange('presentoAptoMedico', e.target.checked)} 
                                />
                                <label htmlFor="presentoAptoMedico" style={{ marginBottom: 0 }}>Presentó Apto Médico</label>
                            </div>
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    id="perteneceSeleccion"
                                    name="perteneceSeleccion" 
                                    checked={initialData.perteneceSeleccion || false} 
                                    onChange={(e) => onChange('perteneceSeleccion', e.target.checked)} 
                                />
                                <label htmlFor="perteneceSeleccion" style={{ marginBottom: 0 }}>Pertenece a Selección</label>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN: BECAS */}
                    <div className="form-section">
                        <h4>Becas</h4>
                        <div className="form-row">
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    id="becadoEnard"
                                    name="becadoEnard" 
                                    checked={initialData.becadoEnard || false} 
                                    onChange={(e) => onChange('becadoEnard', e.target.checked)} 
                                />
                                <label htmlFor="becadoEnard" style={{ marginBottom: 0 }}>Becado ENARD</label>
                            </div>
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    id="becadoSdn"
                                    name="becadoSdn" 
                                    checked={initialData.becadoSdn || false} 
                                    onChange={(e) => onChange('becadoSdn', e.target.checked)} 
                                />
                                <label htmlFor="becadoSdn" style={{ marginBottom: 0 }}>Becado SDN</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Monto Beca</label>
                            <input 
                                className="admin-input"
                                type="number" 
                                name="montoBeca"
                                value={initialData.montoBeca || 0} 
                                onChange={(e) => onChange('montoBeca', parseFloat(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Atleta' : 'Registrar Atleta')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default AtletaForm;
