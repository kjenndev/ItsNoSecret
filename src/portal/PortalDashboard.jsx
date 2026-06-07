import React, { useEffect, useState, useCallback } from 'react';
import { 
  Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Box, CircularProgress, Alert, Chip 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../admin/api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';
import logoMark from '../assets/brand/logo-mark.svg';

const PortalDashboard = () => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const response = await apiFetch('/api/portal/me');
      if (response.ok) {
        setCustomer(await response.json());
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load portal data');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);

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
  if (error) return <Alert severity="error">{error}</Alert>;

  const openTickets = customer.tickets?.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'flex-start' }}>
        <PageHeading 
          eyebrow="Customer Portal"
          title={`Welcome, ${customer.name.split(' ')[0]}`}
          body="Track your service requests and communicate with our technicians."
        />
        <Button variant="contained" color="secondary" size="large" onClick={() => navigate('/portal/new-ticket')}>
          Submit New Ticket
        </Button>
      </Box>

      <Box sx={{ mb: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 3 }}>
        <PolishedCard color="secondary" sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
          <Box component="img" src={logoMark} sx={{ position: 'absolute', right: -20, top: -20, width: 120, opacity: 0.05 }} />
          <Typography variant="h6" color="secondary.light" sx={{ mb: 1, fontFamily: '"IBM Plex Mono"' }}>Active Requests</Typography>
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
                    onClick={() => navigate(`/portal/tickets/${ticket.id}`)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" color="primary.light" sx={{ fontWeight: 600 }}>{ticket.title}</Typography>
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
      </PolishedCard>
    </Box>
  );
};

export default PortalDashboard;
