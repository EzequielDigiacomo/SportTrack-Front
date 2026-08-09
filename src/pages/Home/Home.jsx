import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import EventoService from '../../services/EventoService'
import SaaSService from '../../services/SaaSService'
import { applyCatalogPrices } from '../../utils/plansCatalogDisplay'
import { plansDataBase } from './sections/plansData'
import HomeHero from './sections/HomeHero'
import HomeFeatures from './sections/HomeFeatures'
import HomeUltimoEvento from './sections/HomeUltimoEvento'
import HomePlanes from './sections/HomePlanes'
import HomeContacto from './sections/HomeContacto'
import HomeFooter from './sections/HomeFooter'
import './Home.css'

function Home() {
  const { isAuthenticated, user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [ultimoEvento, setUltimoEvento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('sporttrack')
  const [nivelInteres, setNivelInteres] = useState('')
  const [plansData, setPlansData] = useState(plansDataBase)

  useEffect(() => {
    setLoading(true)
    EventoService.getAll()
      .then((eventos) => {
        const finalizados = eventos.filter((e) => e.estado === 'Finalizado')
        if (finalizados.length > 0) {
          setUltimoEvento(finalizados[finalizados.length - 1])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    SaaSService.getPlanes()
      .then((planes) => {
        if (!cancelled) setPlansData(applyCatalogPrices(plansDataBase, planes))
      })
      .catch((err) => {
        console.warn('No se pudieron cargar precios del catálogo; se usan valores locales.', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleClubAccess = () => {
    if (isAuthenticated && user?.rol === 'Club') navigate('/club')
    else navigate('/login')
  }

  const selectNivel = (nivel) => {
    setNivelInteres(nivel)
    setTimeout(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="home-page fade-in">
      <HomeHero isAuthenticated={isAuthenticated} onClubAccess={handleClubAccess} />
      <HomeFeatures />
      <HomeUltimoEvento loading={loading} ultimoEvento={ultimoEvento} />
      <HomePlanes
        plansData={plansData}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        onSelectNivel={selectNivel}
        tabs={['sporttrack', 'duo']}
      />
      <HomeContacto
        nivelInteres={nivelInteres}
        setNivelInteres={setNivelInteres}
        onSubmit={() => addToast('success', '¡Mensaje enviado! Nos contactaremos pronto.')}
      />
      <HomeFooter />
    </div>
  )
}

export default Home
