import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

const CustomSelect = ({ options, value, onChange, placeholder, className = '', required = false, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || null;

    return (
        <div className={`custom-select-container ${className}`} ref={selectRef}>
            {/* Native select for form submission and validation */}
            <select
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                style={{
                    position: 'absolute',
                    opacity: 0,
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                    bottom: 0,
                    left: 0
                }}
                tabIndex={-1}
            >
                <option value="" disabled>{placeholder || 'Seleccionar...'}</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                ))}
            </select>

            <div 
                className={`custom-select-trigger ${!selectedOption && required ? 'invalid' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }
                }}
            >
                <span>{selectedOption ? selectedOption.label : (placeholder || 'Seleccionar...')}</span>
                <ChevronDown size={16} style={{ 
                    transition: 'transform 0.2s', 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: 'var(--color-text-muted)'
                }} />
            </div>

            <div className={`custom-select-dropdown ${isOpen ? '' : 'hidden'}`}>
                {options.map((opt) => (
                    <div 
                        key={opt.value} 
                        className={`custom-select-option ${value === opt.value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (opt.disabled) return;
                            onChange(opt.value);
                            setIsOpen(false);
                        }}
                    >
                        {opt.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomSelect;
