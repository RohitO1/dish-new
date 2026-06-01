import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import Notification from './components/Notification';

// Lazy-load all pages for code-splitting (eliminates the chunk size warning)
const AuthPage            = React.lazy(() => import('./pages/AuthPage'));
const RoleSelectPage      = React.lazy(() => import('./pages/RoleSelectPage'));
const ScannerPage         = React.lazy(() => import('./pages/ScannerPage'));
const MenuPage            = React.lazy(() => import('./pages/MenuPage'));
const Dish3DPage          = React.lazy(() => import('./pages/Dish3DPage'));
const CartPage            = React.lazy(() => import('./pages/CartPage'));
const DinerOrdersPage     = React.lazy(() => import('./pages/DinerOrdersPage'));
const VendorAuthPage      = React.lazy(() => import('./pages/VendorAuthPage'));
const VendorOnboardingPage = React.lazy(() => import('./pages/VendorOnboardingPage'));
const VendorDashboardPage = React.lazy(() => import('./pages/VendorDashboardPage'));
const HealthDashboardPage = React.lazy(() => import('./pages/HealthDashboardPage'));
const SettingsPage        = React.lazy(() => import('./pages/SettingsPage'));

// Full-screen loading shimmer shown while a lazy chunk loads
function PageLoader() {
  return (
    <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 z-50">
      <div className="w-10 h-10 border-2 border-neutral-800 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-xs text-neutral-600 font-bold tracking-widest uppercase">Loading</p>
    </div>
  );
}

function RootRedirect() {
  const { user, isInitializing } = useAppContext();
  if (isInitializing) return <PageLoader />;
  if (user?.role === 'vendor') return <Navigate to="/vendor" replace />;
  // For diner or anonymous (null), go to scanner
  return <Navigate to="/scanner" replace />;
}

function AnimatedRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth"        element={<AuthPage />} />
        <Route path="/role-select" element={<RoleSelectPage />} />

        {/* Diner Routes */}
        <Route path="/scanner"     element={<ScannerPage />} />
        <Route path="/menu"        element={<MenuPage />} />
        <Route path="/dish/:id"    element={<Dish3DPage />} />
        <Route path="/cart"        element={<CartPage />} />
        <Route path="/orders"      element={<DinerOrdersPage />} />

        {/* Vendor Routes */}
        <Route path="/vendor-auth"    element={<VendorAuthPage />} />
        <Route path="/vendor-onboard" element={<VendorOnboardingPage />} />
        <Route path="/vendor"         element={<VendorDashboardPage />} />

        {/* Health & Settings */}
        <Route path="/health"   element={<HealthDashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="font-sans antialiased selection:bg-blue-500/30">
          <Notification />
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
