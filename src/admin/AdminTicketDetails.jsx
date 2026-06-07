import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Paper, Typography, Box, CircularProgress, Alert, Button, 
  Grid, Divider, Chip, MenuItem, Select, FormControl, InputLabel, TextField,
  List, ListItem, ListItemText, Avatar, IconButton
} from '@mui/material';
import { ArrowBack, Save, Send } from '@mui/icons-material';
import apiFetch from './api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const AdminTicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');

  const fetchTicket = useCallback(async () => {
    try {
      const [ticketRes, usersRes] = await Promise.all([
        apiFetch(`/api/crm/tickets/${id}`),
        apiFetch('/api/crm/users')
      ]);

      if (ticketRes.ok && usersRes.ok) {
        setTicket(await ticketRes.json());
        setUsers(await usersRes.json());
      } else {
        setError('Data not found');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      await fetchTicket();
    };
    init();
  }, [fetchTicket]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/crm/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          type: ticket.type,
          assignedToId: ticket.assignedToId
        }),
      });
      if (response.ok) {
        alert('Ticket updated successfully');
        fetchTicket();
      } else {
        alert('Failed to update ticket');
      }
    } catch {
      alert('Connection error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await apiFetch(`/api/crm/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText }),
      });
      if (response.ok) {
        setCommentText('');
        fetchTicket();
      } else {
        alert('Failed to add comment');
      }
    } catch {
      alert('Connection error');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/admin/tickets')} color="primary">
            <ArrowBack />
          </IconButton>
          <PageHeading 
            eyebrow={`Ticket #${ticket.id.split('-')[0]}`}
            title="Service Request Details"
            sx={{ mb: 0 }}
          />
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Save />} 
          onClick={handleUpdate}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={10}>
          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Issue Information</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField
                label="Ticket Title"
                fullWidth
                variant="outlined"
                value={ticket.title}
                onChange={(e) => setTicket({ ...ticket, title: e.target.value })}
              />
              <TextField
                label="Detailed Description"
                fullWidth
                multiline
                rows={6}
                value={ticket.description}
                onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
              />
            </Box>
          </PolishedCard>

          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Customer Details</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{ticket.customer.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Email</Typography>
                <Typography variant="body1">{ticket.customer.email || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Phone</Typography>
                <Typography variant="body1">{ticket.customer.phone || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Address</Typography>
                <Typography variant="body1">{ticket.customer.address || 'N/A'}</Typography>
              </Grid>
            </Grid>
          </PolishedCard>

          <PolishedCard sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Technician Comments</Typography>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ mb: 3 }}>
              {ticket.comments?.length > 0 ? (
                ticket.comments.map((comment) => (
                  <ListItem key={comment.id} alignItems="flex-start" sx={{ px: 0 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      {comment.author.name?.charAt(0) || '?'}
                    </Avatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>
                            {comment.author.name || comment.author.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(comment.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                          {comment.text}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic' }}>No comments yet.</Typography>
              )}
            </List>
            <Box component="form" onSubmit={handleAddComment} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="Add a comment..."
                fullWidth
                size="small"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button type="submit" variant="outlined" color="secondary" endIcon={<Send />}>
                Post
              </Button>
            </Box>
          </PolishedCard>
        </Grid>

        <Grid item xs={12} md={2}>
          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Classification</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={ticket.status}
                  label="Status"
                  onChange={(e) => setTicket({ ...ticket, status: e.target.value })}
                >
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={ticket.priority}
                  label="Priority"
                  onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={ticket.type}
                  label="Service Type"
                  onChange={(e) => setTicket({ ...ticket, type: e.target.value })}
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

              <FormControl fullWidth>
                <InputLabel>Assigned To</InputLabel>
                <Select
                  value={ticket.assignedToId || ''}
                  label="Assigned To"
                  onChange={(e) => setTicket({ ...ticket, assignedToId: e.target.value })}
                >
                  <MenuItem value=""><em>Unassigned</em></MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </PolishedCard>

          <PolishedCard sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Metadata</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Created At</Typography>
            <Typography variant="body2" gutterBottom>
              {new Date(ticket.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontFamily: '"IBM Plex Mono"' }}>Last Updated</Typography>
            <Typography variant="body2">
              {new Date(ticket.updatedAt).toLocaleString()}
            </Typography>
          </PolishedCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminTicketDetails;
