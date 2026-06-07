import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Typography, Box, CircularProgress, Alert, Button, 
  Grid, Divider, Chip, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Avatar, IconButton
} from '@mui/material';
import { ArrowBack, Person } from '@mui/icons-material';
import apiFetch from './api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const AdminCustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await apiFetch(`/api/crm/customers/${id}`);
        if (response.ok) {
          setCustomer(await response.json());
        } else {
          setError('Customer not found');
        }
      } catch {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

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

  return (
    <Box>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/admin/customers')} color="primary">
          <ArrowBack />
        </IconButton>
        <PageHeading 
          eyebrow="Customer Profile"
          title={customer.name}
          sx={{ mb: 0 }}
        />
      </Box>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={10}>
          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <Person fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{customer.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>ID: {customer.id.split('-')[0]}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Email Address</Typography>
                <Typography variant="body1">{customer.email || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Phone Number</Typography>
                <Typography variant="body1">{customer.phone || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Service Address</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{customer.address || 'N/A'}</Typography>
              </Box>
            </Box>
          </PolishedCard>

          <PolishedCard sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Linked Portal Account</Typography>
            <Divider sx={{ my: 1.5 }} />
            {customer.user ? (
              <Box>
                <Typography variant="body2" gutterBottom>
                  <strong>User Email:</strong> {customer.user.email}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                  {customer.user.roles.map(role => (
                    <Chip key={role} label={role} size="small" variant="outlined" color="secondary" sx={{ height: 18, fontSize: 10, fontFamily: '"IBM Plex Mono"' }} />
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic' }}>
                This customer does not have a portal login yet.
              </Typography>
            )}
          </PolishedCard>
        </Grid>

        <Grid item xs={12} md={2}>
          <PolishedCard sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Service History</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Technician</TableCell>
                    <TableCell align="right">Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customer.tickets?.length > 0 ? (
                    customer.tickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id} 
                        hover 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" color="primary.light" sx={{ fontWeight: 500 }}>{ticket.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={ticket.status} size="small" color={getStatusColor(ticket.status)} sx={{ height: 20, fontSize: 10 }} />
                        </TableCell>
                        <TableCell>{ticket.assignedTo?.name || 'Unassigned'}</TableCell>
                        <TableCell align="right">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary" variant="body2">No service tickets found for this customer.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </PolishedCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminCustomerDetails;
