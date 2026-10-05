import { lazy, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import { queryClient } from '@/services/queryClient'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { RequireAuth } from '@/components/common/RequireAuth'

// Route-level code splitting — without this, visiting the demo/embeddable-
// widget site downloaded the entire portal bundle (forms, mascot upload,
// leads) and vice versa, none of which that visitor ever needed.
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const AdSimulatorPage = lazy(() => import('@/pages/AdSimulatorPage').then((m) => ({ default: m.AdSimulatorPage })))
const CompanyWebsiteLayout = lazy(() =>
  import('@/pages/CompanyWebsiteLayout').then((m) => ({ default: m.CompanyWebsiteLayout })),
)
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const PortalLoginPage = lazy(() =>
  import('@/pages/portal/PortalLoginPage').then((m) => ({ default: m.PortalLoginPage })),
)
const PortalLayout = lazy(() => import('@/pages/portal/PortalLayout').then((m) => ({ default: m.PortalLayout })))
const PortalOverviewPage = lazy(() =>
  import('@/pages/portal/PortalOverviewPage').then((m) => ({ default: m.PortalOverviewPage })),
)
const PortalBotSetupPage = lazy(() =>
  import('@/pages/portal/PortalBotSetupPage').then((m) => ({ default: m.PortalBotSetupPage })),
)
const PortalSettingsPage = lazy(() =>
  import('@/pages/portal/PortalSettingsPage').then((m) => ({ default: m.PortalSettingsPage })),
)
const PortalKnowledgePage = lazy(() =>
  import('@/pages/portal/PortalKnowledgePage').then((m) => ({ default: m.PortalKnowledgePage })),
)
const PortalEmbedPage = lazy(() =>
  import('@/pages/portal/PortalEmbedPage').then((m) => ({ default: m.PortalEmbedPage })),
)
const PortalLeadsPage = lazy(() =>
  import('@/pages/portal/PortalLeadsPage').then((m) => ({ default: m.PortalLeadsPage })),
)
const TeamLoginPage = lazy(() => import('@/pages/team/TeamLoginPage').then((m) => ({ default: m.TeamLoginPage })))
const TeamLayout = lazy(() => import('@/pages/team/TeamLayout').then((m) => ({ default: m.TeamLayout })))
const TeamBusinessesPage = lazy(() =>
  import('@/pages/team/TeamBusinessesPage').then((m) => ({ default: m.TeamBusinessesPage })),
)
const TeamBusinessDetailPage = lazy(() =>
  import('@/pages/team/TeamBusinessDetailPage').then((m) => ({ default: m.TeamBusinessDetailPage })),
)
const TeamUsagePage = lazy(() => import('@/pages/team/TeamUsagePage').then((m) => ({ default: m.TeamUsagePage })))
const HomePage = lazy(() => import('@/pages/company-site/HomePage').then((m) => ({ default: m.HomePage })))
const DestinationsPage = lazy(() =>
  import('@/pages/company-site/DestinationsPage').then((m) => ({ default: m.DestinationsPage })),
)
const PricingPage = lazy(() => import('@/pages/company-site/PricingPage').then((m) => ({ default: m.PricingPage })))
const ProcessPage = lazy(() => import('@/pages/company-site/ProcessPage').then((m) => ({ default: m.ProcessPage })))
const WhyUsPage = lazy(() => import('@/pages/company-site/WhyUsPage').then((m) => ({ default: m.WhyUsPage })))
const TestimonialsPage = lazy(() =>
  import('@/pages/company-site/TestimonialsPage').then((m) => ({ default: m.TestimonialsPage })),
)
const FaqPage = lazy(() => import('@/pages/company-site/FaqPage').then((m) => ({ default: m.FaqPage })))

function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <LoadingSpinner size={24} />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
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
            {/* Guarded: this page shows lead PII and full visitor
                transcripts. It was previously open to anyone who typed the
                URL, and bootstrapped off "whichever business is first in
                the table" — so one client could read another's leads. */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/portal/login" element={<PortalLoginPage />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalOverviewPage />} />
              <Route path="bot-setup" element={<PortalBotSetupPage />} />
              <Route path="knowledge" element={<PortalKnowledgePage />} />
              <Route path="settings" element={<PortalSettingsPage />} />
              <Route path="embed" element={<PortalEmbedPage />} />
              <Route path="leads" element={<PortalLeadsPage />} />
            </Route>
            {/* Internal staff admin — completely separate auth (StaffUser/
                StaffSession via /api/team/*) from the customer-facing
                portal above, so it gets its own login route and layout
                rather than reusing PortalLayout's guard. */}
            <Route path="/team/login" element={<TeamLoginPage />} />
            <Route path="/team" element={<TeamLayout />}>
              <Route index element={<TeamBusinessesPage />} />
              <Route path="businesses" element={<TeamBusinessesPage />} />
              <Route path="businesses/:id" element={<TeamBusinessDetailPage />} />
              <Route path="usage" element={<TeamUsagePage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
