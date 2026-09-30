import Pagination from '../components/Pagination.jsx';
import { usePagination } from '../components/usePagination.js';
import PagedSelect from '../components/PagedSelect.jsx';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Box, CircularProgress, Alert, Chip,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import apiFetch from './api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const AdminTickets = () => {
  const requestGeneration = useRef(0);
  const page = usePagination();
  const { offset, readPage } = page;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ 
    title: '', 
    description: '', 
    priority: 'MEDIUM', 
    type: 'PC_REPAIR', 
    customerId: '' 
  });

  const fetchData = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError('');
    try {
      const ticketsRes = await apiFetch(`/api/crm/tickets?limit=50&offset=${offset}`);

      if (generation !== requestGeneration.current) return;
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        if (generation !== requestGeneration.current) return;
        setTickets(data);
        readPage(ticketsRes, data.length);
      } else {
        setError('Failed to fetch data');
      }
    } catch {
      if (generation === requestGeneration.current) setError('Connection error');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [offset, readPage]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await fetchData();
    };
    void Promise.resolve().then(init);
    return () => { active = false; requestGeneration.current += 1; };
  }, [fetchData]);

  const handleAddTicket = async () => {
    try {
      const response = await apiFetch('/api/crm/tickets', {
        method: 'POST',
        body: JSON.stringify(newTicket),
      });
      if (response.ok) {
        setOpen(false);
        setNewTicket({ title: '', description: '', priority: 'MEDIUM', type: 'PC_REPAIR', customerId: '' });
        fetchData();
      } else {
        alert('Error creating ticket');
      }
    } catch {
      alert('Connection error');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'error';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };


  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      {loading && <CircularProgress aria-label="Loading page" />}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <PageHeading 
          eyebrow="Support"
          title="Service Tickets"
          body="Track and manage customer requests."
        />
        <Button variant="contained" color="secondary" onClick={() => setOpen(true)}>New Ticket</Button>
      </Box>

      <PolishedCard sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ cursor: 'pointer', color: 'primary.light', '&:hover': { textDecoration: 'underline' } }}
                      component={RouterLink} to={`/admin/tickets/${ticket.id}`}
                    >
                      {ticket.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ticket.description.length > 50 ? `${ticket.description.substring(0, 50)}...` : ticket.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={ticket.type.replace('_', ' ')} size="small" variant="outlined" sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10 }} />
                  </TableCell>
                  <TableCell>{ticket.customer?.name}</TableCell>
                  <TableCell>
                    <Chip label={ticket.status} size="small" color={getStatusColor(ticket.status)} />
                  </TableCell>
                  <TableCell>
                    <Chip label={ticket.priority} size="small" variant="outlined" color={getPriorityColor(ticket.priority)} />
                  </TableCell>
                  <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Pagination {...page} loading={loading} />
      </PolishedCard>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Service Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <PagedSelect endpoint="/api/crm/customers" label="Customer" value={newTicket.customerId} onChange={e => setNewTicket({ ...newTicket, customerId: e.target.value })} allowEmpty={false} />
            <TextField
              label="Ticket Title"
              fullWidth
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel id="service-type-label">Service Type</InputLabel>
              <Select labelId="service-type-label"
                value={newTicket.type}
                label="Service Type"
                onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value })}
              >
                <MenuItem value="PC_BUILD">PC Build</MenuItem>
                <MenuItem value="PC_REPAIR">PC Repair</MenuItem>
                <MenuItem value="SYSTEM_DIAGNOSTIC">System Diagnostic</MenuItem>
                <MenuItem value="MALWARE_REMOVAL">Malware Removal</MenuItem>
                <MenuItem value="DATA_RECOVERY">Data Recovery</MenuItem>
                <MenuItem value="TRAINING">Technology Training</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select labelId="priority-label"
                value={newTicket.priority}
                label="Priority"
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTicket} variant="contained">Create Ticket</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTickets;
