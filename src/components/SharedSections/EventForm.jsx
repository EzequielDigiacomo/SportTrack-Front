import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m', 6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 
    10: '5000m', 11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

const EventForm = ({ initialData, onCancel, onSubmit, onChange, saving, isEditing, clubes = [], allCategorias = [], allBotes = [], allDistancias = [] }) => {
    const { user } = useAuth();
    const isAdmin = user?.rol === 'Admin';
    return (
        <div className="event-form-container fade-in">
            <div className="section-header-row" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <button 
                        className="btn-admin-secondary" 
                        onClick={onCancel}
                        title="Volver"
                        style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 style={{ margin: 0 }}>{isEditing ? 'Editar Evento' : 'Nuevo Evento'}</h2>
                </div>
            </div>

            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    <div className="form-section">
                        <h4>Información Básica</h4>
                        <div className="form-group">
                            <label>Nombre del Evento</label>
                            <input 
                                type="text" 
                                value={initialData.nombre} 
                                onChange={(e) => onChange('nombre', e.target.value)} 
                                placeholder="Ej: Regata Nacional de Canotaje"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fecha de Inicio</label>
                                <input 
                                    type="date" 
                                    value={initialData.fecha} 
                                    onChange={(e) => onChange('fecha', e.target.value)} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha de Finalización</label>
                                <input 
                                    type="date" 
                                    value={initialData.fechaFin} 
                                    onChange={(e) => onChange('fechaFin', e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Ubicación / Pista</label>
                            <input 
                                type="text" 
                                value={initialData.ubicacion} 
                                onChange={(e) => onChange('ubicacion', e.target.value)} 
                                placeholder="Ej: Lago San Pablo, Imbabura"
                            />
                        </div>

                        {isAdmin && (
                            <div className="form-group">
                                <label>Organizador (Club / Federación)</label>
                                <select 
                                    value={initialData.clubId} 
                                    onChange={(e) => onChange('clubId', e.target.value)}
                                >
                                    <option value="">Federación</option>
                                    {clubes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h4>Estado y Reglas Básicas</h4>
                        <div className="form-group">
                            <label>Estado del Evento</label>
                            <select 
                                value={initialData.estado} 
                                onChange={(e) => onChange('estado', e.target.value)}
                            >
                                <option value="Programado">Programado</option>
                                <option value="EnCurso">En Curso</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Fin de Inscripciones</label>
                            <input 
                                type="date" 
                                value={initialData.fechaFinInscripciones} 
                                onChange={(e) => onChange('fechaFinInscripciones', e.target.value)} 
                            />
                        </div>
                        
                        <div className="form-rules-container glass-effect mt-md">
                            <h4>Reglas Técnicas Federativas</h4>
                            <div className="rules-grid">
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.restringirSoloCategoriaPropia} 
                                        onChange={(e) => onChange('restringirSoloCategoriaPropia', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Solo permitir categoría propia</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.permitirSub23EnSenior} 
                                        onChange={(e) => onChange('permitirSub23EnSenior', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Permitir Sub23 en Senior</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.permitirMasterBajarASenior} 
                                        onChange={(e) => onChange('permitirMasterBajarASenior', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Permitir Master en Senior</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.limitacionBotesAB} 
                                        onChange={(e) => onChange('limitacionBotesAB', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Límite Botes A/B por Club</strong>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Configuración de Cronograma Inteligente</h4>
                        <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="form-group">
                                <label>Hora de Inicio</label>
                                <input 
                                    type="time" 
                                    value={initialData.horaInicioEvento} 
                                    onChange={(e) => onChange('horaInicioEvento', e.target.value)} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Carriles</label>
                                <select 
                                    value={initialData.carrilesDisponibles} 
                                    onChange={(e) => onChange('carrilesDisponibles', parseInt(e.target.value))}
                                >
                                    <option value={8}>8 Carriles</option>
                                    <option value={9}>9 Carriles</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Huso Horario (Sede)</label>
                                <select 
                                    value={initialData.timeZoneId} 
                                    onChange={(e) => onChange('timeZoneId', e.target.value)}
                                    className="admin-select"
                                >
                                    <option value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</option>
                                    <option value="America/Montevideo">Uruguay (UTC-3)</option>
                                    <option value="America/Santiago">Chile (UTC-4)</option>
                                    <option value="America/Bogota">Colombia / Ecuador (UTC-5)</option>
                                    <option value="America/Lima">Perú (UTC-5)</option>
                                    <option value="America/Asuncion">Paraguay (UTC-4)</option>
                                    <option value="America/Mexico_City">México (UTC-6)</option>
                                    <option value="Europe/Madrid">España (UTC+1)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Escenario de Cronograma (Presets)</label>
                            <div className="scenarios-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button"
                                    className={`btn-scenario glass-effect ${initialData.perfilTiempo === 'Caso1' ? 'active' : ''}`}
                                    onClick={() => {
                                        onChange('perfilTiempo', 'Caso1');
                                        onChange('gapEntrePruebas', 7); // Un promedio para terminar temprano
                                        onChange('sinReceso', true);
                                        onChange('horaFinReceso', '14:00');
                                    }}
                                    style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', background: initialData.perfilTiempo === 'Caso1' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', color: 'white' }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Caso 1: Intensivo</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Terminar ~14:00hs. Sin receso. Gap corto.</div>
                                </button>
                                <button 
                                    type="button"
                                    className={`btn-scenario glass-effect ${initialData.perfilTiempo === 'Caso2' ? 'active' : ''}`}
                                    onClick={() => {
                                        onChange('perfilTiempo', 'Caso2');
                                        onChange('gapEntrePruebas', 10);
                                        onChange('sinReceso', true);
                                    }}
                                    style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', background: initialData.perfilTiempo === 'Caso2' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', color: 'white' }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Caso 2: Jornada Corrida</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hasta 17:30hs. Sin receso. Gap 10'.</div>
                                </button>
                                <button 
                                    type="button"
                                    className={`btn-scenario glass-effect ${initialData.perfilTiempo === 'Caso3' ? 'active' : ''}`}
                                    onClick={() => {
                                        onChange('perfilTiempo', 'Caso3');
                                        onChange('gapEntrePruebas', 10);
                                        onChange('sinReceso', false);
                                        onChange('horaInicioReceso', '13:00');
                                        onChange('horaFinReceso', '14:00');
                                    }}
                                    style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', background: initialData.perfilTiempo === 'Caso3' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', color: 'white' }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Caso 3: Con Receso</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hasta 16:30hs. Con almuerzo (13-14hs).</div>
                                </button>
                                <button 
                                    type="button"
                                    className={`btn-scenario glass-effect ${initialData.perfilTiempo === 'Personalizado' ? 'active' : ''}`}
                                    onClick={() => onChange('perfilTiempo', 'Personalizado')}
                                    style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', background: initialData.perfilTiempo === 'Personalizado' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', color: 'white' }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Caso 4: Manual</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tú eliges gaps y recesos libremente.</div>
                                </button>
                            </div>
                        </div>

                        <div className="form-row" style={{ alignItems: 'flex-end' }}>
                            <div className="form-group">
                                <label>Pausa entre Largadas (Minutos)</label>
                                <select 
                                    value={initialData.gapEntrePruebas} 
                                    onChange={(e) => onChange('gapEntrePruebas', parseInt(e.target.value))}
                                    className="admin-select"
                                >
                                    <option value={5}>Cada 5 min (Muy rápido)</option>
                                    <option value={7}>Cada 7 min (Optimizado)</option>
                                    <option value={8}>Cada 8 min (Ágil)</option>
                                    <option value={10}>Cada 10 min (Estándar)</option>
                                    <option value={12}>Cada 12 min (Holgado)</option>
                                    <option value={15}>Cada 15 min (Lento)</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', justifyContent: 'center' }}>
                                <label className="checkbox-label" style={{ marginBottom: '0px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.sinReceso} 
                                        onChange={(e) => onChange('sinReceso', e.target.checked)} 
                                    />
                                    <strong>Eliminar Receso de Almuerzo</strong>
                                </label>
                                <label className="checkbox-label" style={{ marginBottom: '0px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.usarGapVariable} 
                                        onChange={(e) => onChange('usarGapVariable', e.target.checked)} 
                                    />
                                    <strong style={{ color: 'var(--color-primary)' }}>Ajustar gap de largada según distancia (variable)</strong>
                                </label>
                            </div>
                        </div>

                        {!initialData.sinReceso && (
                            <div className="form-row fade-in">
                                <div className="form-group">
                                    <label>Inicio Receso</label>
                                    <input 
                                        type="time" 
                                        value={initialData.horaInicioReceso} 
                                        onChange={(e) => onChange('horaInicioReceso', e.target.value)} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fin Receso</label>
                                    <input 
                                        type="time" 
                                        value={initialData.horaFinReceso} 
                                        onChange={(e) => onChange('horaFinReceso', e.target.value)} 
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-rules-container glass-effect mt-md">
                            <h4>Optimización de Series</h4>
                            <div className="rules-grid">
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.permitirCombinadas} 
                                        onChange={(e) => onChange('permitirCombinadas', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Permitir Sugerencia de Series Combinadas</strong>
                                    </div>
                                </label>
                            </div>
                        </div>
                    <div className="form-section full-width">
                        <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--color-primary-light)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                            Configuración de Opciones Habilitadas (Programa)
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                            Selecciona las opciones que estarán disponibles al armar el programa de este evento.
                        </p>

                        <div className="habilitaciones-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                            {/* DISTANCIAS */}
                            <div className="habilitacion-group glass-effect" style={{ padding: '1.2rem', borderRadius: '12px' }}>
                                <h5 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📏 Distancias</h5>
                                <div className="checkbox-scroll-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {allDistancias.map(d => {
                                        const ids = initialData.distanciasHabilitadas ? initialData.distanciasHabilitadas.split(',') : [];
                                        const isChecked = ids.includes(d.id.toString());
                                        const label = DISTANCIA_NAMES[d.id] || `${d.distanciaRegata}m`;
                                        return (
                                            <label key={d.id} className="checkbox-label" style={{ fontSize: '0.9rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        let newIds = e.target.checked 
                                                            ? [...ids, d.id.toString()]
                                                            : ids.filter(id => id !== d.id.toString());
                                                        onChange('distanciasHabilitadas', newIds.join(','));
                                                    }}
                                                />
                                                {label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CATEGORIAS */}
                            <div className="habilitacion-group glass-effect" style={{ padding: '1.2rem', borderRadius: '12px' }}>
                                <h5 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👥 Categorías</h5>
                                <div className="checkbox-scroll-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {allCategorias
                                        .filter(c => c.nombre.toLowerCase() !== 'control')
                                        .map(c => {
                                            const ids = initialData.categoriasHabilitadas ? initialData.categoriasHabilitadas.split(',') : [];
                                            const isChecked = ids.includes(c.id.toString());
                                            return (
                                                <label key={c.id} className="checkbox-label" style={{ fontSize: '0.9rem' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            let newIds = e.target.checked 
                                                                ? [...ids, c.id.toString()]
                                                                : ids.filter(id => id !== c.id.toString());
                                                            onChange('categoriasHabilitadas', newIds.join(','));
                                                        }}
                                                    />
                                                    {c.nombre}
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* BOTES */}
                            <div className="habilitacion-group glass-effect" style={{ padding: '1.2rem', borderRadius: '12px' }}>
                                <h5 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🚣 Botes</h5>
                                <div className="checkbox-scroll-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {allBotes.map(b => {
                                        const ids = initialData.botesHabilitados ? initialData.botesHabilitados.split(',') : [];
                                        const isChecked = ids.includes(b.id.toString());
                                        const label = BOTE_NAMES[b.id] || b.tipo;
                                        return (
                                            <label key={b.id} className="checkbox-label" style={{ fontSize: '0.9rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        let newIds = e.target.checked 
                                                            ? [...ids, b.id.toString()]
                                                            : ids.filter(id => id !== b.id.toString());
                                                        onChange('botesHabilitados', newIds.join(','));
                                                    }}
                                                />
                                                {label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Evento' : 'Crear Evento')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default EventForm;
