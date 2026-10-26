import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AppRoutes  from './routes/AppRoutes.jsx'
import PWAUpdatePrompt from './components/PWAUpdatePrompt/PWAUpdatePrompt.jsx'
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx'
import { useAuthStore } from './store/authStore.js'
import { SYSTEM_THEME_QUERY, useThemeStore } from './store/themeStore.js'
import './App.css'

const AUTH_ROUTES = new Set(['/login', '/register', '/primeiro-acesso'])

function App() {
  const { initialized, checkAuth } = useAuthStore()
  const syncSystemTheme = useThemeStore((state) => state.syncSystemTheme)
  const { pathname } = useLocation()
  const showFloatingThemeToggle = AUTH_ROUTES.has(pathname.replace(/\/+$/, '') || '/')

  //confere a sessao uma unica vez no arranque: todas as paginas passam a ter
  //o utilizador e as permissoes efetivas disponiveis (sidebar e rotas)
  useEffect(() => {
    if(!initialized){
      checkAuth()
    }
  }, [initialized, checkAuth])

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
      <AppRoutes/>
      <PWAUpdatePrompt/>
      {showFloatingThemeToggle && <ThemeToggle variant="floating" />}
    </>
  )
}

export default App
