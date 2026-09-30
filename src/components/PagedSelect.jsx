import React, { useEffect, useId, useState } from 'react';
import { Alert, Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import apiFetch from '../admin/api';
import Pagination from './Pagination.jsx';
import { usePagination } from './usePagination.js';
export default function PagedSelect({ endpoint, label, value, onChange, selected, staffOnly = false, allowEmpty = true }) {
  const id = useId();
  const page = usePagination();
  const { offset, readPage } = page;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return null;
      setLoading(true);
      setError('');
      return apiFetch(`${endpoint}?limit=50&offset=${offset}`);
    }).then(async response => {
      if (!response) return;
      if (!response.ok) throw new Error('Could not load choices');
      const data = await response.json();
      if (active) { setItems(data); readPage(response, data.length); }
    }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint, offset, readPage]);
  const choices = items.filter(item => !staffOnly || (item.isActive !== false && item.roles?.some(role => ['ADMIN', 'TECHNICIAN'].includes(role))));
  const display = item => item.name || item.email || item.id;
  return <Box>
    {error && <Alert severity="error">{error}</Alert>}
    <FormControl fullWidth>
      <InputLabel id={id}>{label}</InputLabel>
      <Select labelId={id} label={label} value={value || ''} onChange={onChange}>
        {allowEmpty && <MenuItem value="">{staffOnly ? 'Unassigned' : 'None'}</MenuItem>}
        {value && !choices.some(item => item.id === value) && <MenuItem value={value}>{selected?.id === value ? display(selected) : `Current selection (${value})`}</MenuItem>}
        {choices.map(item => <MenuItem key={item.id} value={item.id}>{display(item)}{item.email ? ` (${item.email})` : ''}</MenuItem>)}
      </Select>
    </FormControl>
    <Pagination {...page} loading={loading}/>
  </Box>;
}
