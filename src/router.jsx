import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import RequireAuth from './routes/RequireAuth'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Analytics from './components/Analytics.jsx'
import EnhancedDispatch from './components/EnhancedDispatch.jsx'
import AccountManagement from './components/AccountManagement.jsx'
import VoIPManagement from './components/VoIPManagement.jsx'
import EmergencyContactsManagement from './components/EmergencyContactsManagement.jsx'
import ViewReport from './components/ViewReport.jsx'
import CrimeReportForm from './components/CrimeReportForm.jsx'
import FirestoreReports from './components/FirestoreReports.jsx'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

function ViewReportRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine alert type based on the URL path
  const alertType = location.pathname.startsWith('/sos-alert/') ? 'sos' : 'crime'
  
  return <ViewReport reportId={id} alertType={alertType} onBackToDashboard={() => navigate('/')} />
}

function DashboardRoute() {
  const navigate = useNavigate()
  return (
    <Dashboard 
      onNavigateToReport={(reportId) => navigate(`/report/${reportId}`)}
      onNavigateToSOSAlert={(alertId) => navigate(`/sos-alert/${alertId}`)}
      onNavigateToFirestoreReports={() => navigate('/firestore-reports')}
    />
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <Login onLoginSuccess={() => {}} /> },
  { path: '/unauthorized', element: <div className="p-6">Unauthorized</div> },
  {
    path: '/',
        element: (
          <RequireAuth roles={['SuperAdmin','Dispatcher','Analyst','admin']}>
            <AppLayout />
          </RequireAuth>
        ),
    children: [
      { index: true, element: <DashboardRoute /> },
      { path: 'report/:id', element: <ViewReportRoute /> },
      { path: 'sos-alert/:id', element: <ViewReportRoute /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'dispatch', element: <EnhancedDispatch /> },
      { path: 'voip', element: <VoIPManagement /> },
      { path: 'emergency-contacts', element: <EmergencyContactsManagement /> },
      { path: 'crime-report', element: <CrimeReportForm /> },
      { path: 'firestore-reports', element: <FirestoreReports /> },
      {
        path: 'accounts',
        element: <AccountManagement />
      },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}


