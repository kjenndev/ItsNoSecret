import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AdminLeads from './admin/AdminLeads.jsx';
import AdminCustomers from './admin/AdminCustomers.jsx';
import AdminCustomerDetails from './admin/AdminCustomerDetails.jsx';
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
const customer = { id: 'customer-a', name: 'Ada Customer', createdAt: '2026-01-01', tickets: [] };
const response = (data, total = 1, next = '') => ({ ok: true, status: 200, headers: new Headers({ 'X-Total-Count': String(total), 'X-Next-Offset': String(next) }), json: async () => data });
function open(page = 'list', role = 'ADMIN', implementation) {
  localStorage.setItem('user', JSON.stringify({ roles: [role] }));
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(implementation || (async () => response(page === 'list' ? [customer] : customer)));
  render(<MemoryRouter initialEntries={[page === 'list' ? '/admin/customers' : '/admin/customers/customer-a']}><Routes><Route path="/admin/customers" element={page === 'list' ? <AdminCustomers/> : <div>Customer directory</div>}/><Route path="/admin/customers/:id" element={<AdminCustomerDetails/>}/></Routes></MemoryRouter>);
  return fetch;
}
const deletes = fetch => fetch.mock.calls.filter(([, options]) => options.method === 'DELETE');
it('offers admins an explicit named warning and safe cancellation from the list', async () => {
  const fetch = open();
  fireEvent.click(await screen.findByRole('button', { name: 'Delete customer Ada Customer' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Ada Customer');
  expect(dialog).toHaveTextContent(/permanently delete.*customer.*all.*tickets.*comments/i);
  expect(dialog).toHaveTextContent(/leads.*retained/i);
  expect(dialog).toHaveTextContent(/login account.*not.*deleted/i);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(deletes(fetch)).toHaveLength(0);
});

it.each(['list', 'detail'])('restricts %s deletion to admins', async page => {
  open(page, 'TECHNICIAN');
  await screen.findAllByText('Ada Customer');
  expect(screen.queryByRole('button', { name: /Delete customer/i })).not.toBeInTheDocument();
});
it('offers the same confirmation and cancellation on the detail page', async () => {
  const fetch = open('detail');
  fireEvent.click(await screen.findByRole('button', { name: 'Delete customer' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Ada Customer');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(deletes(fetch)).toHaveLength(0);
});

it.each(['list', 'detail'])('confirms the exact customer DELETE and updates the %s', async page => {
  let deleted = false;
  const fetch = open(page, 'ADMIN', async (url, options) => {
    if (options.method === 'DELETE') { deleted = true; return { ok: true, status: 204 }; }
    return response(page === 'list' ? (deleted ? [] : [customer]) : customer);
  });
  fireEvent.click(await screen.findByRole('button', { name: /^Delete customer/ }));
  expect(deletes(fetch)).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await waitFor(() => expect(deletes(fetch)).toHaveLength(1));
  expect(deletes(fetch)[0][0]).toBe('/api/crm/customers/customer-a');
  if (page === 'detail') expect(await screen.findByText('Customer directory')).toBeInTheDocument();
  else await waitFor(() => expect(screen.queryByText('Ada Customer')).not.toBeInTheDocument());
});

it.each([403, 500, 'network'])('keeps safe inline errors in the dialog after %s', async status => {
  open('list', 'ADMIN', async (url, options) => {
    if (options.method !== 'DELETE') return response([customer]);
    if (status === 'network') throw new Error('private database details');
    return { ok: false, status, json: async () => ({ error: 'private database details' }) };
  });
  fireEvent.click(await screen.findByRole('button', { name: /^Delete customer/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(status === 403 ? /permission/i : /unable|connection/i);
  expect(screen.getByRole('dialog')).not.toHaveTextContent('private database details');
  expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeEnabled();
});

it('blocks duplicate submissions, cancel and Escape while deletion is pending', async () => {
  let resolve;
  const fetch = open('list', 'ADMIN', (url, options) => options.method === 'DELETE' ? new Promise(done => { resolve = done; }) : Promise.resolve(response([customer])));
  fireEvent.click(await screen.findByRole('button', { name: /^Delete customer/ }));
  const confirm = screen.getByRole('button', { name: 'Confirm delete' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(deletes(fetch)).toHaveLength(1);
  expect(screen.getByRole('button', { name: /Deleting/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => resolve({ ok: false, status: 500 }));
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
});

it.each(['list', 'detail'])('handles already-deleted customers on %s without a second delete', async page => {
  let deleted = false;
  const fetch = open(page, 'ADMIN', async (url, options) => {
    if (options.method === 'DELETE') { deleted = true; return { ok: false, status: 404 }; }
    return response(page === 'list' ? (deleted ? [] : [customer]) : customer);
  });
  fireEvent.click(await screen.findByRole('button', { name: /^Delete customer/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  if (page === 'detail') expect(await screen.findByText('Customer directory')).toBeInTheDocument();
  else await waitFor(() => expect(screen.queryByText('Ada Customer')).not.toBeInTheDocument());
  expect(deletes(fetch)).toHaveLength(1);
});

it.each([false, true])('does not carry an old detail confirmation or completion into another customer (pending=%s)', async pending => {
  localStorage.setItem('user', JSON.stringify({ roles: ['ADMIN'] }));
  let navigate, resolve;
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options.method === 'DELETE') return new Promise(done => { resolve = done; });
    return Promise.resolve(response(url.includes('customer-b') ? { ...customer, id: 'customer-b', name: 'Bea Customer' } : customer));
  });
  function Navigation() { navigate = useNavigate(); return null; }
  render(<MemoryRouter initialEntries={['/admin/customers/customer-a']}><Navigation/><Routes><Route path="/admin/customers/:id" element={<AdminCustomerDetails/>}/><Route path="/admin/customers" element={<div>Customer directory</div>}/></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete customer' }));
  if (pending) fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await act(async () => navigate('/admin/customers/customer-b'));
  await screen.findAllByText('Bea Customer');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  if (pending) await act(async () => resolve({ ok: true, status: 204 }));
  expect(screen.queryByText('Customer directory')).not.toBeInTheDocument();
  expect(deletes(fetch)).toHaveLength(pending ? 1 : 0);
  if (pending) expect(deletes(fetch)[0][0]).toBe('/api/crm/customers/customer-a');
});

it('refreshes and clamps the list after deleting the only row on its final page', async () => {
  let deleted = false;
  const fetch = open('list', 'ADMIN', async (url, options) => {
    if (options.method === 'DELETE') { deleted = true; return { ok: true, status: 204 }; }
    const last = url.includes('offset=50');
    return response(deleted && last ? [] : [{ ...customer, id: last ? 'last' : 'first', name: last ? 'Last customer' : 'First customer' }], deleted ? 50 : 51, last || deleted ? '' : 50);
  });
  await screen.findByText('First customer');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete customer Last customer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByText('First customer')).toBeInTheDocument();
  expect(screen.getByText('1–1 of 50')).toBeInTheDocument();
  expect(deletes(fetch)[0][0]).toBe('/api/crm/customers/last');
});
it('keeps the captured list target but refreshes the current page after a pending delete', async () => {
  let resolve;
  const fetch = open('list', 'ADMIN', (url, options) => {
    if (options.method === 'DELETE') return new Promise(done => { resolve = done; });
    const last = url.includes('offset=50');
    return Promise.resolve(response([{ ...customer, id: last ? 'last' : 'first', name: last ? 'Last customer' : 'First customer' }], 51, last ? '' : 50));
  });
  await screen.findByText('First customer');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete customer Last customer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous page', hidden: true }));
  await screen.findByText('First customer');
  expect(screen.getByRole('dialog')).toHaveTextContent('Last customer');
  await act(async () => resolve({ ok: true, status: 204 }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(deletes(fetch)[0][0]).toBe('/api/crm/customers/last');
  expect(fetch.mock.calls.at(-1)[0]).toContain('offset=0');
  expect(screen.getByText('First customer')).toBeInTheDocument();
});

it('retains deleted-customer lead history without offering reconversion', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{ id: 'lead', name: 'Historical lead', status: 'CONVERTED', convertedAt: '2026-01-01', convertedCustomerId: null, convertedCustomer: null }]));
  render(<MemoryRouter><AdminLeads/></MemoryRouter>);
  await screen.findByText('Historical lead');
  expect(screen.getByRole('button', { name: 'Convert to customer' })).toBeDisabled();
  expect(screen.getByText('Customer deleted')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Customer:/ })).not.toBeInTheDocument();
});
it('still offers recovery for a genuinely stranded converted lead with neither link nor timestamp', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{ id: 'lead', name: 'Stranded lead', status: 'CONVERTED', convertedAt: null, convertedCustomerId: null, convertedCustomer: null }]));
  render(<MemoryRouter><AdminLeads/></MemoryRouter>);
  await screen.findByText('Stranded lead');
  expect(screen.getByRole('button', { name: 'Convert to customer' })).toBeEnabled();
  expect(screen.queryByText('Customer deleted')).not.toBeInTheDocument();
});
