import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

const Toast = ({ id, type, message, duration, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(id);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onRemove]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="toast-icon" size={20} />;
            case 'error': return <AlertCircle className="toast-icon" size={20} />;
            case 'warning': return <AlertTriangle className="toast-icon" size={20} />;
            default: return <Info className="toast-icon" size={20} />;
        }
    };

    return (
        <div className={`toast toast-${type} fade-in`}>
            {getIcon()}
            <div className="toast-content">{message}</div>
            <button className="toast-close" onClick={() => onRemove(id)}>
                <X size={16} />
            </button>
            <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onRemove={removeToast} />
            ))}
        </div>
    );
};

export default ToastContainer;
