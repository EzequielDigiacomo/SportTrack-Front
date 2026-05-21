import React, { useState } from 'react';
import { DollarSign, X, CheckCircle } from 'lucide-react';

const RegistrarPagoModal = ({ isOpen, onClose, onSubmit, paymentType, entityId, entityName }) => {
    const [monto, setMonto] = useState('');
    const [referencia, setReferencia] = useState('');
    const [notas, setNotas] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const amount = parseFloat(monto);
        if (isNaN(amount) || amount <= 0) {
            setError('Por favor, ingresa un monto válido mayor a 0.');
            setLoading(false);
            return;
        }

        try {
            await onSubmit({
                tipoPago: paymentType, // "ClubAfiliacion", "AtletaAfiliacion", "InscripcionEvento"
                clubId: paymentType === 'ClubAfiliacion' ? entityId : null,
                participanteId: paymentType === 'AtletaAfiliacion' ? entityId : null,
                inscripcionId: paymentType === 'InscripcionEvento' ? entityId : null,
                monto: amount,
                referencia,
                notas
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Ocurrió un error al registrar el pago.');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (paymentType) {
            case 'ClubAfiliacion':
                return `Registrar Pago Anual de Club`;
            case 'AtletaAfiliacion':
                return `Registrar Pago de Cuota de Atleta`;
            case 'InscripcionEvento':
                return `Registrar Pago de Inscripción`;
            default:
                return 'Registrar Pago';
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease-out'
        }}>
            <div className="glass-card fade-in" style={{
                background: 'var(--color-bg-secondary)',
                border: '1.5px solid var(--color-surface-hover)',
                borderRadius: '24px',
                padding: '2rem',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 150, 255, 0.1)',
                position: 'relative'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--color-text-secondary)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <DollarSign size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{getTitle()}</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Para: <strong>{entityName}</strong>
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#EF4444',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                            Monto a Registrar ($)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', fontWeight: 600 }}>$</span>
                            <input 
                                className="admin-input"
                                type="number" 
                                step="0.01"
                                placeholder="0.00"
                                value={monto} 
                                onChange={(e) => setMonto(e.target.value)} 
                                required
                                style={{ paddingLeft: '2rem', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                            Nro. de Referencia / Comprobante
                        </label>
                        <input 
                            className="admin-input"
                            type="text" 
                            placeholder="Ej. TRANSF-887766, RECIBO-02"
                            value={referencia} 
                            onChange={(e) => setReferencia(e.target.value)}
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                            Notas Adicionales
                        </label>
                        <textarea 
                            className="admin-input"
                            placeholder="Detalles sobre el pago..."
                            value={notas} 
                            onChange={(e) => setNotas(e.target.value)}
                            style={{ width: '100%', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button 
                            type="button" 
                            className="btn-admin-secondary" 
                            onClick={onClose}
                            style={{ flex: 1, padding: '0.75rem' }}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="btn-admin-primary"
                            disabled={loading}
                            style={{ 
                                flex: 2, 
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                borderColor: 'transparent',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <CheckCircle size={18} />
                            {loading ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrarPagoModal;
