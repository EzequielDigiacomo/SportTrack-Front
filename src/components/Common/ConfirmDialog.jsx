import React from 'react';
import Modal from './Modal';
import { AlertCircle, Trash2, Info, CheckCircle } from 'lucide-react';

/**
 * ConfirmDialog component for Yes/No actions
 * @param {boolean} isOpen - Modal state
 * @param {function} onClose - Close callback
 * @param {function} onConfirm - Confirm callback
 * @param {string} title - Modal title
 * @param {string} message - Main message
 * @param {string} confirmText - Label for confirm button
 * @param {string} cancelText - Label for cancel button
 * @param {string} type - danger | warning | info | success
 * @param {boolean} loading - Loading state for confirm button
 */
const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = '¿Estás seguro?',
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    loading = false
}) => {
    
    const getIcon = () => {
        switch (type) {
            case 'danger': return <Trash2 size={32} />;
            case 'warning': return <AlertCircle size={32} />;
            case 'success': return <CheckCircle size={32} />;
            default: return <Info size={32} />;
        }
    };

    const footer = (
        <>
            {cancelText && (
                <button 
                    className="btn-admin-secondary" 
                    onClick={onClose}
                    disabled={loading}
                >
                    {cancelText}
                </button>
            )}
            <button 
                className={`btn-admin-${type === 'danger' ? 'danger' : 'primary'}`} 
                onClick={onConfirm || onClose}
                disabled={loading}
            >
                {loading ? 'Procesando...' : confirmText}
            </button>
        </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title} 
            footer={footer}
            maxWidth="400px"
        >
            <div className="modal-confirm">
                <div className={`confirm-icon ${type}`}>
                    {getIcon()}
                </div>
                <div className="confirm-message">
                    {message}
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
