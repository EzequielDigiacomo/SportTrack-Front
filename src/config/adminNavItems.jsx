import React from 'react';
import {
    LayoutDashboard,
    Calendar,
    Building2,
    Key,
    Users,
    Timer,
    Settings,
    Terminal as TerminalIcon,
    Cloud,
    CreditCard,
    FileText,
    Globe,
    Mail,
    ClipboardList,
    Database,
    Activity,
    History,
} from 'lucide-react';
import { canAccessControlesLive, extractPlanFromUser } from '../utils/planHelpers';

export const ADMIN_NAV_ITEMS = [
    { id: 'inicio', path: '', icon: <LayoutDashboard size={20} />, label: 'Inicio', exact: true },
    { id: 'actividad-eventos', path: 'actividad-eventos', icon: <History size={20} />, label: 'Actividad por evento' },
    { id: 'federaciones', path: 'federaciones', icon: <Globe size={20} />, label: 'Federaciones' },
    { id: 'mensajes', path: 'mensajes', icon: <Mail size={20} />, label: 'Mensajes' },
    { id: 'atletas', path: 'atletas', icon: <Users size={20} />, label: 'Atletas' },
    { id: 'clubes', path: 'clubes', icon: <Building2 size={20} />, label: 'Clubes' },
    { id: 'eventos', path: 'eventos', icon: <Calendar size={20} />, label: 'Eventos' },
    { id: 'registro-inscripciones', path: 'registro-inscripciones', icon: <ClipboardList size={20} />, label: 'Registro Inscripciones' },
    { id: 'pagos', path: 'pagos', icon: <CreditCard size={20} />, label: 'Control de Pagos' },
    { id: 'controles', path: 'controles', icon: <Timer size={20} />, label: 'Controles Técnicos' },
    { id: 'logins', path: 'logins', icon: <Key size={20} />, label: 'Logins/Usuarios' },
    { id: 'resultados', path: 'resultados', icon: <Timer size={20} />, label: 'Resultados' },
    { id: 'auditoria', path: 'auditoria', icon: <FileText size={20} />, label: 'Auditoría Progresión' },
    { id: 'audiencia', path: 'audiencia', icon: <Activity size={20} />, label: 'Audiencia / Picos', superOnly: true },
    { id: 'jueces', path: '/jueces', icon: <Timer size={20} />, label: 'Cronometraje (Jueces)', isExternal: true, requiereControlesLive: true },
    { id: 'saas', path: 'saas', icon: <Cloud size={20} />, label: 'Suscripciones SaaS', isSupport: true },
    { id: 'backups', path: 'backups', icon: <Database size={20} />, label: 'Backups DB', isSupport: true },
    { id: 'configuracion', path: 'configuracion', icon: <Settings size={20} />, label: 'Configuración' },
    { id: 'soporte', path: 'soporte', icon: <TerminalIcon size={20} />, label: 'Auditoría / Logs', isSupport: true },
];

export const filterAdminNavItems = (user, { hasUnread = false } = {}) => {
    const role = user?.rol?.trim().toLowerCase();
    const isSuper = role === 'superadmin' || user?.username === 'soporte_tecnico';
    const plan = extractPlanFromUser(user);

    return ADMIN_NAV_ITEMS.filter((item) => {
        if (
            item.id === 'saas'
            || item.id === 'soporte'
            || item.id === 'backups'
            || item.id === 'configuracion'
            || item.id === 'federaciones'
            || item.id === 'audiencia'
            || item.superOnly
        ) {
            return isSuper;
        }

        if (item.requiereControlesLive && !isSuper && !canAccessControlesLive(plan)) {
            return false;
        }

        return true;
    }).map((item) => (
        item.id === 'mensajes'
            ? { ...item, showDot: hasUnread }
            : item
    ));
};
