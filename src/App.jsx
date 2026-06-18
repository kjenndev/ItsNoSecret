import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Paper, Typography } from '@mui/material';
import { theme } from './theme.js';
import logoMark from './assets/brand/logo-mark.svg';

import LandingPage from './LandingPage.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import LoginPage from './admin/LoginPage.jsx';
import AdminCustomers from './admin/AdminCustomers.jsx';
import AdminCustomerDetails from './admin/AdminCustomerDetails.jsx';
import AdminLeads from './admin/AdminLeads.jsx';
import AdminTickets from './admin/AdminTickets.jsx';
import AdminTicketDetails from './admin/AdminTicketDetails.jsx';
import AdminUsers from './admin/AdminUsers.jsx';
import PortalLayout from './portal/PortalLayout.jsx';
import PortalDashboard from './portal/PortalDashboard.jsx';
import PortalNewTicket from './portal/PortalNewTicket.jsx';
import PortalTicketDetails from './portal/PortalTicketDetails.jsx';
import ProtectedRoute from './admin/ProtectedRoute.jsx';
import { PageHeading, PolishedCard } from './components/Shared.jsx';

// Basic Placeholder component for Admin Dashboard
const AdminDashboard = () => (
  <Box>
    <PageHeading 
      eyebrow="Staff Overview"
      title="Staff Dashboard"
      body="Manage your team and service requests with ease."
    />

    <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 3 }}>
      <PolishedCard color="primary" sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
        <Box component="img" src={logoMark} sx={{ position: 'absolute', right: -20, top: -20, width: 120, opacity: 0.05 }} />
        <Typography variant="h6" color="primary.light" sx={{ mb: 1, fontFamily: '"IBM Plex Mono"' }}>Total Customers</Typography>
        <Typography variant="h2" sx={{ fontWeight: 600 }}>2</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Active in CRM</Typography>
      </PolishedCard>

      <PolishedCard color="secondary" sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
        <Box component="img" src={logoMark} sx={{ position: 'absolute', right: -20, top: -20, width: 120, opacity: 0.05 }} />
        <Typography variant="h6" color="secondary.light" sx={{ mb: 1, fontFamily: '"IBM Plex Mono"' }}>Open Tickets</Typography>
        <Typography variant="h2" sx={{ fontWeight: 600 }}>2</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Needs attention</Typography>
      </PolishedCard>
    </Box>
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Unified Login Page */}
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomerDetails />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="tickets/:id" element={<AdminTicketDetails />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          {/* Client Portal Routes */}
          <Route path="/portal" element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PortalDashboard />} />
            <Route path="new-ticket" element={<PortalNewTicket />} />
            <Route path="tickets/:id" element={<PortalTicketDetails />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
