import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import apiFetch from './admin/api';
import { PageHeading, PolishedCard } from './components/Shared.jsx';

const activeTicketStatuses = new Set(['OPEN', 'IN_PROGRESS']);

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
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      try {
        const [leadsRes, customersRes, ticketsRes] = await Promise.all([
          apiFetch('/api/crm/leads'),
          apiFetch('/api/crm/customers'),
          apiFetch('/api/crm/tickets'),
        ]);

        if (!leadsRes.ok || !customersRes.ok || !ticketsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [leadData, customerData, ticketData] = await Promise.all([
          leadsRes.json(),
          customersRes.json(),
          ticketsRes.json(),
        ]);

        if (active) {
          setLeads(leadData);
          setCustomers(customerData);
          setTickets(ticketData);
        }
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

  const openTickets = useMemo(
    () => tickets.filter((ticket) => activeTicketStatuses.has(ticket.status)),
    [tickets],
  );

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
        style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        sx={{ mt: 4, display: 'grid', gap: 3, overflowX: 'auto', pb: 0.5 }}
      >
        <DashboardCountCard color="secondary" title="Leads" value={leads.length} caption="Consultation pipeline" />
        <DashboardCountCard color="primary" title="Total Customers" value={customers.length} caption="Active in CRM" />
        <DashboardCountCard color="secondary" title="Open Tickets" value={openTickets.length} caption="Needs attention" />
      </Box>

      <PolishedCard sx={{ mt: 4, p: 0 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Open Tickets</Typography>
          <Typography variant="body2" color="text.secondary">Tickets that are open or currently in progress.</Typography>
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
                  <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/tickets/${ticket.id}`)}>
                    <TableCell>
                      <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 600 }}>{ticket.title}</Typography>
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
