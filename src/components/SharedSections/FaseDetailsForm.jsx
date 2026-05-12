import React, { useState, useEffect } from 'react';
import { Wind, Waves, FileText, Save } from 'lucide-react';

const FaseDetailsForm = ({ fase, onSave, saving }) => {
    const [details, setDetails] = useState({
        observaciones: fase?.observaciones || ''
    });

    useEffect(() => {
        setDetails({
            observaciones: fase?.observaciones || ''
        });
    }, [fase]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(fase.id, details);
    };

    return (
        <div className="fase-details-form glass-effect p-md mb-md" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid rgba(100, 160, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(100, 160, 255, 0.1)', borderRadius: '8px', color: 'var(--color-primary-light)' }}>
                    <FileText size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Notas y Observaciones de Carrera</h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
                <div className="admin-input-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '0.4rem' }}>
                        <FileText size={14} /> Observaciones / Notas de la Fase
                    </label>
                    <textarea 
                        name="observaciones"
                        value={details.observaciones}
                        onChange={handleChange}
                        className="admin-input"
                        placeholder="Incidencias, retrasos, comentarios generales..."
                        rows="3"
                        style={{ resize: 'vertical', minHeight: '80px' }}
                        disabled={saving}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        type="submit" 
                        className="btn-admin-primary" 
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.5rem' }}
                    >
                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Observaciones'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FaseDetailsForm;
