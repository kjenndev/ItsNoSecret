import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminUsers from './admin/AdminUsers.jsx';
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); vi.useRealTimers(); window.history.pushState({},'','/'); });
it('user management settles after its initial fetch and preserves the linked customer on edit', async () => {
 localStorage.setItem('user', JSON.stringify({roles:['ADMIN']}));
 const user = {id:'u',name:'Client',email:'client@example.com',roles:['CLIENT'],customer:{id:'c'},createdAt:'2026-01-01'};
 const fetch = vi.spyOn(globalThis,'fetch').mockImplementation(async url => ({ok:true,json:async()=>url.startsWith('/api/users') ? [user] : [{id:'c',name:'Linked customer'}]}));
 render(<MemoryRouter><AdminUsers /></MemoryRouter>);
 await screen.findByText('Client');
 await new Promise(r=>setTimeout(r,80));
 expect(fetch).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getAllByRole('button').find(b=>b.querySelector('[data-testid="EditIcon"]')));
 fireEvent.click(screen.getByRole('button',{name:'Update User'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/users/u',expect.objectContaining({body:expect.stringContaining('"customerId":"c"')})));
});

import ProtectedRoute from './admin/ProtectedRoute.jsx';
import apiFetch from './admin/api.js';
it.each([['CLIENT','/admin','/portal'],['TECHNICIAN','/portal','/admin']])('routes %s away from the wrong workspace', (role,path,destination) => {
 localStorage.setItem('token','token'); localStorage.setItem('user',JSON.stringify({roles:[role]}));
 render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={<ProtectedRoute roles={path==='/admin'?['ADMIN','TECHNICIAN']:['CLIENT']}><div>Forbidden workspace</div></ProtectedRoute>}/><Route path={destination} element={<div>Correct workspace</div>}/></Routes></MemoryRouter>);
 expect(screen.queryByText('Forbidden workspace')).not.toBeInTheDocument();
 expect(screen.getByText('Correct workspace')).toBeInTheDocument();
});
it('clears both parts of an invalid session on 401, but preserves a session on role 403', async()=>{
 localStorage.setItem('token','token'); localStorage.setItem('user','{}');
 vi.spyOn(globalThis,'fetch').mockResolvedValueOnce({status:403}).mockResolvedValueOnce({status:401});
 expect((await apiFetch('/api/crm/customers')).status).toBe(403);
 expect(localStorage.getItem('token')).toBe('token');
 vi.stubGlobal('window', { location: { href: '' } });
 await expect(apiFetch('/api/crm/customers')).rejects.toThrow('Session expired');
 expect(localStorage.getItem('user')).toBeNull();
 vi.unstubAllGlobals();
});

import AdminTicketDetails from './admin/AdminTicketDetails.jsx';
const ticket = {id:'t',title:'Original',description:'Details',status:'OPEN',priority:'MEDIUM',type:'PC_REPAIR',assignedToId:null,customer:{name:'Customer'},comments:[]};
it('posting internal notes preserves ticket draft and unassigned saves as null',async()=>{
 vi.spyOn(window,'alert').mockImplementation(()=>{});
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(url)=>({ok:true,json:async()=>url.includes('/users')?[{id:'staff',name:'Staff',roles:['TECHNICIAN']},{id:'client',name:'Client',roles:['CLIENT']}]:ticket}));
 render(<MemoryRouter initialEntries={['/tickets/t']}><Routes><Route path="/tickets/:id" element={<AdminTicketDetails/>}/></Routes></MemoryRouter>);
 fireEvent.change(await screen.findByLabelText('Ticket Title'),{target:{value:'Unsaved draft'}});
 fireEvent.change(screen.getByPlaceholderText('Add a comment...'),{target:{value:'Private note'}});
 fireEvent.click(screen.getByRole('button',{name:'Post'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/crm/tickets/t/comments',expect.objectContaining({body:JSON.stringify({text:'Private note',isInternal:true})})));
 expect(screen.getByLabelText('Ticket Title')).toHaveValue('Unsaved draft');
 fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/crm/tickets/t',expect.objectContaining({method:'PUT',body:expect.stringContaining('"assignedToId":null')})));
});

import AdminLeads from './admin/AdminLeads.jsx';
it('only conversion action converts a stranded lead and reports linked customer',async()=>{
 vi.spyOn(globalThis,'fetch').mockImplementation(async(url,options={})=>({ok:true,json:async()=>options.method?{customer:{name:'Existing'},createdCustomer:false}:[{id:'l',name:'Stranded',status:'CONVERTED',convertedCustomer:null}]}));
 render(<MemoryRouter><AdminLeads/></MemoryRouter>);
 await screen.findByText('Stranded');
 expect(screen.getByRole('button',{name:'Convert to customer'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Convert to customer'}));
 fireEvent.click(screen.getByRole('button',{name:'Confirm Convert'}));
 expect(await screen.findByText(/linked to existing customer/i)).toBeInTheDocument();
 fireEvent.click(await screen.findByRole('button',{name:'Add Lead'}));
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Status'}));
 expect(screen.queryByRole('option',{name:'Converted'})).not.toBeInTheDocument();
});

it('debounces lead searches and ignores an older response arriving last',async()=>{
 const responses=[];
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(url=>new Promise(resolve=>responses.push({url,resolve})));
 render(<MemoryRouter><AdminLeads/></MemoryRouter>);
 await waitFor(()=>expect(responses).toHaveLength(1));
 fireEvent.change(screen.getByLabelText('Search leads'),{target:{value:'n'}});
 fireEvent.change(screen.getByLabelText('Search leads'),{target:{value:'new'}});
 expect(fetch).toHaveBeenCalledTimes(1);
 await waitFor(()=>expect(responses).toHaveLength(2));
 await act(async()=>responses[1].resolve({ok:true,json:async()=>[{id:'new',name:'New result',status:'NEW'}]}));
 expect(await screen.findByText('New result')).toBeInTheDocument();
 await act(async()=>responses[0].resolve({ok:true,json:async()=>[{id:'old',name:'Old result',status:'NEW'}]}));
 expect(screen.queryByText('Old result')).not.toBeInTheDocument();
 expect(screen.getByText('New result')).toBeInTheDocument();
});

import AdminCustomers from './admin/AdminCustomers.jsx';
it('pages customers explicitly, exposes keyboard links and normalizes a blank optional email',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(url)=>({ok:true,headers:new Headers({'X-Total-Count':'51','X-Next-Offset':url.includes('offset=50')?'':'50'}),json:async()=>[{id:'c',name:url.includes('offset=50')?'Last customer':'First customer'}]}));
 render(<MemoryRouter><AdminCustomers/></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'First customer'})).toHaveAttribute('href','/admin/customers/c');
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 expect(await screen.findByRole('link',{name:'Last customer'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Add Customer'}));
 fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Phone only'}});
 fireEvent.click(screen.getAllByRole('button',{name:'Add Customer'}).at(-1));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/crm/customers',expect.objectContaining({method:'POST',body:expect.stringContaining('"email":null')})));
});

import AdminTickets from './admin/AdminTickets.jsx';
it.each([[AdminUsers,'/api/users'],[AdminTickets,'/api/crm/tickets'],[AdminLeads,'/api/crm/leads']])('pages a bounded staff collection (%s)',async(Component,endpoint)=>{
 localStorage.setItem('user',JSON.stringify({roles:['ADMIN']}));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>({ok:true,headers:new Headers({'X-Total-Count':'51','X-Next-Offset':'50'}),json:async()=>[]}));
 render(<MemoryRouter><Component/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 await waitFor(()=>expect(fetch.mock.calls.some(([url])=>url.startsWith(endpoint+'?')&&url.includes('offset=50'))).toBe(true));
});
it('customer selector reaches another page while retaining an existing linked customer',async()=>{
 localStorage.setItem('user',JSON.stringify({roles:['ADMIN']}));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(url)=>({ok:true,headers:new Headers({'X-Total-Count':'51','X-Next-Offset':url.includes('offset=50')?'':'50'}),json:async()=>url.startsWith('/api/users')?[{id:'u',name:'Client',email:'client@example.com',roles:['CLIENT'],customer:{id:'c',name:'Linked customer'}}]:[{id:url.includes('offset=50')?'last':'first',name:url.includes('offset=50')?'Last choice':'First choice'}]}));
 render(<MemoryRouter><AdminUsers/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:/edit user/i}));
 expect(screen.getByRole('combobox',{name:'Link to CRM Customer'})).toHaveTextContent('Linked customer');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 await waitFor(()=>expect(fetch.mock.calls.some(([url])=>url.includes('/api/crm/customers?')&&url.includes('offset=50'))).toBe(true));
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'Link to CRM Customer'}));
 expect(await screen.findByRole('option',{name:/Last choice/})).toBeInTheDocument();
});

import AdminLayout from './admin/AdminLayout.jsx';
import PortalLayout from './portal/PortalLayout.jsx';
it.each([['staff',AdminLayout,'Customers'],['client',PortalLayout,'My Tickets']])('mobile %s navigation is a dismissible named drawer',async(_name,Layout,link)=>{
 render(<MemoryRouter><Layout/></MemoryRouter>);
 expect(screen.queryByRole('link',{name:link})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Open navigation'}));
 fireEvent.click(await screen.findByRole('link',{name:link}));
 await waitFor(()=>expect(screen.queryByRole('link',{name:link})).not.toBeInTheDocument());
 expect(screen.getByRole('button',{name:'Sign out'})).toBeInTheDocument();
});
it('ticket assignee options are staff-only, paged, and labeled',async()=>{
 vi.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,json:async()=>url.includes('/users')?[{id:'staff',name:'Staff',roles:['TECHNICIAN']},{id:'client',name:'Client',roles:['CLIENT']}]:ticket}));
 render(<MemoryRouter initialEntries={['/tickets/t']}><Routes><Route path="/tickets/:id" element={<AdminTicketDetails/>}/></Routes></MemoryRouter>);
 fireEvent.mouseDown(await screen.findByRole('combobox',{name:'Assigned Technician'}));
 expect(await screen.findByRole('option',{name:'Staff'})).toBeInTheDocument();
 expect(screen.queryByRole('option',{name:'Client'})).not.toBeInTheDocument();
});

import App from './App.jsx';
it('dashboard uses server totals rather than counting bounded collection pages',async()=>{
 localStorage.setItem('token','token');localStorage.setItem('user',JSON.stringify({roles:['ADMIN']}));
 window.history.pushState({},'', '/admin');
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({leadCount:501,customerCount:702,openTicketCount:103,recentOpenTickets:[]})});
 render(<App/>);
 expect(await screen.findByText('501')).toBeInTheDocument();
 expect(screen.getByText('702')).toBeInTheDocument();
 expect(screen.getByText('103')).toBeInTheDocument();
 expect(fetch).toHaveBeenCalledWith('/api/crm/summary',expect.anything());
 window.history.pushState({},'','/');
});

import PortalDashboard from './portal/PortalDashboard.jsx';
it('portal refresh and visible polling serialize requests and pause in hidden tabs',async()=>{
 vi.useFakeTimers();
 let resolve; let count=0;
 vi.spyOn(globalThis,'fetch').mockImplementation(()=>{count++; return count===1?Promise.resolve({ok:true,json:async()=>({name:'Client',tickets:[],openTicketCount:0})}):new Promise(r=>{resolve=r;});});
 render(<MemoryRouter><PortalDashboard/></MemoryRouter>);
 await act(async()=>{});
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
 await act(async()=>{vi.advanceTimersByTime(90000);});
 expect(count).toBe(2);
 await act(async()=>resolve({ok:true,json:async()=>({name:'Client',tickets:[],openTicketCount:0})}));
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
 await act(async()=>{vi.advanceTimersByTime(60000);});
 expect(count).toBe(2);
});
it('account edit exposes an explicit active flag without losing customer link',async()=>{
 localStorage.setItem('user',JSON.stringify({roles:['ADMIN']}));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,json:async()=>url.startsWith('/api/users')?[{id:'u',name:'Client',roles:['CLIENT'],email:'c@example.com',isActive:true,customer:{id:'c'}}]:[]}));
 render(<MemoryRouter><AdminUsers/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Edit user Client'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'Account active'}));
 fireEvent.click(screen.getByRole('button',{name:'Update User'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/users/u',expect.objectContaining({body:expect.stringContaining('"isActive":false')})));
});

import PortalTicketDetails from './portal/PortalTicketDetails.jsx';
import AdminCustomerDetails from './admin/AdminCustomerDetails.jsx';
it.each([
 ['portal tickets',PortalDashboard,'/api/portal/me',{name:'Client',tickets:[]}],
 ['portal comments',PortalTicketDetails,'/api/portal/tickets/t',ticket],
 ['staff comments',AdminTicketDetails,'/api/crm/tickets/t',ticket],
 ['customer history',AdminCustomerDetails,'/api/crm/customers/t',{id:'t',name:'Customer',tickets:[]}]
])('pages %s instead of silently truncating nested rows',async(_name,Component,endpoint,data)=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,headers:new Headers({'X-Total-Count':'51','X-Next-Offset':'50'}),json:async()=>url.includes('/users')?[]:data}));
 render(<MemoryRouter initialEntries={['/details/t']}><Routes><Route path="/details/:id" element={<Component/>}/></Routes></MemoryRouter>);
 await waitFor(()=>expect(screen.getAllByRole('button',{name:'Next page'})[0]).toBeEnabled());
 fireEvent.click(screen.getAllByRole('button',{name:'Next page'})[0]);
 await waitFor(()=>expect(fetch.mock.calls.some(([url])=>url.startsWith(endpoint+'?')&&url.includes('offset=50'))).toBe(true));
});
