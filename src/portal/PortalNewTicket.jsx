import React, { useState } from 'react';
import { 
  Typography, Box, Button, TextField, MenuItem, Select, FormControl, InputLabel, Alert 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowBack } from '@mui/icons-material';
import apiFetch from '../admin/api';
import { PageHeading, PolishedCard } from '../components/Shared.jsx';

const PortalNewTicket = () => {
  const [formData, setFormData] = useState({ title: '', description: '', type: 'PC_REPAIR' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch('/api/portal/tickets', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        navigate('/portal');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit ticket');
      }
    } catch {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/portal')}>
          My Tickets
        </Button>
      </Box>
      
      <PolishedCard color="secondary" sx={{ p: { xs: 3, md: 5 }, maxWidth: 800, mx: 'auto' }}>
        <PageHeading 
          title="Submit a Service Request"
          body="Tell us what's happening with your computer and a technician will get back to you soon."
        />

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 2 }}>
          <TextField
            label="Summarize the Issue"
            required
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Computer won't boot into Windows"
          />

          <FormControl fullWidth>
            <InputLabel>Type of Service</InputLabel>
            <Select
              value={formData.type}
              label="Type of Service"
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
            label="Detailed Description"
            required
            fullWidth
            multiline
            rows={8}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Please provide any details that might help our technicians diagnose the problem."
          />

          <Button 
            type="submit" 
            variant="contained" 
            color="secondary" 
            size="large"
            fullWidth
            endIcon={<Send />}
            disabled={submitting}
            sx={{ py: 2 }}
          >
            {submitting ? 'Submitting Request...' : 'Submit Request'}
          </Button>
        </Box>
      </PolishedCard>
    </Box>
  );
};

export default PortalNewTicket;
