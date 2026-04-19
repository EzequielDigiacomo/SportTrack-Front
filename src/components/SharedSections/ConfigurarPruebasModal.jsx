import React, { useState, useEffect } from 'react';
import { CategoriaService, BoteService, DistanciaService, PruebaService } from '../../services/ConfigService';
import ConfirmDialog from '../Common/ConfirmDialog';
import './ConfigurarPruebas.css';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ConfigurarPruebasModal = ({ evento, onClose, onRefresh }) => {
    const [categorias, setCategorias] = useState([]);
    const [botes, setBotes] = useState([]);
    const [distancias, setDistancias] = useState([]);
    const [pruebasActuales, setPruebasActuales] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para el formulario
    const [selectedCat, setSelectedCat] = useState('');
    const [selectedBote, setSelectedBote] = useState('');
    const [selectedDist, setSelectedDist] = useState('');
    const [selectedSex, setSelectedSex] = useState('');
    const [selectedDate, setSelectedDate] = useState(evento.fecha ? evento.fecha.substring(0, 10) : '');
    const [selectedTime, setSelectedTime] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Filtro visual por día
    const [filtroDia, setFiltroDia] = useState('Todos');

    // Estado para edición
    const [editingId, setEditingId] = useState(null);

    // Estado para modales de alerta/confirmación
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'warning',
        title: '',
        message: '',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        onConfirm: null
    });


    useEffect(() => {
        const loadData = async () => {
            try {
                const [cats, bts, dists, actuals] = await Promise.all([
                    CategoriaService.getAll(),
                    BoteService.getAll(),
                    DistanciaService.getAll(),
                    PruebaService.getByEvento(evento.id)
                ]);
                setCategorias(c);
                setBotes(b);
                setDistancias(d);
                setPruebasActuales(current);
                
                if (evento.fecha) {
                    setSelectedDate(evento.fecha.substring(0, 10));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [evento]);

    const resetForm = () => {
        setSelectedCat('');
        setSelectedBote('');
        setSelectedDist('');
        setSelectedSex('');
        setSelectedTime('');
        setEditingId(null);
    };

    const handleAddPrueba = async () => {
        if (!selectedCat || !selectedBote || !selectedDist || !selectedSex || !selectedDate || !selectedTime) {
            setModalConfig({
                show: true,
                type: 'warning',
                title: 'Campos Incompletos',
                message: 'Por favor completá todos los campos antes de habilitar la prueba.',
                confirmText: 'Entendido',
                cancelText: null
            });
            return false;
        }

        setSaving(true);
        try {
            const fechaHora = `${selectedDate}T${selectedTime}:00`;
            const payload = {
                eventoId: evento.id,
                categoriaId: parseInt(selectedCat),
                boteId: parseInt(selectedBote),
                distanciaId: parseInt(selectedDist),
                sexoNombre: selectedSex,
                fechaHora
            };

            if (editingId) {
                await PruebaService.updateAssign(editingId, payload);
            } else {
                await PruebaService.assign(payload);
            }
            
            const updated = await PruebaService.getByEvento(evento.id);
            setPruebasActuales(updated);
            resetForm();
            return true;
        } catch (err) {
            setModalConfig({
                show: true,
                type: 'danger',
                title: 'Error',
                message: 'Hubo un error al procesar la prueba: ' + err.message,
                confirmText: 'Cerrar',
                cancelText: null
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePrueba = (id) => {
        setModalConfig({
            show: true,
            type: 'danger',
            title: 'Quitar Prueba',
            message: '¿Estás seguro de quitar esta prueba del evento?',
            confirmText: 'Sí, Quitar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                try {
                    await PruebaService.deleteAssign(id);
                    setPruebasActuales(prev => prev.filter(p => p.id !== id));
                    if (editingId === id) resetForm();
                    setModalConfig(prev => ({ ...prev, show: false }));
                } catch (err) {
                    setModalConfig({ show: true, type: 'danger', title: 'Error', message: err.message, confirmText: 'Cerrar', cancelText: null });
                }
            }
        });
    };

    const handleEditStart = (ep) => {
        if (!ep || !ep.prueba) return;
        setEditingId(ep.id);
        
        const catId = ep.prueba.categoriaId || ep.prueba.categoria?.id;
        const botId = ep.prueba.boteId || ep.prueba.bote?.id;
        const distId = ep.prueba.distanciaId || ep.prueba.distancia?.id;

        setSelectedCat(catId ? catId.toString() : '');
        setSelectedBote(botId ? botId.toString() : '');
        setSelectedDist(distId ? distId.toString() : '');
        setSelectedSex(ep.prueba.sexo?.nombre || ep.prueba.sexoNombre || '');
        
        const date = new Date(ep.fechaHora);
        if (!isNaN(date.getTime())) {
            setSelectedDate(getISODatePart(ep.fechaHora));
            setSelectedTime(date.toTimeString().substring(0, 5));
        }
    };

    const diasUnicos = ['Todos', ...new Set(pruebasActuales.map(ep => getISODatePart(ep.fechaHora)))].sort();

    const pruebasFiltradas = pruebasActuales.filter(ep => {
        if (filtroDia === 'Todos') return true;
        return getISODatePart(ep.fechaHora) === filtroDia;
    });

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();
            const ECU_RED = [239, 51, 64];
            doc.setFontSize(20);
            doc.setTextColor(ECU_RED[0], ECU_RED[1], ECU_RED[2]);
            doc.text("CRONOGRAMA OFICIAL DE COMPETENCIA", 14, 22);
            
            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text(`Evento: ${evento?.nombre || 'Evento'}`, 14, 30);
            doc.text(`Fecha: ${formatDate(evento?.fecha)}`, 14, 37);
            doc.text(`Lugar / Pista: ${evento?.ubicacion || 'A Confirmar'}`, 14, 44);

            const sortedPruebas = [...pruebasActuales].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            const tableData = sortedPruebas.map((ep, index) => [
                index + 1,
                formatTime(ep.fechaHora),
                formatDate(ep.fechaHora),
                ep.prueba?.categoria?.nombre || ep.prueba?.categoriaNombre || '',
                ep.prueba?.bote?.nombre || ep.prueba?.boteNombre || '',
                `${ep.prueba?.distancia?.metros || ep.prueba?.distanciaMetros || ''}m`,
                ep.prueba?.sexo?.nombre || ep.prueba?.sexoNombre || ''
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['N°', 'Hora', 'Día', 'Categoría', 'Bote', 'Distancia', 'Rama']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [0, 107, 182] }
            });

            doc.save(`Programa_${(evento?.nombre || 'Evento').replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            setModalConfig({ show: true, type: 'danger', title: 'Error PDF', message: 'Error al generar PDF: ' + error.message, confirmText: 'Aceptar', cancelText: null });
        }
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal-content large glass-effect fade-in">
                <div className="modal-header">
                    <h3>Configurar Pruebas - {evento.nombre}</h3>
                    <div className="flex-row gap-sm">
                        <button className="btn-admin-secondary" onClick={handleExportPDF}>📄 Exportar PDF</button>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>
                </div>

                <div className="modal-body overflow-y">
                    <div className="admin-grid-layout">
                        {/* FORMULARIO DE ASIGNACIÓN */}
                        <div className="form-column">
                            <h4 className="section-title">{editingId ? 'Editar Prueba' : 'Agregar Nueva Prueba'}</h4>
                            <div className="admin-grid-form">
                                <div className="form-group">
                                    <label>Categoría</label>
                                    <select className="admin-select" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Bote</label>
                                    <select className="admin-select" value={selectedBote} onChange={e => setSelectedBote(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {botes.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Distancia</label>
                                    <select className="admin-select" value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {distancias.map(d => <option key={d.id} value={d.id}>{d.metros}m</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Rama / Sexo</label>
                                    <select className="admin-select" value={selectedSex} onChange={e => setSelectedSex(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Mixto">Mixto</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Día</label>
                                        <input type="date" className="admin-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Hora</label>
                                        <input type="time" className="admin-input" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-actions mt-md">
                                    {editingId && <button className="btn-admin-secondary flex-1" onClick={resetForm}>Cancelar</button>}
                                    <button 
                                        className="btn-admin-primary flex-2" 
                                        onClick={handleAddPrueba}
                                        disabled={saving}
                                    >
                                        {saving ? 'Procesando...' : (editingId ? 'Actualizar Prueba' : 'Habilitar Prueba')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LISTADO DE PRUEBAS */}
                        <div className="list-column">
                            <div className="flex-between mb-md">
                                <h4 className="section-title">Pruebas Habilitadas</h4>
                                <select className="admin-select-sm" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                                    {diasUnicos.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="table-container-mini">
                                {loading ? (
                                    <div className="loader-container"><div className="loader"></div></div>
                                ) : (
                                    pruebasFiltradas.length > 0 ? (
                                        <table className="admin-table mini">
                                            <thead>
                                                <tr>
                                                    <th>Hora</th>
                                                    <th>Prueba</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pruebasFiltradas.sort((a,b) => new Date(a.fechaHora) - new Date(b.fechaHora)).map(ep => (
                                                    <tr key={ep.id} className={editingId === ep.id ? 'row-editing' : ''}>
                                                        <td><strong>{new Date(ep.fechaHora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong></td>
                                                        <td>
                                                            <div className="prueba-desc-mini">
                                                                {ep.prueba?.categoria?.nombre} {ep.prueba?.bote?.nombre} {ep.prueba?.distancia?.metros}m {ep.prueba?.sexo?.nombre}
                                                            </div>
                                                        </td>
                                                        <td className="actions-cell">
                                                            <button 
                                                                className="btn-icon-admin" 
                                                                title="Editar"
                                                                onClick={() => handleEditStart(ep)}
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="btn-icon-delete" 
                                                                title="Eliminar"
                                                                onClick={() => handleDeletePrueba(ep.id)}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="empty-text">No hay pruebas habilitadas aún para este evento.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-admin-secondary" onClick={onClose}>Cerrar sin recargar</button>
                    <button className="btn-admin-primary" onClick={async () => {
                        if (selectedCat || selectedBote || selectedDist || selectedSex || selectedTime) {
                            const success = await handleAddPrueba();
                            if (!success) return; 
                        }
                        onRefresh();
                        onClose();
                    }}>Finalizar y Actualizar</button>
                </div>
            </div>

            <ConfirmDialog 
                isOpen={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
                onConfirm={modalConfig.onConfirm}
                onClose={() => setModalConfig(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
};


export default ConfigurarPruebasModal;
