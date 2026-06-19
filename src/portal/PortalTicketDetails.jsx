import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Box, CircularProgress, Alert, Button,
  Divider, Chip, List, ListItem, ListItemText, Avatar, TextField, IconButton
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import apiFetch from '../admin/api';
import DetailPageLayout from '../components/DetailPageLayout.jsx';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const PortalTicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/portal/tickets/${id}`);
      if (response.ok) {
        setTicket(await response.json());
      } else {
        setError('Ticket not found');
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await apiFetch(`/api/portal/tickets/${id}/comments`, {
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
    } finally {
      setSubmittingComment(false);
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

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/portal')} color="primary">
            <ArrowBack />
          </IconButton>
          <PageHeading
            eyebrow={`Case Reference #${ticket.id.split('-')[0]}`}
            title="Service Request Details"
            sx={{ mb: 0 }}
          />
        </Box>
        <Chip label={ticket.status} color={getStatusColor(ticket.status)} sx={{ fontWeight: 600 }} />
      </Box>

      <DetailPageLayout
        left={(
          <>
          <PolishedCard color="secondary" sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>{ticket.title}</Typography>
              <Chip label={ticket.type.replace('_', ' ')} variant="outlined" size="small" sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 11 }} />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>
              {ticket.description}
            </Typography>
          </PolishedCard>

          <PolishedCard color="secondary" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Communication History</Typography>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ mb: 3 }}>
              {ticket.comments?.length > 0 ? (
                ticket.comments.map((comment) => {
                  const isStaff = comment.author.roles.some(r => ['ADMIN', 'TECHNICIAN'].includes(r));
                  return (
                    <ListItem key={comment.id} alignItems="flex-start" sx={{ px: 0 }}>
                      <Avatar sx={{ mr: 2, bgcolor: isStaff ? 'primary.main' : 'secondary.main', width: 32, height: 32 }}>
                        {comment.author.name?.charAt(0) || '?'}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>
                              {comment.author.name || 'Client'} {isStaff && <Chip label="Staff" size="small" sx={{ height: 16, fontSize: 10, ml: 1, bgcolor: 'primary.dark' }} />}
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
                  );
                })
              ) : (
                <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic' }}>No activity yet.</Typography>
              )}
            </List>
            <Box component="form" onSubmit={handleAddComment} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="Ask a question or provide an update..."
                fullWidth
                size="small"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button type="submit" variant="contained" color="secondary" endIcon={<Send />} disabled={submittingComment}>
                Send
              </Button>
            </Box>
          </PolishedCard>
          </>
        )}
        right={(
          <>
          <PolishedCard sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Service Info</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Assigned Technician</Typography>
            <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
              {ticket.assignedTo?.name || 'Pending Assignment'}
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontFamily: '"IBM Plex Mono"' }}>Ticket ID</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,.2)', p: 0.5, borderRadius: 1 }}>
              {ticket.id}
            </Typography>
          </PolishedCard>

          <PolishedCard sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Status Timeline</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"' }}>Submitted</Typography>
            <Typography variant="body2" gutterBottom>
              {new Date(ticket.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontFamily: '"IBM Plex Mono"' }}>Last Activity</Typography>
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

export default PortalTicketDetails;
