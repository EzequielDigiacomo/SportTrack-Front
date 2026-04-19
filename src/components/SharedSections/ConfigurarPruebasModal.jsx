import React, { useState, useEffect } from 'react';
import { CategoriaService, BoteService, DistanciaService, PruebaService } from '../../services/ConfigService';
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

    useEffect(() => {
        const loadData = async () => {
            try {
                const [cats, bts, dists, actuals] = await Promise.all([
                    CategoriaService.getAll(),
                    BoteService.getAll(),
                    DistanciaService.getAll(),
                    PruebaService.getByEvento(evento.id)
                ]);
                setCategorias(cats);
                setBotes(bts);
                setDistancias(dists);
                setPruebasActuales(actuals);
            } catch (e) {
                console.error("Error loading config data", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [evento.id]);

    const resetForm = () => {
        setSelectedCat('');
        setSelectedBote('');
        setSelectedDist('');
        setSelectedSex('');
        setSelectedDate(evento.fecha ? evento.fecha.substring(0, 10) : '');
        setSelectedTime('');
        setEditingId(null);
    };

    const handleAddPrueba = async () => {
        if (!selectedCat || !selectedBote || !selectedDist || !selectedSex || !selectedDate || !selectedTime) {
            alert("Por favor completá todos los campos (incluyendo Fecha y Hora) antes de habilitar la prueba.");
            return false;
        }

        setSaving(true);
        try {
            const sexoMap = {
                'Masculino': 1,
                'Femenino': 2,
                'Mixto': 3
            };

            const [year, month, day] = selectedDate.split('-');
            const [hours, minutes] = selectedTime.split(':');
            const fechaHora = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));

            const payload = {
                categoriaId: parseInt(selectedCat),
                boteId: parseInt(selectedBote),
                distanciaId: parseInt(selectedDist),
                sexoId: sexoMap[selectedSex] || 3,
                fechaHora: fechaHora.toISOString(),
            };

            if (editingId) {
                await PruebaService.updateAssign(editingId, payload);
            } else {
                await PruebaService.assignToEvento(evento.id, null, payload);
            }
            
            // Recargar lista
            const actuals = await PruebaService.getByEvento(evento.id);
            setPruebasActuales(actuals);
            resetForm();
            return true;
        } catch (err) {
            alert("Error al procesar prueba: " + err.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePrueba = async (id) => {
        if (!window.confirm("¿Estás seguro de quitar esta prueba del evento?")) return;
        
        try {
            await PruebaService.deleteAssign(id);
            setPruebasActuales(prev => prev.filter(p => p.id !== id));
            if (editingId === id) {
                resetForm();
            }
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
    };

    const handleEditStart = (ep) => {
        setEditingId(ep.id);
        setSelectedCat(ep.prueba.categoriaId.toString());
        setSelectedBote(ep.prueba.boteId.toString());
        setSelectedDist(ep.prueba.distanciaId.toString());
        setSelectedCat(ep.prueba.categoria.id.toString());
        setSelectedBote(ep.prueba.bote.id.toString());
        setSelectedDist(ep.prueba.distancia.id.toString());
        
        if (ep.prueba.sexo) {
            setSelectedSex(ep.prueba.sexo.nombre); 
        }

        const date = new Date(ep.fechaHora);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setSelectedTime(`${hours}:${minutes}`);
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-AR');
    };

    // Obtener lista de días únicos con pruebas
    const diasUnicos = ['Todos', ...new Set(pruebasActuales.map(ep => {
        const d = new Date(ep.fechaHora);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }))].sort();

    const pruebasFiltradas = pruebasActuales.filter(ep => {
        if (filtroDia === 'Todos') return true;
        const d = new Date(ep.fechaHora);
        const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dayStr === filtroDia;
    });

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF();

            // Header / Membrete
            doc.setFontSize(18);
            doc.setTextColor(20, 110, 180);
            doc.text("CRONOGRAMA OFICIAL DE COMPETENCIA", 14, 22);
            
            const safeEventoNombre = evento?.nombre || evento?.Nombre || 'Evento Deportivo';
            const safeEventoFecha = evento?.fecha ? new Date(evento.fecha).toLocaleDateString('es-AR') : 'A Confirmar';
            const safeEventoUbicacion = evento?.ubicacion || 'A Confirmar';

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text(`Próximo Evento Deportivo: ${safeEventoNombre}`, 14, 30);
            doc.text(`Fecha: ${safeEventoFecha}`, 14, 36);
            doc.text(`Lugar / Pista: ${safeEventoUbicacion}`, 14, 42);

            // Add a line divider
            doc.setDrawColor(200, 200, 200);
            doc.line(14, 45, 196, 45);

            // Subtitle
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text("Este documento detalla el orden de las pruebas planificadas. Sujeto a modificaciones.", 14, 52);

            // Table
            const tableColumn = ["Orden", "Fecha/Hora", "Categoría", "Bote", "Distancia", "Sexo"];
            const tableRows = [];

            [...pruebasFiltradas]
                .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
                .forEach((ep, index) => {
                    const rowData = [
                        (index + 1).toString(),
                        `${formatDate(ep.fechaHora || ep.FechaHora)} ${formatTime(ep.fechaHora || ep.FechaHora)}`,
                        ep.prueba?.categoria?.nombre || '-',
                        ep.prueba?.bote?.tipo || '-',
                        ep.prueba?.distancia?.descripcion || '-',
                        ep.prueba?.sexoNombre || ep.prueba?.sexo?.nombre || 'Mixto'
                    ];
                    tableRows.push(rowData);
                });

            autoTable(doc, {
                startY: 56,
                head: [tableColumn],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    2: { halign: 'left' }
                },
                alternateRowStyles: { fillColor: [248, 249, 250] }
            });

            // Footer
            const finalY = doc.lastAutoTable.finalY || 60;
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Documento generado automáticamente por el Sistema SportTrack.`, 14, finalY + 10);

            doc.save(`Programa_${safeEventoNombre.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Error al generar PDF del cronograma:", error);
            alert("Hubo un error al generar el PDF. Verifica los datos del evento.");
        }
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal glass-effect fade-in">
                <div className="modal-header">
                    <h2>Configurar Pruebas: {evento.nombre}</h2>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="config-scheduler">
                        <div className="config-form glass-effect">
                            <h4>{editingId ? "Editar Prueba" : "Agregar Nueva Prueba"}</h4>
                            <div className="config-grid">
                                <div className="form-field">
                                    <label>Categoría</label>
                                    <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Bote</label>
                                    <select value={selectedBote} onChange={e => setSelectedBote(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {botes.map(b => <option key={b.id} value={b.id}>{b.tipo}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Distancia</label>
                                    <select value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {distancias.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Sexo</label>
                                    <select value={selectedSex} onChange={e => setSelectedSex(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Mixto">Mixto</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Fecha de Prueba</label>
                                    <input 
                                        type="date" 
                                        value={selectedDate} 
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="admin-input-dark"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Hora de la Prueba</label>
                                    <input 
                                        type="time" 
                                        value={selectedTime} 
                                        onChange={e => setSelectedTime(e.target.value)}
                                        className="admin-input-dark"
                                    />
                                </div>
                            </div>
                            <div className="form-actions mt-md">
                                <button className="btn-admin-primary w-100" onClick={handleAddPrueba} disabled={saving}>
                                    {saving ? "Procesando..." : (editingId ? "Guardar Cambios" : "+ Habilitar Prueba")}
                                </button>
                                {editingId && (
                                    <button className="btn-admin-secondary w-100 mt-sm" onClick={resetForm}>
                                        Cancelar Edición
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="current-pruebas glass-effect">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <h4 style={{ margin: 0 }}>Pruebas Habilitadas ({pruebasFiltradas.length})</h4>
                                    <select 
                                        value={filtroDia} 
                                        onChange={e => setFiltroDia(e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--color-bg)', color: '#fff', border: '1px solid var(--color-border)' }}
                                    >
                                        {diasUnicos.map(d => (
                                            <option key={d} value={d}>
                                                {d === 'Todos' ? 'Todos los días' : new Date(d + 'T00:00:00').toLocaleDateString('es-AR')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button className="btn-admin-secondary flex-row gap-sm" onClick={handleExportPDF} style={{ padding: '5px 15px', color: '#fff', borderColor: 'var(--color-info)', background: 'rgba(52, 152, 219, 0.2)' }}>
                                    📄 Exportar Programa PDF
                                </button>
                            </div>
                            <div className="pruebas-list">
                                {loading ? <div className="loader"></div> : (
                                    pruebasFiltradas.length > 0 ? (
                                        <table className="mini-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Categoría</th>
                                                    <th>Bote</th>
                                                    <th>Distancia</th>
                                                    <th>Sexo</th>
                                                    <th>Fecha/Hora</th>
                                                    <th>Inscritos</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...pruebasFiltradas]
                                                    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
                                                    .map((ep, idx) => (
                                                    <tr key={ep.id} className={editingId === ep.id ? "row-editing" : ""}>
                                                        <td>{idx + 1}</td>
                                                        <td>{ep.prueba?.categoria?.nombre}</td>
                                                        <td>{ep.prueba?.bote?.tipo}</td>
                                                        <td>{ep.prueba?.distancia?.descripcion}</td>
                                                        <td>{ep.prueba?.sexoNombre || ep.prueba?.sexo?.nombre || 'Mixto'}</td>
                                                        <td className="time-cell">
                                                            <div>{formatDate(ep.fechaHora)}</div>
                                                            <div style={{ color: 'var(--color-info)' }}>{formatTime(ep.fechaHora)}</div>
                                                        </td>
                                                        <td className="count-cell">
                                                            <span className={`count-badge ${ep.cantidadInscritos > 0 ? 'has-data' : ''}`}>
                                                                {ep.cantidadInscritos}
                                                            </span>
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
                                                                className="btn-icon-danger" 
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
        </div>
    );
};

export default ConfigurarPruebasModal;
