import { useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import NotificationsBell from '../components/NotificationsBell'

export default function Header({ onNavigateToReport }) {
  const { user, claims } = useAuth()

  // Set fixed black and white theme
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('bw-theme')
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1">
        </div>
        
        <div className="flex items-center gap-4" style={{ position: 'relative', zIndex: 50 }}>
          <NotificationsBell />
          
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
              <img 
                src="/Admin-E-Responde.png" 
                alt="E-Responde Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold text-black">{claims?.role || 'Administrator'}</div>
              <div className="text-xs text-gray-500">{user?.email || 'admin@e-responde.ph'}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}