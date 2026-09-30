import Pagination from '../components/Pagination.jsx';
import { usePagination } from '../components/usePagination.js';
import useVisiblePolling from '../components/useVisiblePolling.js';
import { Link as RouterLink } from 'react-router-dom';
import React, { useState, useCallback } from 'react';
import { 
  Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Box, CircularProgress, Alert, Chip 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../admin/api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';
import logoMark from '../assets/brand/logo-mark.svg';

const PortalDashboard = () => {
  const page = usePagination();
  const { offset, readPage } = page;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const response = await apiFetch(`/api/portal/me?limit=50&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        readPage(response, data.tickets?.length || 0);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load portal data');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [offset, readPage]);

  const refresh = useVisiblePolling(fetchData);

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'error';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error" action={<Button onClick={refresh}>Refresh</Button>}>{error}</Alert>;

  const openTickets = customer.openTicketCount ?? customer.tickets?.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length ?? 0;

  return (
    <Box>
      <Button onClick={refresh} sx={{ mb: 2 }}>Refresh</Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <PageHeading 
          eyebrow="Customer Portal"
          title={`Welcome, ${customer.name.split(' ')[0]}`}
          body="Track your service requests and communicate with our technicians."
        />
        <Button variant="contained" color="secondary" size="large" onClick={() => navigate('/portal/new-ticket')}>
          Submit New Ticket
        </Button>
      </Box>

      <Box sx={{ mb: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 3 }}>
        <PolishedCard color="secondary" sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
          <Box component="img" src={logoMark} sx={{ position: 'absolute', right: -20, top: -20, width: 120, opacity: 0.05 }} />
          <Typography variant="h6" color="secondary.light" sx={{ mb: 1, fontFamily: '"IBM Plex Mono"' }}>{customer.openTicketCount == null ? 'Active requests on this page' : 'Active Requests'}</Typography>
          <Typography variant="h2" sx={{ fontWeight: 600 }}>{openTickets}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Currently in progress</Typography>
        </PolishedCard>
      </Box>

      <PageHeading title="My Service Tickets" sx={{ mb: 2 }} />
      <PolishedCard sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Technician</TableCell>
                <TableCell align="right">Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customer.tickets?.length > 0 ? (
                customer.tickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    hover 
                    sx={{ cursor: 'pointer' }}

                  >
                    <TableCell>
                      <Typography component={RouterLink} to={`/portal/tickets/${ticket.id}`} variant="subtitle2" color="primary.light" sx={{ fontWeight: 600 }}>{ticket.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={ticket.type.replace('_', ' ')} size="small" variant="outlined" sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={ticket.status} size="small" color={getStatusColor(ticket.status)} />
                    </TableCell>
                    <TableCell>{ticket.assignedTo?.name || 'Pending assignment'}</TableCell>
                    <TableCell align="right">{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">You haven't submitted any tickets yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
            <Pagination {...page} loading={loading} />
      </PolishedCard>
    </Box>
  );
};

export default PortalDashboard;
