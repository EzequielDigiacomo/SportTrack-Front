import React, { useState, useEffect } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    Graticule,
    Sphere
} from 'react-simple-maps';
import './WorldGlobe.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WorldGlobe = () => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        let animationFrameId;
        const rotate = () => {
            setRotation(r => (r + 0.5) % 360);
            animationFrameId = requestAnimationFrame(rotate);
        };
        animationFrameId = requestAnimationFrame(rotate);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="globe-container">
            <ComposableMap
                projection="geoOrthographic"
                projectionConfig={{
                    rotate: [-rotation, 30, 0], // Longitude rotation, slight latitude tilt
                    scale: 230 // Scale adjusted to fit within the viewport comfortably
                }}
                style={{ width: "100%", height: "100%" }}
            >
                <defs>
                    <radialGradient id="metal-gradient" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="60%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="globe-shadow">
                        <feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="rgba(0,0,0,0.3)" />
                    </filter>
                </defs>

                {/* Sphere for the globe background (Ocean) */}
                <Sphere stroke="rgba(255,255,255,0.4)" strokeWidth={1} fill="url(#metal-gradient)" />

                {/* Graticule for the grid lines */}
                <Graticule stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />

                {/* Geographies for the continents */}
                <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                        geographies.map((geo) => {
                            // Identify Argentina
                            const isArgentina = geo.id === "032" || geo.properties.name === "Argentina";
                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={isArgentina ? "#0070f3" : "#0f172a"}
                                    stroke="#000"
                                    strokeWidth={0.3}
                                    style={{
                                        default: {
                                            outline: "none",
                                            filter: isArgentina ? "url(#glow)" : "none"
                                        },
                                        hover: { outline: "none" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>
            <div className="globe-overlay-shadow"></div>
        </div>
    );
};

export default WorldGlobe;
