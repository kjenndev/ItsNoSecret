import Pagination from '../components/Pagination.jsx';
import { usePagination } from '../components/usePagination.js';
import PagedSelect from '../components/PagedSelect.jsx';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper, Typography, Box, CircularProgress, Alert, Button,
  Divider, Chip, MenuItem, Select, FormControl, InputLabel, TextField,
  List, ListItem, ListItemText, Avatar, IconButton, FormControlLabel, Switch
} from '@mui/material';
import { ArrowBack, Save, Send } from '@mui/icons-material';
import apiFetch from './api';
import DetailPageLayout from '../components/DetailPageLayout.jsx';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const AdminTicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const requestGeneration = useRef(0);
  const page = usePagination();
  const { offset, readPage } = page;
  const [ticket, setTicket] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isInternal, setIsInternal] = useState(true);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');

  const fetchTicket = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError('');
    try {
      const ticketRes = await apiFetch(`/api/crm/tickets/${id}?limit=50&offset=${offset}`);

      if (generation !== requestGeneration.current) return;
      if (ticketRes.ok) {
        const data = await ticketRes.json();
        if (generation !== requestGeneration.current) return;
        setTicket(data);
        readPage(ticketRes, data.comments?.length || 0);
        setDraft(current => current?.id === data.id ? current : data);
      } else {
        setError('Data not found');
      }
    } catch {
      if (generation === requestGeneration.current) setError('Connection error');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [id, offset, readPage]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!active) return;
      await fetchTicket();
    };
    void Promise.resolve().then(init);
    return () => { active = false; requestGeneration.current += 1; };
  }, [fetchTicket]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/crm/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          status: draft.status,
          priority: draft.priority,
          type: draft.type,
          assignedToId: draft.assignedToId || null
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
    if (!commentText.trim() || posting) return;
    setPosting(true);

    try {
      const response = await apiFetch(`/api/crm/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText, isInternal }),
      });
      if (response.ok) {
        setCommentText('');
        setIsInternal(true);
        await fetchTicket();
      } else {
        alert('Failed to add comment');
      }
    } catch {
      alert('Connection error');
    } finally {
      setPosting(false);
    }
  };

  if (!ticket || ticket.id !== id) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      {loading && <CircularProgress aria-label="Loading page" />}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton aria-label="Back" onClick={() => navigate('/admin/tickets')} color="primary">
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

      <DetailPageLayout
        left={(
          <>
          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Issue Information</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField
                label="Ticket Title"
                fullWidth
                variant="outlined"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <TextField
                label="Detailed Description"
                fullWidth
                multiline
                rows={6}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Box>
          </PolishedCard>

          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Customer Details</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{ticket.customer.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Email</Typography>
                <Typography variant="body1">{ticket.customer.email || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Phone</Typography>
                <Typography variant="body1">{ticket.customer.phone || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Address</Typography>
                <Typography variant="body1">{ticket.customer.address || 'N/A'}</Typography>
              </Box>
            </Box>
          </PolishedCard>

          <PolishedCard sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Ticket Discussion</Typography>
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
                            {comment.author.name || comment.author.email} <Chip size="small" label={comment.isInternal === false ? 'Client-visible' : 'Private / Internal'} />
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
            <Pagination {...page} loading={loading} />
            <FormControlLabel control={<Switch checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />} label={isInternal ? "Private / Internal — staff only" : "Client-visible — shared with customer"} />
            <Box component="form" onSubmit={handleAddComment} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Comment"
                placeholder="Add a comment..."
                fullWidth
                size="small"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button disabled={posting} type="submit" variant="outlined" color="secondary" endIcon={<Send />}>
                Post
              </Button>
            </Box>
          </PolishedCard>
          </>
        )}
        right={(
          <>
          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Classification</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select labelId="status-label"
                  value={draft.status}
                  label="Status"
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                >
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="RESOLVED">Resolved</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select labelId="priority-label"
                  value={draft.priority}
                  label="Priority"
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="service-type-label">Service Type</InputLabel>
                <Select labelId="service-type-label"
                  value={draft.type}
                  label="Service Type"
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
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

              <PagedSelect endpoint="/api/crm/users" label="Assigned Technician" value={draft.assignedToId} selected={ticket.assignedTo} staffOnly onChange={e => setDraft({ ...draft, assignedToId: e.target.value || null })} />
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
          </>
        )}
      />
    </Box>
  );
};

export default AdminTicketDetails;
