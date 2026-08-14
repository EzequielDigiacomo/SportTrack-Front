import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import FederacionService from '../../../services/FederacionService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import { getClubFederationId, pick } from '../../../utils/apiHelpers';

const SEXO_OPTIONS = [
    { value: 1, label: 'Masculino' },
    { value: 2, label: 'Femenino' },
    { value: 3, label: 'Mixto' },
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
    hideClubSelect = false,
    scopeFedId = null,
    showFederationSelect = false,
    showClubSelect = true,
    fixedClubLabel = null,
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [federacionesList, setFederacionesList] = useState(federaciones);
    const [invalidFields, setInvalidFields] = useState([]);
    const [missingAlert, setMissingAlert] = useState({ isOpen: false, message: '' });
    const effectiveFedId = initialData.federacionId || scopeFedId || '';
    const clubRequired = showClubSelect && !hideClubSelect;

    const markValid = (name) => {
        setInvalidFields((prev) => prev.filter((f) => f !== name));
    };

    const handleChange = (name, value) => {
        markValid(name);
        onChange(name, value);
    };

    const collectMissingFields = () => {
        const missing = [];
        if (!String(initialData.nombre || '').trim()) missing.push({ id: 'nombre', label: 'Nombre' });
        if (!String(initialData.apellido || '').trim()) missing.push({ id: 'apellido', label: 'Apellido' });
        if (!String(initialData.dni || initialData.documento || '').trim()) missing.push({ id: 'dni', label: 'DNI / Documento' });
        if (!initialData.fechaNacimiento) missing.push({ id: 'fechaNacimiento', label: 'Fecha de nacimiento' });
        if (showFederationSelect && !initialData.federacionId) missing.push({ id: 'federacionId', label: 'Federación' });
        if (clubRequired && !initialData.clubId && !initialData.idClub) missing.push({ id: 'clubId', label: 'Club / Entidad' });
        return missing;
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const missing = collectMissingFields();
        if (missing.length) {
            setInvalidFields(missing.map((f) => f.id));
            setMissingAlert({
                isOpen: true,
                message: `Completá estos datos para continuar:\n\n${missing.map((f) => `• ${f.label}`).join('\n')}`,
            });
            return;
        }
        onSubmit(e);
    };

    const isInvalid = (name) => invalidFields.includes(name);
    const fieldClass = (base, name) => `${base}${isInvalid(name) ? ' field-invalid' : ''}`;

    useEffect(() => {
        if (!showFederationSelect) return undefined;

        let cancelled = false;

        const loadFederaciones = async () => {
            try {
                const data = await FederacionService.getAll();
                if (cancelled) return;

                const scoped = scopeFedId
                    ? data.filter(f => String(f.id) === String(scopeFedId))
                    : data;

                setFederacionesList(scoped.length > 0 ? scoped : data);
            } catch (err) {
                console.error('Error cargando federaciones:', err);
                if (!cancelled && federaciones.length > 0) {
                    setFederacionesList(federaciones);
                }
            }
        };

        loadFederaciones();
        return () => { cancelled = true; };
    }, [scopeFedId, federaciones, showFederationSelect]);

    return (
        <div className="atleta-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={handleFormSubmit} className="admin-grid-form" noValidate>

                    {/* SECCIÓN: DATOS PERSONALES */}
                    <div className="form-section">
                        <h4>Datos Personales</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre *</label>
                                <input 
                                    className={fieldClass('admin-input', 'nombre')}
                                    type="text" 
                                    name="nombre"
                                    value={initialData.nombre} 
                                    onChange={(e) => handleChange('nombre', e.target.value)} 
                                />
                                {isInvalid('nombre') && <span className="field-invalid-hint">Completá el nombre</span>}
                            </div>
                            <div className="form-group">
                                <label>Apellido *</label>
                                <input 
                                    className={fieldClass('admin-input', 'apellido')}
                                    type="text" 
                                    name="apellido"
                                    value={initialData.apellido} 
                                    onChange={(e) => handleChange('apellido', e.target.value)} 
                                />
                                {isInvalid('apellido') && <span className="field-invalid-hint">Completá el apellido</span>}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>DNI / Cédula / Documento *</label>
                                <input 
                                    className={fieldClass('admin-input', 'dni')}
                                    type="text" 
                                    name="dni"
                                    value={initialData.dni || initialData.documento || ''} 
                                    onChange={(e) => { handleChange('dni', e.target.value); onChange('documento', e.target.value); }} 
                                />
                                {isInvalid('dni') && <span className="field-invalid-hint">Completá el documento</span>}
                            </div>
                            <div className="form-group">
                                <label>Sexo</label>
                                <select 
                                    className="admin-select"
                                    name="sexoId"
                                    value={initialData.sexoId || initialData.sexo || 1} 
                                    onChange={(e) => { handleChange('sexoId', parseInt(e.target.value)); onChange('sexo', parseInt(e.target.value)); }}
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
                                className={fieldClass('admin-input', 'fechaNacimiento')}
                                type="date" 
                                name="fechaNacimiento"
                                value={initialData.fechaNacimiento} 
                                onChange={(e) => handleChange('fechaNacimiento', e.target.value)} 
                                min="1940-01-01"
                                max={today}
                            />
                            {isInvalid('fechaNacimiento')
                                ? <span className="field-invalid-hint">Indicá la fecha de nacimiento</span>
                                : <small style={{color: 'var(--color-text-dim)', fontSize: '0.75rem'}}>Permitido desde 1940 hasta hoy</small>}
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
                                    onChange={(e) => handleChange('email', e.target.value)} 
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
                                    onChange={(e) => handleChange('telefono', e.target.value)} 
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
                                    onChange={(e) => handleChange('direccion', e.target.value)}
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
                                    onChange={(e) => handleChange('pais', e.target.value)}
                            />
                        </div>
                        
                        {(showFederationSelect || showClubSelect || fixedClubLabel) && (
                            <div className="form-row">
                                {showFederationSelect && (
                                    <div className="form-group">
                                        <label>Federación *</label>
                                        <select 
                                            className={fieldClass('admin-select', 'federacionId')}
                                            name="federacionId"
                                            value={initialData.federacionId || ''} 
                                            onChange={(e) => { 
                                                handleChange('federacionId', e.target.value); 
                                                onChange('clubId', ''); 
                                                onChange('idClub', ''); 
                                            }}
                                        >
                                            <option value="">Seleccionar Federación</option>
                                            {federacionesList.map(fed => (
                                                <option key={fed.id} value={fed.id}>{fed.nombre}</option>
                                            ))}
                                        </select>
                                        {isInvalid('federacionId') && <span className="field-invalid-hint">Seleccioná la federación</span>}
                                    </div>
                                )}
                                {fixedClubLabel && (
                                    <div className="form-group">
                                        <label>Club</label>
                                        <input
                                            className="admin-input"
                                            type="text"
                                            value={fixedClubLabel}
                                            readOnly
                                            disabled
                                        />
                                    </div>
                                )}
                                {showClubSelect && !hideClubSelect && (
                                    <div className="form-group">
                                        <label>Club / Entidad *</label>
                                        <select 
                                            className={fieldClass('admin-select', 'clubId')}
                                            name="clubId"
                                            value={initialData.clubId || initialData.idClub || ''} 
                                            onChange={(e) => { handleChange('clubId', e.target.value); onChange('idClub', e.target.value); }}
                                            disabled={showFederationSelect && !effectiveFedId}
                                        >
                                            <option value="">Seleccionar club</option>
                                            {clubes
                                                .filter(c => {
                                                    const clubFedId = getClubFederationId(c);
                                                    if (showFederationSelect) {
                                                        return clubFedId && effectiveFedId && String(clubFedId) === String(effectiveFedId);
                                                    }
                                                    if (scopeFedId) {
                                                        return clubFedId && String(clubFedId) === String(scopeFedId);
                                                    }
                                                    return Boolean(clubFedId);
                                                })
                                                .map(club => {
                                                    const clubId = pick(club, 'id', 'Id', 'idClub', 'IdClub');
                                                    return (
                                                        <option key={clubId} value={clubId}>{club.nombre}</option>
                                                    );
                                                })}
                                        </select>
                                        {isInvalid('clubId') && <span className="field-invalid-hint">Seleccioná el club del atleta</span>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Atleta' : 'Registrar Atleta')}
                        </button>
                    </div>
                </form>
            </div>
            <ConfirmDialog
                isOpen={missingAlert.isOpen}
                onClose={() => setMissingAlert({ isOpen: false, message: '' })}
                onConfirm={() => setMissingAlert({ isOpen: false, message: '' })}
                title="Faltan datos"
                message={missingAlert.message}
                type="warning"
                confirmText="Entendido"
                cancelText=""
            />
        </div>
    );
};


export default AtletaForm;
