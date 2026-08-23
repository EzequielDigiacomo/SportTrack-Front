import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App.jsx'
import './index.css'

import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import TelemetryService from './services/TelemetryService'
import { initAuditActionQueue } from './services/auditActionQueue'
import { repairPendingTimingAuditGaps } from './services/timingAuditRepair'
import { initPlatformDetection, isNativePlatform } from './utils/platformUtils'

TelemetryService.init();
initAuditActionQueue();
repairPendingTimingAuditGaps();
initPlatformDetection();

async function setupNativeChrome() {
    if (!isNativePlatform()) return
    try {
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setBackgroundColor({ color: '#0a0c12' })
        await StatusBar.setStyle({ style: Style.Dark })
    } catch (_) {
        // web / plugin no disponible
    }
}

setupNativeChrome().finally(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <ThemeProvider>
                        <ToastProvider>
                            <App />
                        </ToastProvider>
                    </ThemeProvider>
                </AuthProvider>
            </BrowserRouter>
        </React.StrictMode>,
    )
})
