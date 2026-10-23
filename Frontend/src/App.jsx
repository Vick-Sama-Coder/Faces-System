import { useEffect } from 'react'
import AppRoutes  from './routes/AppRoutes.jsx'
import { useAuthStore } from './store/authStore.js'
import './App.css'




function App() {
  const { initialized, checkAuth } = useAuthStore()

  //confere a sessao uma unica vez no arranque: todas as paginas passam a ter
  //o utilizador e as permissoes efetivas disponiveis (sidebar e rotas)
  useEffect(() => {
    if(!initialized){
      checkAuth()
    }
  }, [initialized, checkAuth])

  return (
    <AppRoutes/>
  )
}

export default App
