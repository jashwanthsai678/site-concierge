import { QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { queryClient } from '@/services/queryClient'
import { AdSimulatorPage } from '@/pages/AdSimulatorPage'
import { CompanyWebsiteLayout } from '@/pages/CompanyWebsiteLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { HomePage } from '@/pages/company-site/HomePage'
import { DestinationsPage } from '@/pages/company-site/DestinationsPage'
import { PricingPage } from '@/pages/company-site/PricingPage'
import { ProcessPage } from '@/pages/company-site/ProcessPage'
import { WhyUsPage } from '@/pages/company-site/WhyUsPage'
import { TestimonialsPage } from '@/pages/company-site/TestimonialsPage'
import { FaqPage } from '@/pages/company-site/FaqPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/demo" replace />} />
          <Route path="/demo" element={<AdSimulatorPage />} />
          <Route path="/site/:slug" element={<CompanyWebsiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="destinations" element={<DestinationsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="process" element={<ProcessPage />} />
            <Route path="why-us" element={<WhyUsPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="faq" element={<FaqPage />} />
          </Route>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
