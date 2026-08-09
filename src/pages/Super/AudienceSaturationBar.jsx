import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import AudienceService from '../../services/AudienceService';
import './sections/AudiencePeaksSection.css';

const AudienceSaturationBar = () => {
    const [live, setLive] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const data = await AudienceService.getLive();
                if (!cancelled) setLive(data);
            } catch {
                if (!cancelled) setLive(null);
            }
        };

        load();
        const id = setInterval(load, 8000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    if (!live) return null;

    const pct = live.saturationPercent ?? 0;
    const level = live.saturationLevel || 'ok';

    return (
        <div className={`audience-sat-widget glass-effect audience-level-${level === 'critical' ? 'critical' : level === 'warning' ? 'warning' : 'ok'}`}>
            <div className="audience-sat-widget-top">
                <div className="audience-live-title">
                    <Activity size={18} />
                    <span>Saturación de audiencia (SignalR)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <strong>{pct}%</strong>
                    <Link to="/super/audiencia">Ver picos</Link>
                </div>
            </div>
            <div className="audience-bar-track">
                <div className="audience-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="audience-sat-meta">
                <span>{live.totalConnections} / {live.softCapacity} conectados</span>
                <span>Live: {live.liveConnections}</span>
                <span>Operadores: {live.operatorConnections}</span>
                <span>Pico sesión: {live.sessionPeakTotal}</span>
                {live.planLabel && <span>Plan ref: {live.planLabel}</span>}
            </div>
        </div>
    );
};

export default AudienceSaturationBar;
