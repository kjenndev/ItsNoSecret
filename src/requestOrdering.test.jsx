import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import AdminCustomers from './admin/AdminCustomers.jsx';
import AdminTickets from './admin/AdminTickets.jsx';
import AdminUsers from './admin/AdminUsers.jsx';
import AdminCustomerDetails from './admin/AdminCustomerDetails.jsx';
import AdminTicketDetails from './admin/AdminTicketDetails.jsx';
// Drive offsets independently of disabled controls to exercise overlapping reads.
vi.mock('./components/Pagination.jsx', () => ({default: ({setOffset, loading}) => <div><button onClick={() => setOffset(50)}>Next offset</button><button onClick={() => setOffset(0)}>First offset</button><span>{loading ? 'Page pending' : 'Page ready'}</span></div>}));
afterEach(() => {cleanup(); vi.restoreAllMocks(); localStorage.clear();});
const response = data => ({ok:true, headers:new Headers({'X-Total-Count':'51','X-Next-Offset':'50'}), json:async()=>data});
const row = name => ({id:'r',name,title:name,description:'Details',email:'r@example.com',roles:['TECHNICIAN'],status:'OPEN',type:'PC_REPAIR',priority:'MEDIUM',customer:{name:'Customer'},comments:[],tickets:[]});
it.each([
 [AdminCustomers,'/api/crm/customers', name => [row(name)]],
 [AdminTickets,'/api/crm/tickets', name => [row(name)]],
 [AdminUsers,'/api/users', name => [row(name)]],
 [AdminCustomerDetails,'/api/crm/customers/r', row],
 [AdminTicketDetails,'/api/crm/tickets/r', name => ({...row('Ticket'), comments:[{id:name,text:name,author:{name:'Staff'},createdAt:'2026-01-01'}]})]
])('ignores reverse-completing offset reads case %#', async (Component, endpoint, data) => {
 localStorage.setItem('user', JSON.stringify({roles:['ADMIN']}));
 const pending=[];
 vi.spyOn(globalThis,'fetch').mockImplementation(url => url.startsWith(endpoint+'?') ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(response([])));
 render(<MemoryRouter initialEntries={['/details/r']}><Routes><Route path="/details/:id" element={<Component/>}/></Routes></MemoryRouter>);
 await waitFor(()=>expect(pending).toHaveLength(1));
 await act(async()=>pending[0](response(data('Initial row'))));
 fireEvent.click(screen.getAllByRole('button',{name:'Next offset'})[0]);
 await waitFor(()=>expect(pending).toHaveLength(2));
 // Loading should be visible, but existing content/controls remain mounted.
 expect(screen.getAllByText('Page pending').length).toBeGreaterThan(0);

 fireEvent.click(screen.getAllByRole('button',{name:'First offset'})[0]);
 await waitFor(()=>expect(pending).toHaveLength(3));
 await act(async()=>pending[2](response(data('Current row'))));
 expect(screen.getAllByText('Current row').length).toBeGreaterThan(0);
 await act(async()=>pending[1](response(data('Stale row'))));
 expect(screen.queryAllByText('Stale row')).toHaveLength(0);
 expect(screen.getAllByText('Current row').length).toBeGreaterThan(0);
});





function NavigateResource() { const navigate = useNavigate(); return <button onClick={()=>navigate('/details/new')}>Another resource</button>; }
it.each([AdminCustomerDetails, AdminTicketDetails])('ignores an older resource response case %#', async Component => {
 const pending=[];
 vi.spyOn(globalThis,'fetch').mockImplementation(url=>url.includes('/users') ? Promise.resolve(response([])) : new Promise(resolve=>pending.push(resolve)));
 render(<MemoryRouter initialEntries={['/details/old']}><NavigateResource/><Routes><Route path="/details/:id" element={<Component/>}/></Routes></MemoryRouter>);
 await waitFor(()=>expect(pending).toHaveLength(1));
 fireEvent.click(screen.getByRole('button',{name:'Another resource'}));
 await waitFor(()=>expect(pending).toHaveLength(2));
 await act(async()=>pending[1](response({...row('New resource'),id:'new'})));
 if (Component === AdminTicketDetails) expect(screen.getByLabelText('Ticket Title')).toHaveValue('New resource');
 else expect(screen.getAllByText('New resource').length).toBeGreaterThan(0);
 await act(async()=>pending[0](response({...row('Old resource'),id:'old'})));
 expect(screen.queryAllByText('Old resource')).toHaveLength(0);
 if (Component === AdminTicketDetails) expect(screen.getByLabelText('Ticket Title')).toHaveValue('New resource');
 else expect(screen.getAllByText('New resource').length).toBeGreaterThan(0);
});
