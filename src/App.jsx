import { Link as RouterLink } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
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
import AccountSettings from './components/AccountSettings.jsx';
import apiFetch from './admin/api';
import { PageHeading, PolishedCard } from './components/Shared.jsx';


const getStatusColor = (status) => {
  switch (status) {
    case 'OPEN': return 'error';
    case 'IN_PROGRESS': return 'warning';
    case 'RESOLVED': return 'success';
    case 'CLOSED': return 'default';
    default: return 'default';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'URGENT': return 'error';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'info';
    case 'LOW': return 'success';
    default: return 'default';
  }
};

const DashboardCountCard = ({ color = 'primary', title, value, caption }) => (
  <PolishedCard data-testid="dashboard-count-card" color={color} sx={{ p: 4, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
    <Box component="img" src={logoMark} sx={{ position: 'absolute', right: -20, top: -20, width: 120, opacity: 0.05 }} />
    <Typography component="h2" variant="h6" color={`${color}.light`} sx={{ mb: 1, fontFamily: '"IBM Plex Mono"' }}>{title}</Typography>
    <Typography variant="h2" sx={{ fontWeight: 600 }}>{value}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{caption}</Typography>
  </PolishedCard>
);

const AdminDashboard = () => {
  const [summary, setSummary] = useState({ leadCount: 0, customerCount: 0, openTicketCount: 0, recentOpenTickets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      try {
        const response = await apiFetch('/api/crm/summary');
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        if (active) setSummary(data);
      } catch {
        if (active) setError('Failed to load dashboard data');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      active = false;
    };
  }, []);

  const openTickets = summary.recentOpenTickets;

  if (loading) return <CircularProgress aria-label="Loading dashboard" />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <PageHeading
        eyebrow="Staff Overview"
        title="Staff Dashboard"
        body="Manage your team and service requests with ease."
      />

      <Box
        data-testid="dashboard-counts-row"

        sx={{ mt: 4, display: 'grid', gridTemplateColumns: '1fr', '@media (min-width:1200px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }, gap: 3, pb: 0.5 }}
      >
        <DashboardCountCard color="secondary" title="Leads" value={summary.leadCount} caption="Consultation pipeline" />
        <DashboardCountCard color="primary" title="Total Customers" value={summary.customerCount} caption="Active in CRM" />
        <DashboardCountCard color="secondary" title="Open Tickets" value={summary.openTicketCount} caption="Needs attention" />
      </Box>

      <PolishedCard sx={{ mt: 4, p: 0 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Open Tickets</Typography>
          <Typography variant="body2" color="text.secondary">Most recent open or in-progress tickets.</Typography>
        </Box>
        <TableContainer>
          <Table aria-label="Open tickets">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {openTickets.length > 0 ? (
                openTickets.map((ticket) => (
                  <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }} >
                    <TableCell>
                      <Typography component={RouterLink} to={`/admin/tickets/${ticket.id}`} variant="subtitle2" color="primary.light" sx={{ fontWeight: 600 }}>{ticket.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticket.description?.length > 60 ? `${ticket.description.substring(0, 60)}...` : ticket.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{ticket.customer?.name || 'Unassigned'}</TableCell>
                    <TableCell><Chip label={ticket.status} size="small" color={getStatusColor(ticket.status)} /></TableCell>
                    <TableCell><Chip label={ticket.priority} size="small" variant="outlined" color={getPriorityColor(ticket.priority)} /></TableCell>
                    <TableCell>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No open tickets right now.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography component={RouterLink} to="/admin/tickets" sx={{ display: 'block', p: 2 }}>View all tickets</Typography>
      </PolishedCard>
    </Box>
  );
};

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
            <Route path="account" element={<AccountSettings />} />
          </Route>

          {/* Client Portal Routes */}
          <Route path="/portal" element={
            <ProtectedRoute roles={['CLIENT']}>
              <PortalLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PortalDashboard />} />
            <Route path="new-ticket" element={<PortalNewTicket />} />
            <Route path="tickets/:id" element={<PortalTicketDetails />} />
            <Route path="account" element={<AccountSettings />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
