import React from 'react';
import { ArrowLeft, CheckCircle2, Circle, MessageSquare } from 'lucide-react';
import { pick } from '../../utils/apiHelpers';
import './CampanaDetalle.css';

const pickNum = (obj, ...keys) => {
    const value = pick(obj, ...keys);
    return value != null ? Number(value) : null;
};

const pickStr = (obj, ...keys) => pick(obj, ...keys) ?? '';

const formatFecha = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const CampanaDetalle = ({ campana, onBack, onOpenHilo }) => {
    if (!campana) return null;

    const hilos = campana.hilos || campana.Hilos || [];
    const leidos = hilos.filter((h) => h.leido ?? h.Leido).length;
    const respondidos = hilos.filter((h) => h.respondido ?? h.Respondido).length;

    return (
        <div className="campana-detalle fade-in">
            <button type="button" className="btn-admin-secondary" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
                <ArrowLeft size={16} />
                Volver a comunicados
            </button>

            <div className="campana-detalle-header">
                <h3>{pickStr(campana, 'asunto', 'Asunto')}</h3>
                <p>
                    Enviado {formatFecha(pick(campana, 'enviadoEn', 'EnviadoEn'))} ·{' '}
                    {pickNum(campana, 'cantidadDestinatarios', 'CantidadDestinatarios') || hilos.length} destinatarios
                </p>
                <div className="campana-stats">
                    <span>{leidos} leídos</span>
                    <span>{respondidos} respondieron</span>
                    <span>{hilos.length - leidos} sin leer</span>
                </div>
            </div>

            <div className="campana-cuerpo">
                <strong>Mensaje enviado</strong>
                <p>{pickStr(campana, 'cuerpo', 'Cuerpo')}</p>
                <small>Cada destinatario responde en su hilo privado (no es un chat grupal).</small>
            </div>

            <div className="campana-hilos-table">
                <div className="campana-hilos-head">
                    <span>Destinatario</span>
                    <span>Estado</span>
                    <span></span>
                </div>
                {hilos.map((hilo) => {
                    const hiloId = pickNum(hilo, 'hiloId', 'HiloId');
                    const leido = Boolean(hilo.leido ?? hilo.Leido);
                    const respondido = Boolean(hilo.respondido ?? hilo.Respondido);
                    return (
                        <div key={hiloId} className="campana-hilos-row">
                            <div>
                                <strong>{pickStr(hilo, 'destinatarioNombre', 'DestinatarioNombre')}</strong>
                                <small> @{pickStr(hilo, 'destinatarioUsername', 'DestinatarioUsername')}</small>
                            </div>
                            <div className="campana-estado">
                                {leido ? (
                                    <span className="ok"><CheckCircle2 size={14} /> Leído</span>
                                ) : (
                                    <span className="pending"><Circle size={14} /> Sin leer</span>
                                )}
                                {respondido && (
                                    <span className="ok"><MessageSquare size={14} /> Respondió</span>
                                )}
                            </div>
                            <button
                                type="button"
                                className="btn-admin-secondary"
                                onClick={() => onOpenHilo(hiloId)}
                            >
                                Ver hilo
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CampanaDetalle;
