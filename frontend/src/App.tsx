import { QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { queryClient } from '@/services/queryClient'
import { AdSimulatorPage } from '@/pages/AdSimulatorPage'
import { CompanyWebsiteLayout } from '@/pages/CompanyWebsiteLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { PortalLoginPage } from '@/pages/portal/PortalLoginPage'
import { PortalLayout } from '@/pages/portal/PortalLayout'
import { PortalSettingsPage } from '@/pages/portal/PortalSettingsPage'
import { PortalKnowledgePage } from '@/pages/portal/PortalKnowledgePage'
import { PortalEmbedPage } from '@/pages/portal/PortalEmbedPage'
import { PortalLeadsPage } from '@/pages/portal/PortalLeadsPage'
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
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<PortalSettingsPage />} />
            <Route path="knowledge" element={<PortalKnowledgePage />} />
            <Route path="embed" element={<PortalEmbedPage />} />
            <Route path="leads" element={<PortalLeadsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
