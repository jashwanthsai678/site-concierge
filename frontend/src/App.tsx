import { QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { queryClient } from '@/services/queryClient'
import { AdSimulatorPage } from '@/pages/AdSimulatorPage'
import { CompanyWebsitePage } from '@/pages/CompanyWebsitePage'
import { DashboardPage } from '@/pages/DashboardPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/demo" replace />} />
          <Route path="/demo" element={<AdSimulatorPage />} />
          <Route path="/site/:slug" element={<CompanyWebsitePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
