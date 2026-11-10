import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import EventoService from '../../../services/EventoService';
import CorregirTripulacionesPanel from '../../../components/SharedSections/CorregirTripulacionesPanel';
import '../../../components/SharedSections/AdminSections.css';

const CorregirTripulacionesSection = () => {
    const { user } = useAuth();
    const clubId = user?.clubId ?? user?.ClubId;
    const [eventos, setEventos] = useState([]);
    const [eventoId, setEventoId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await EventoService.getProximos();
                setEventos(data || []);
                if (data?.length) setEventoId(String(data[0].id));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const evento = eventos.find((e) => String(e.id) === String(eventoId));
    const cambiosAbiertos = evento?.cambiosDelegadosAbiertos
        ?? evento?.CambiosDelegadosAbiertos
        ?? true;

    if (loading) return <div className="loader-container"><div className="loader" /></div>;

    return (
        <div>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
                <h2>Corregir tripulaciones</h2>
                <p className="subtitle">Antes de la reunión de delegados: reemplazá remadores del mismo club.</p>
            </div>
            <div className="form-group" style={{ maxWidth: 420, marginBottom: '1.25rem' }}>
                <label>Evento</label>
                <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                    {eventos.map((e) => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                </select>
            </div>
            {eventoId && clubId ? (
                <CorregirTripulacionesPanel
                    eventoId={Number(eventoId)}
                    clubId={Number(clubId)}
                    cambiosAbiertos={!!cambiosAbiertos}
                />
            ) : (
                <div className="empty-activity">Seleccioná un evento.</div>
            )}
        </div>
    );
};

export default CorregirTripulacionesSection;
