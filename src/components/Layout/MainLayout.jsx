import { useLocation } from 'react-router-dom'
import { isNativePlatform } from '../../utils/platformUtils'
import Navbar from './Navbar'

function MainLayout({ children }) {
    const location = useLocation()
    const isLogin = location.pathname === '/login'
    const hideNavbarOnLogin = isLogin && isNativePlatform()

    return (
        <div className={`app-container${hideNavbarOnLogin ? ' app-container--login' : ''}`}>
            {!hideNavbarOnLogin && <Navbar />}
            <main className={`main-content${hideNavbarOnLogin ? ' main-content--login' : ''}`}>
                {children}
            </main>
        </div>
    )
}

export default MainLayout
