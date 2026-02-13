// src/App.tsx
import { Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PropertiesPage from "./pages/PropertiesPage";
import PropertyPage from "./pages/PropertyPage";
import BookingPage from "./pages/BookingPage";
import UserDashboard from "./pages/UserDashboardPage";
import AdminDashboard from "./pages/admin/AdminDashboardPage";
import ProtectedRoute from "./router/ProtectedRoute";
import BookingConfirmedPage from "./pages/BookingConfirmedPage";
import AdminRoute from "./router/AdminRoute";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import ContactPage from "./pages/ContactUs";

// ✅ NEW import
import AdminPeriodsTestPage from "./pages/admin/AdminPeriodsPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import LefkadaShowcasePage from "./pages/LefkadaShowcasePage";
import StayGuidePage from "./pages/StayGuidePage";
import AdminStayGuidePage from "./pages/admin/AdminStayGuidePage";
import BookingSummaryPage from "./pages/BookingSummaryPage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/properties" element={<PropertiesPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/properties/:slug" element={<PropertyPage />} />
          <Route path="/properties/:slug/book" element={<BookingPage />} />
          <Route path="/booking/confirmed" element={<BookingConfirmedPage />} />
          <Route path="/booking/success" element={<BookingSuccessPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/lefkada" element={<LefkadaShowcasePage />} />
          <Route path="/stay-guide/:token" element={<StayGuidePage />} />
          <Route path="/booking/summary" element={<BookingSummaryPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* ✅ Admin pages */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

            <Route
            path="/admin/stay-guide"
            element={
              <AdminRoute>
                <AdminStayGuidePage />
              </AdminRoute>
            }
          />

          {/* ✅ NEW: Protected admin-only periods test page */}
          <Route
            path="/admin/periods"
            element={
              <AdminRoute>
                <AdminPeriodsTestPage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
