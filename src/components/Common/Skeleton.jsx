import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, variant = 'rect', className = '' }) => {
    const style = {
        width: width,
        height: height,
    };

    return (
        <div 
            className={`skeleton skeleton-${variant} ${className}`} 
            style={style}
        />
    );
};

export default Skeleton;
