import { Link } from 'react-router-dom';
import { LayoutDashboard, Mail, Globe, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathForRole, getUserRole } from '../../utils/authHelpers';
import './AppFooter.css';

const AppFooter = () => {
    const { user } = useAuth();

    const dashboardPath = user
        ? getDashboardPathForRole(getUserRole(user))
        : '/login';

    return (
        <footer className="app-footer" aria-label="Pie de página">
            <div className="app-footer-inner">
                {user ? (
                    <Link to={dashboardPath} className="app-footer-action-btn">
                        <LayoutDashboard size={18} aria-hidden="true" />
                        Ir al panel
                    </Link>
                ) : (
                    <Link to="/login" className="app-footer-action-btn">
                        <LogIn size={18} aria-hidden="true" />
                        Acceder
                    </Link>
                )}

                <div className="app-footer-brand">
                    <strong>SportTrack</strong>
                    <span>·</span>
                    <a
                        href="https://dgotech.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="app-footer-company"
                    >
                        DGOTECH
                    </a>
                </div>

                <div className="app-footer-contact-group">
                    <a
                        href="https://dgotech.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="app-footer-contact"
                    >
                        <Globe size={14} aria-hidden="true" />
                        dgotech.org
                    </a>
                    <a href="mailto:dgotech13@gmail.com" className="app-footer-contact">
                        <Mail size={14} aria-hidden="true" />
                        dgotech13@gmail.com
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
