import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AppRoutes  from './routes/AppRoutes.jsx'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx'
import PWAUpdatePrompt from './components/PWAUpdatePrompt/PWAUpdatePrompt.jsx'
import OfflineStatus from './components/OfflineStatus/OfflineStatus.jsx'
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx'
import { useAuthStore } from './store/authStore.js'
import { SYSTEM_THEME_QUERY, useThemeStore } from './store/themeStore.js'
import { cancelarPrefetchOffline, prefetchOfflineData } from './services/offlinePrefetch.js'
import './App.css'

const AUTH_ROUTES = new Set(['/login', '/register', '/primeiro-acesso'])

function App() {
  const initialized = useAuthStore((state) => state.initialized)
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const user = useAuthStore((state) => state.user)
  const syncSystemTheme = useThemeStore((state) => state.syncSystemTheme)
  const { pathname } = useLocation()
  const showFloatingThemeToggle = AUTH_ROUTES.has(pathname.replace(/\/+$/, '') || '/')

  //confere a sessao uma unica vez no arranque: todas as paginas passam a ter
  //o utilizador e as permissoes efetivas disponiveis (sidebar e rotas)
  useEffect(() => {
    if (initialized) return
    checkAuth().catch(() => {})
  }, [initialized, checkAuth])

  // Depois de autenticar, guarda em segundo plano os dados necessarios para
  // as paginas e modais funcionarem sem rede. O prefetch so arranca quando o
  // browser estiver livre e e cancelado se a sessao mudar ou a rede cair.
  useEffect(() => {
    if (!user?.id) return undefined

    let ativo = true

    const iniciar = () => {
      if (!ativo) return
      prefetchOfflineData(user).catch(() => {})
    }

    const usarIdle = typeof window.requestIdleCallback === 'function'
    const identificador = usarIdle
      ? window.requestIdleCallback(iniciar, { timeout: 4000 })
      : window.setTimeout(iniciar, 1200)

    const aoFicarOffline = () => cancelarPrefetchOffline()

    window.addEventListener('online', iniciar)
    window.addEventListener('offline', aoFicarOffline)

    return () => {
      ativo = false
      if (usarIdle) {
        window.cancelIdleCallback?.(identificador)
      } else {
        window.clearTimeout(identificador)
      }
      window.removeEventListener('online', iniciar)
      window.removeEventListener('offline', aoFicarOffline)
      cancelarPrefetchOffline()
    }
  }, [user])

  // O tema inicial e aplicado pelo script inline antes do primeiro paint.
  // Este listener so reage ao sistema enquanto a preferencia for "Sistema".
  useEffect(() => {
    if (!window.matchMedia) return undefined

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)
    const handleChange = () => syncSystemTheme()

    handleChange()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [syncSystemTheme])

  return (
    <>
      <ErrorBoundary>
        <AppRoutes/>
      </ErrorBoundary>
      <div className="app-notification-stack">
        <OfflineStatus/>
        <PWAUpdatePrompt/>
      </div>
      {showFloatingThemeToggle && <ThemeToggle variant="floating" />}
    </>
  )
}

export default App
