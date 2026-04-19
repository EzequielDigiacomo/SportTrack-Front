import React from 'react';
import { Search } from 'lucide-react';

const SearchBox = ({ 
    placeholder = "Buscar...", 
    value, 
    onChange, 
    className = "" 
}) => {
    return (
        <div className={`admin-search-row ${className}`} style={{ width: '100%' }}>
            <div className="search-input-wrapper main-search">
                <i><Search size={18} /></i>
                <input 
                    type="text" 
                    placeholder={placeholder} 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default SearchBox;
