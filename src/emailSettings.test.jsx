import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App.jsx';

const settings = { enabled: false, fromEmail: '', fromName: '', replyTo: '', apiKeyConfigured: false };
const response = (data = settings) => ({ ok: true, status: 200, json: async () => data });
function open(roles = ['ADMIN'], data = settings) {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({ roles }));
  window.history.pushState({}, '', '/admin/settings');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(data));
  render(<App />);
  return fetchMock;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); window.history.pushState({}, '', '/'); });

it('loads safe defaults through the admin settings route without revealing a credential', async () => {
  const fetchMock = open();
  expect(await screen.findByRole('heading', { name: 'App settings' })).toBeInTheDocument();
  expect(await screen.findByLabelText('Sender email')).toHaveValue('');
  expect(screen.getByLabelText('Enable new-lead notifications')).not.toBeChecked();
  expect(screen.getByLabelText('Resend API key')).toHaveAttribute('type', 'password');
  expect(screen.getByLabelText('Resend API key')).toHaveValue('');
  expect(screen.getByText('Not configured')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledWith('/api/settings/email', expect.any(Object));
});

it('rejects technicians at the settings route before requesting settings', async () => {
  const fetchMock = open(['TECHNICIAN'], { leadCount: 0, customerCount: 0, openTicketCount: 0, recentOpenTickets: [] });
  await waitFor(() => expect(window.location.pathname).toBe('/admin'));
  expect(fetchMock.mock.calls.some(([url]) => url === '/api/settings/email')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.queryByRole('link', { name: 'App settings' })).not.toBeInTheDocument();
});

it.each([false, true])('pins admin settings below the scrolling menu (desktop=%s)', async (desktop) => {
  vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: desktop, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  open();
  await screen.findByLabelText('Sender email');
  if (!desktop) fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  const nav = screen.getByRole(desktop ? 'navigation' : 'dialog', { name: 'Workspace navigation' });
  const settingsLink = within(nav).getByRole('link', { name: 'App settings' });
  expect(settingsLink).toHaveAttribute('href', '/admin/settings');
  expect(settingsLink).toHaveAttribute('aria-current', 'page');
  const menu = within(nav).getByTestId('workspace-menu');
  expect(menu).toHaveStyle({ overflowY: 'auto', flex: '1 1 auto', minHeight: '0' });
  expect(menu).not.toContainElement(settingsLink);
  expect(settingsLink.closest('ul')).toHaveStyle({ flexShrink: '0', marginTop: 'auto' });
  fireEvent.click(settingsLink);
  if (!desktop) await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Workspace navigation' })).not.toBeInTheDocument());
});

it('saves edited delivery settings while omitting a blank key and tracks unsaved changes', async () => {
  const initial = { ...settings, fromEmail: 'leads@example.com', apiKeyConfigured: true };
  const fetchMock = open(['ADMIN'], initial);
  await screen.findByLabelText('Sender email');
  expect(screen.getByText('Configured')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Sender name (optional)'), { target: { value: 'Service team' } });
  fireEvent.change(screen.getByLabelText('Reply-to email (optional)'), { target: { value: 'support@example.com' } });
  fireEvent.click(screen.getByLabelText('Enable new-lead notifications'));
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  const edited = { ...initial, enabled: true, fromName: 'Service team', replyTo: 'support@example.com' };
  fetchMock.mockResolvedValueOnce(response(edited));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(await screen.findByText('Email settings saved.')).toBeInTheDocument();
  const put = fetchMock.mock.calls.find(([, options]) => options.method === 'PUT');
  expect(put[0]).toBe('/api/settings/email');
  expect(JSON.parse(put[1].body)).toEqual({ enabled: true, fromEmail: 'leads@example.com', fromName: 'Service team', replyTo: 'support@example.com' });
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
});

it('replaces the key only on explicit entry and clears the password after save', async () => {
  const fetchMock = open();
  const key = await screen.findByLabelText('Resend API key');
  const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
  fireEvent.change(key, { target: { value: 're_test-only-secret' } });
  expect(key).toHaveValue('re_test-only-secret');
  expect(key).toHaveAttribute('autoComplete', 'new-password');
  fetchMock.mockResolvedValueOnce(response({ ...settings, apiKeyConfigured: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await screen.findByText('Email settings saved.');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ enabled: false, fromEmail: '', fromName: '', replyTo: '', apiKey: 're_test-only-secret' });
  expect(key).toHaveValue('');
  expect(storageSpy).not.toHaveBeenCalled();
  expect(window.location.href).not.toContain('re_test-only-secret');
  expect(screen.getByText('Configured')).toBeInTheDocument();
});

it('keeps failed edits private and retryable while preventing duplicate saves', async () => {
  const fetchMock = open();
  fireEvent.change(await screen.findByLabelText('Sender email'), { target: { value: 'leads@example.com' } });
  fireEvent.change(screen.getByLabelText('Resend API key'), { target: { value: 're_private' } });
  let finish;
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  expect(screen.getByLabelText('Sender email')).toBeDisabled();
  finish({ ok: false, status: 500, json: async () => ({ error: 'provider leaked re_private' }) });
  expect(await screen.findByText('Could not save email settings. Please try again.')).toBeInTheDocument();
  expect(screen.queryByText(/provider leaked/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Sender email')).toHaveValue('leads@example.com');
  expect(screen.getByLabelText('Resend API key')).toHaveValue('re_private');
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled();
  fetchMock.mockRejectedValueOnce(new Error('re_private network error'));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save settings' })).toBeEnabled());
  expect(screen.getByLabelText('Resend API key')).toHaveValue('re_private');
});

it('validates sender, optional reply-to, and a key before enabling delivery', async () => {
  const fetchMock = open();
  await screen.findByLabelText('Sender email');
  fireEvent.click(screen.getByLabelText('Enable new-lead notifications'));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(screen.getByText('Enter a valid sender email.')).toBeInTheDocument();
  expect(screen.getByText('Add a Resend API key before enabling notifications.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Sender email'), { target: { value: 'leads@example.com' } });
  fireEvent.change(screen.getByLabelText('Resend API key'), { target: { value: 're_test' } });
  fireEvent.change(screen.getByLabelText('Reply-to email (optional)'), { target: { value: 'invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(screen.getByText('Enter a valid reply-to email or leave it blank.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Reply-to email (optional)'), { target: { value: '' } });
  fetchMock.mockResolvedValueOnce(response({ ...settings, enabled: true, fromEmail: 'leads@example.com', apiKeyConfigured: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await screen.findByText('Email settings saved.');
});

it('shows a safe load failure with retry instead of an editable empty form', async () => {
  const fetchMock = open();
  fetchMock.mockReset().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'provider secret' }) });
  cleanup(); render(<App />);
  expect(screen.getByRole('progressbar', { name: 'Loading email settings' })).toBeInTheDocument();
  expect(await screen.findByText('Could not load email settings. Please try again.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Sender email')).not.toBeInTheDocument();
  expect(screen.queryByText('provider secret')).not.toBeInTheDocument();
  fetchMock.mockResolvedValueOnce(response());
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByLabelText('Sender email')).toHaveValue('');
});

it('explains recipients and Resend setup in a single-column responsive form without sending mail', async () => {
  open();
  await screen.findByLabelText('Sender email');
  expect(screen.getByRole('heading', { name: 'Email · Resend' })).toBeInTheDocument();
  expect(screen.getByText(/all active ADMINs/)).toBeInTheDocument();
  expect(screen.getByText(/verified sender domain/)).toBeInTheDocument();
  expect(screen.getByText(/Leave blank to keep the saved key/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'API key documentation' })).toHaveAttribute('href', 'https://resend.com/docs/dashboard/api-keys/introduction');
  expect(screen.getByRole('link', { name: 'Domain verification guide' })).toHaveAttribute('href', 'https://resend.com/docs/dashboard/domains/introduction');
  expect(screen.getByLabelText('Sender email').closest('form')).toHaveStyle({ display: 'grid', minWidth: '0' });
  expect(screen.queryByRole('button', { name: /test.*email/i })).not.toBeInTheDocument();
});

it('warns on unloading dirty settings and discards changes without a request', async () => {
  const fetchMock = open();
  const email = await screen.findByLabelText('Sender email');
  fireEvent.change(email, { target: { value: 'unsaved@example.com' } });
  fireEvent.change(screen.getByLabelText('Resend API key'), { target: { value: 're_unsaved' } });
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(email).toHaveValue('');
  expect(screen.getByLabelText('Resend API key')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const cleanUnload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(cleanUnload);
  expect(cleanUnload.defaultPrevented).toBe(false);
});
