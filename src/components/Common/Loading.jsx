import './Loading.css'

function Loading({ size = 'medium', message = 'Cargando...' }) {
    return (
        <div className="loading-container">
            <div className={`spinner spinner-${size}`}></div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    )
}

export default Loading
