// src/pages/AdminDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";

import AdminPropertiesSection from "../../components/admin/AdminPropertiesSection.tsx";
import AdminBookingsSection from "../../components/admin/AdminBookingsSection.tsx";
import EmailTemplatesSection from "../../components/admin/AdminEmailTemplate.tsx";

import AdminRefundRequestsSection from "../../components/admin/AdminRefundRequestsSection";
import AdminVouchersSection from "../../components/admin/AdminVouchersSection";
import AdminPropertyReviewsSection from "@/components/admin/AdminPropertyReviewsSection.tsx";
import AdminAdditionalBedRequests from "@/components/admin/AdminAdditionalBedRequests.tsx";

const AdminDashboardPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 pt-20 pb-8 px-4">
      {/*                     ^^^^^^  */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header + CTA */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Admin Dashboard
          </h1>

          <Link
            to="/admin/periods"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Manage Periods
          </Link>

          <Link
            to="/admin/stay-guide"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Manage Stay Guide
          </Link>
        </div>

        <AdminPropertiesSection />
        <AdminBookingsSection />

        {/* Payments admin tools */}
        <AdminRefundRequestsSection />
        <AdminVouchersSection />

        <section>
          <EmailTemplatesSection />
        </section>
        <section>
          <AdminAdditionalBedRequests />
        </section>
      <section>
          <AdminPropertyReviewsSection propertyId={0} />
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
