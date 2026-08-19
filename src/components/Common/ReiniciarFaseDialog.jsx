import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import {
    REINICIAR_FASE_AVISO,
    REINICIAR_FASE_CATEGORIAS,
    buildReiniciarMotivo,
    isReiniciarMotivoValid,
} from '../../utils/reiniciarFaseConstants';

const ReiniciarFaseDialog = ({
    isOpen,
    onClose,
    onConfirm,
    loading = false,
    faseNombre = '',
    faseEstado = '',
    isMaraton = false,
}) => {
    const [categoria, setCategoria] = useState('');
    const [detalle, setDetalle] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCategoria('');
            setDetalle('');
        }
    }, [isOpen]);

    const entityLabel = isMaraton ? 'largada' : 'fase';
    const isFinalizada = faseEstado === 'Finalizada';
    const canConfirm = isReiniciarMotivoValid(categoria, detalle);

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm({
            categoria,
            motivo: buildReiniciarMotivo(categoria, detalle),
        });
    };

    const footer = (
        <>
            <button className="btn-admin-secondary" onClick={onClose} disabled={loading}>
                Cancelar
            </button>
            <button
                className="btn-admin-primary"
                onClick={handleConfirm}
                disabled={loading || !canConfirm}
                style={canConfirm ? { background: '#dc2626', borderColor: '#dc2626' } : undefined}
            >
                {loading ? 'Reiniciando...' : `Reiniciar ${entityLabel}`}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Reiniciar ${entityLabel}`}
            footer={footer}
            maxWidth="520px"
            closeOnOverlayClick={!loading}
        >
            <div className="modal-confirm" style={{ textAlign: 'left' }}>
                <div className="confirm-icon warning" style={{ marginBottom: '1rem' }}>
                    <RotateCcw size={32} />
                </div>

                {faseNombre && (
                    <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
                        {faseNombre}
                        {faseEstado ? (
                            <span style={{ fontWeight: 400, color: 'var(--color-text-muted, #888)' }}>
                                {' '}· Estado actual: {faseEstado}
                            </span>
                        ) : null}
                    </p>
                )}

                <div
                    style={{
                        marginBottom: '1rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        borderLeft: '4px solid #f59e0b',
                        background: 'rgba(245, 158, 11, 0.08)',
                        fontSize: '0.875rem',
                        lineHeight: 1.45,
                    }}
                >
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <AlertTriangle size={16} /> Cuándo usar el reinicio
                    </strong>
                    {REINICIAR_FASE_AVISO}
                </div>

                {isFinalizada && (
                    <div
                        style={{
                            marginBottom: '1rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            borderLeft: '4px solid #ef4444',
                            background: 'rgba(239, 68, 68, 0.08)',
                            fontSize: '0.85rem',
                        }}
                    >
                        Esta {entityLabel} ya fue <strong>oficializada</strong>. El reinicio borrará todos los tiempos y
                        posiciones publicados, pero conservará carriles e inscripciones.
                    </div>
                )}

                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Motivo del reinicio *
                </label>
                <select
                    className="admin-input"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={loading}
                    style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                    <option value="">Seleccioná una categoría...</option>
                    {REINICIAR_FASE_CATEGORIAS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    {categoria === 'otro' ? 'Detalle del motivo *' : 'Detalle adicional (opcional)'}
                </label>
                <textarea
                    className="admin-input"
                    rows={3}
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    disabled={loading}
                    placeholder={
                        categoria === 'otro'
                            ? 'Describí el incidente (mínimo 10 caracteres)...'
                            : 'Ej.: viento cruzado en carril 4, falla de cronómetro en meta...'
                    }
                    style={{ width: '100%', resize: 'vertical' }}
                />
                {categoria === 'otro' && detalle.trim().length > 0 && detalle.trim().length < 10 && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                        El detalle debe tener al menos 10 caracteres.
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default ReiniciarFaseDialog;
