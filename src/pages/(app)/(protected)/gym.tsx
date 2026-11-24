/** The PyForge trainer. Signed-in only: progress and AI grading are per user. */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PyForgeApp from '../../../pyforge/App'

export default function GymPage() {
  const navigate = useNavigate()
  // After OAuth the platform returns here; forward to a room invite the user had opened.
  useEffect(() => {
    try {
      const to = sessionStorage.getItem('pyforge.returnTo')
      sessionStorage.removeItem('pyforge.returnTo')
      if (to?.startsWith('/room/')) navigate(to, { replace: true })
    } catch { /* private mode */ }
  }, [navigate])
  return <PyForgeApp />
}
