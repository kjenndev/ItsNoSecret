import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminUsers from './admin/AdminUsers.jsx';
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
const response = (data, total = 1, next = '') => ({ ok: true, headers: new Headers({'X-Total-Count': String(total), 'X-Next-Offset': String(next)}), json: async () => data });
it.each(['TECHNICIAN', 'CLIENT'])('preserves historical customer when editing %s into staff', async role => {
  localStorage.setItem('user', JSON.stringify({roles:['ADMIN']}));
  const user = {id:'u', name:'Linked user', email:'user@example.com', roles:[role], customer:{id:'c',name:'Historical customer'}};
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => response(url.startsWith('/api/users') ? [user] : []));
  render(<MemoryRouter><AdminUsers/></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', {name:'Edit user Linked user'}));
  if (role === 'CLIENT') {
    fireEvent.mouseDown(screen.getByRole('combobox', {name:'Roles'}));
    fireEvent.click(await screen.findByRole('option', {name:'Technician'}));
    fireEvent.keyDown(screen.getByRole('listbox'), {key:'Escape'});
  }
  fireEvent.click(screen.getByRole('button', {name:'Update User'}));
  await waitFor(() => expect(fetch.mock.calls.some(([,options]) => options.method === 'PUT')).toBe(true));
  const payload = JSON.parse(fetch.mock.calls.find(([,options]) => options.method === 'PUT')[1].body);
  expect(payload.roles).toEqual(['TECHNICIAN']);
  expect(payload).not.toHaveProperty('customerId');
});


import { useState } from 'react';
import PagedSelect from './components/PagedSelect.jsx';
it('does not display the original customer label for a different off-page value', async () => {
 vi.spyOn(globalThis,'fetch').mockImplementation(async url => response(url.includes('offset=50') ? [{id:'c',name:'Third customer'}] : [{id:'b',name:'New customer'}], 51, url.includes('offset=50') ? '' : 50));
 function Choice() { const [value,setValue] = useState('a'); return <PagedSelect endpoint="/choices" label="Customer" value={value} selected={{id:'a',name:'Original customer'}} onChange={event=>setValue(event.target.value)}/>; }
 render(<Choice/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled());
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Customer'}));
 fireEvent.click(await screen.findByRole('option',{name:'New customer'}));
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Previous page'})).toBeEnabled());
 expect(screen.getByRole('combobox',{name:'Customer'})).not.toHaveTextContent('Original customer');
 expect(screen.getByRole('combobox',{name:'Customer'})).toHaveTextContent(/New customer|Current selection \(b\)/);
});


import AdminLeads from './admin/AdminLeads.jsx';
it.each(['delete','convert'])('refetches the last valid lead page after %s removes the final filtered row', async action => {
 let changed = false;
 const fetch = vi.spyOn(globalThis,'fetch').mockImplementation(async (url, options) => {
  if (options.method) { changed = true; return response({customer:{name:'Converted'},createdCustomer:true}); }
  const last = url.includes('offset=50');
  return response(changed && last ? [] : [{id:last?'last':'first',name:last?'Last lead':'First lead',status:'NEW'}], changed ? 50 : 51, last || changed ? '' : 50);
 });
 render(<MemoryRouter><AdminLeads/></MemoryRouter>);
 await screen.findByText('First lead');
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Status'}));
 fireEvent.click(await screen.findByRole('option',{name:'New'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 await screen.findByText('Last lead');
 fireEvent.click(screen.getByRole('button',{name: action === 'delete' ? 'Delete lead' : 'Convert to customer'}));
 fireEvent.click(screen.getByRole('button',{name: action === 'delete' ? 'Confirm Delete' : 'Confirm Convert'}));
 await waitFor(()=>expect(fetch.mock.calls.filter(([url,options])=>!options.method && url.includes('offset=0') && url.includes('status=NEW')).length).toBeGreaterThan(1));
 expect(await screen.findByText('First lead')).toBeInTheDocument();
 expect(screen.getByText('1–1 of 50')).toBeInTheDocument();
 expect(screen.queryByText('51–50 of 50')).not.toBeInTheDocument();
});




import PortalTicketDetails from './portal/PortalTicketDetails.jsx';
it('queues a post-comment read after an in-flight pre-POST portal read', async () => {
 const ticket = {id:'t',title:'Service',description:'Details',status:'OPEN',type:'PC_REPAIR',priority:'MEDIUM',comments:[]};
 const pending=[];
 const fetch = vi.spyOn(globalThis,'fetch').mockImplementation((url,options) => {
  if (options.method === 'POST') return Promise.resolve(response({}));
  if (!pending.length) { pending.push(null); return Promise.resolve(response(ticket)); }
  return new Promise(resolve=>pending.push(resolve));
 });
 render(<MemoryRouter initialEntries={['/tickets/t']}><Routes><Route path="/tickets/:id" element={<PortalTicketDetails/>}/></Routes></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Refresh'}));
 await waitFor(()=>expect(pending).toHaveLength(2));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Posted comment'}});
 fireEvent.click(screen.getByRole('button',{name:/Send|Post/}));
 await waitFor(()=>expect(fetch.mock.calls.some(([,options])=>options.method === 'POST')).toBe(true));
 await act(async()=>{});
 expect(pending).toHaveLength(2);
 await act(async()=>pending[1](response(ticket)));
 await waitFor(()=>expect(pending).toHaveLength(3));
 await act(async()=>pending[2](response({...ticket,comments:[{id:'comment',text:'Posted comment',isInternal:false,author:{name:'Client',roles:['CLIENT']},createdAt:'2026-01-01'}]})));
 expect(await screen.findByText('Posted comment')).toBeInTheDocument();
});



import useVisiblePolling from './components/useVisiblePolling.js';
it('does not lose invalidation between a read settling and its promise cleanup', async () => {
 let resolve;
 const load = vi.fn().mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockResolvedValue(undefined);
 const {result} = renderHook(()=>useVisiblePolling(load));
 await waitFor(()=>expect(load).toHaveBeenCalledTimes(1));
 await act(async()=>{
  resolve();
  queueMicrotask(()=>{ void result.current(true); });
 });
 await waitFor(()=>expect(load).toHaveBeenCalledTimes(2));
});
