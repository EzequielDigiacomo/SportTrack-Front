import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import TelemetryService from './services/TelemetryService'

// Inicializar captura de errores global
TelemetryService.init();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
