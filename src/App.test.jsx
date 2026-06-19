import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const logoMarkSvg = join(cwd(), 'src/assets/brand/logo-mark.svg');
const serviceIconSvgFiles = [
  'icon-computer-repair.svg',
  'icon-malware-removal.svg',
  'icon-data-recovery.svg',
  'icon-custom-pc.svg',
  'icon-performance.svg',
  'icon-business-support.svg',
  'icon-training.svg',
].map((fileName) => join(cwd(), 'src/assets/brand', fileName));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  window.location.hash = '';
  window.history.pushState({}, '', '/');
});

const requiredSections = [
  /why choose us/i,
  /services/i,
  /about donald bean/i,
  /testimonials/i,
  /service area/i,
  /contact/i,
];

describe('It’s No Secret marketing site', () => {
  it('renders the required marketing sections and brand promise without unsupported fake claims', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /computer problems solved with careful diagnostics/i })).toBeInTheDocument();
    expect(screen.getAllByText(/finding what others miss/i).length).toBeGreaterThan(0);
    const logo = screen.getByAltText(/it’s no secret computer services magnifying-glass security logo/i);
    expect(logo).toBeInTheDocument();
    expect(logo).not.toHaveAttribute('alt', expect.stringMatching(/finding what others miss/i));
    expect(logo).not.toHaveAttribute('alt', expect.stringMatching(/external|current logo/i));

    requiredSections.forEach((name) => {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /trusted computer help when the stakes feel high/i })).toBeInTheDocument();
    expect(screen.queryByText(/prepared for future customer feedback/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best computer repair in san antonio/i)).not.toBeInTheDocument();
  });

  it('exposes all required CTAs with the correct phone link and opens consultation CTAs in a modal', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'lead_1', status: 'NEW', createdAt: '2026-06-07T00:00:00.000Z' }),
    });
    render(<App />);

    const callLinks = screen.getAllByRole('link', { name: /call now/i });
    expect(callLinks.length).toBeGreaterThanOrEqual(1);
    const expectedPhoneHref = `tel:+1${'210'}${'658'}${'6964'}`;
    callLinks.forEach((link) => expect(link).toHaveAttribute('href', expectedPhoneHref));

    const scheduleServiceLinks = screen.getAllByRole('link', { name: /schedule service/i });
    expect(scheduleServiceLinks.length).toBeGreaterThanOrEqual(1);
    scheduleServiceLinks.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
    const consultationButtons = screen.getAllByRole('button', { name: /request a free consultation/i });
    expect(consultationButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(scheduleServiceLinks[0]);
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByRole('heading', { name: /portal login/i })).toBeInTheDocument();

    cleanup();
    window.history.pushState({}, '', '/');
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /request a free consultation/i })[0]);
    expect(screen.getByRole('dialog', { name: /request a free consultation/i })).toBeInTheDocument();
    expect(screen.getByText(/tell us what is going on and the best way to reach you/i)).toBeInTheDocument();
  });

  it('validates and submits the consultation modal payload to the public leads endpoint', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'lead_1', status: 'NEW', createdAt: '2026-06-07T00:00:00.000Z' }),
    });
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /request a free consultation/i })[0]);
    await user.click(screen.getByRole('button', { name: /send consultation request/i }));
    expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
    expect(screen.getAllByText(/enter an email or phone number/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/please describe what you need help with/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), ' Jane Visitor ');
    await user.type(screen.getByLabelText(/email address/i), ' JANE@EXAMPLE.COM ');
    await user.type(screen.getByLabelText(/message \/ request details/i), ' Laptop will not start. ');
    await user.click(screen.getByRole('button', { name: /send consultation request/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/leads', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Visitor',
        email: 'jane@example.com',
        phone: '',
        preferredContact: 'EITHER',
        serviceNeed: '',
        message: 'Laptop will not start.',
        source: 'CONSULTATION_MODAL',
      }),
    }));
    expect(await screen.findByText(/thanks — your consultation request was sent/i)).toBeInTheDocument();
  });

  it('uses a simplified hero diagnostic summary instead of the busy dashboard image', () => {
    render(<App />);

    const heroPanel = screen.getByTestId('hero-diagnostic-summary');
    expect(heroPanel).toBeInTheDocument();
    expect(within(heroPanel).getByText(/service path/i)).toBeInTheDocument();
    ['Discover', 'Clarify', 'Resolve'].forEach((step) => {
      expect(within(heroPanel).getByText(step)).toBeInTheDocument();
    });
    expect(screen.queryByAltText(/diagnostic dashboard/i)).not.toBeInTheDocument();
  });

  it('keeps the security cue centered inside the magnifying glass lens', () => {
    const logoSource = readFileSync(logoMarkSvg, 'utf8');

    expect(logoSource).toContain('<rect x="178" y="169" width="76" height="76"');
    expect(logoSource).toContain('M177 169v-11c0-22 17-39 39-39s39 17 39 39v11');
    expect(logoSource).toContain('<circle cx="216" cy="201" r="13"');
  });

  it('gives the header logo subtle bottom breathing room inside the app bar', () => {
    render(<App />);

    const logoHomeLink = screen.getByRole('link', { name: /it’s no secret computer services home/i });
    expect(logoHomeLink).toHaveStyle({ paddingBottom: '8px' });
  });

  it('applies the polished green top accent to similar content cards across the page', () => {
    render(<App />);

    expect(screen.getAllByTestId('polished-accent-card').length).toBeGreaterThanOrEqual(18);
  });

  it('shows an accessible testimonial carousel with real customer controls and indicators', async () => {
    const user = userEvent.setup();
    render(<App />);

    const carousel = screen.getByRole('region', { name: /customer testimonials/i });
    expect(carousel).toBeInTheDocument();
    expect(within(carousel).getByText(/quick turn-around, affordable prices, and quality work/i)).toBeInTheDocument();
    ['S. C.', 'Dom M.', 'TJ Dubois', 'Mauro Perez', 'DJ Ram-Z'].forEach((author) => {
      expect(within(carousel).getByRole('button', { name: new RegExp(`show testimonial from ${author.replace('.', '\\.')}`, 'i') })).toBeInTheDocument();
    });

    expect(within(carousel).getByRole('button', { name: /previous testimonial/i })).toBeInTheDocument();
    await user.click(within(carousel).getByRole('button', { name: /next testimonial/i }));
    expect(within(carousel).getByText(/Donald has built all of my machines in the last 15 years/i)).toBeInTheDocument();
    expect(within(carousel).getByRole('button', { name: /show testimonial from dom m\./i })).toHaveAttribute('aria-current', 'true');
  });

  it('auto-rotates testimonials and supports pausing rotation', () => {
    vi.useFakeTimers();
    render(<App />);

    const carousel = screen.getByRole('region', { name: /customer testimonials/i });
    expect(within(carousel).getByText(/quick turn-around, affordable prices, and quality work/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7500);
    });
    expect(within(carousel).getByText(/Donald has built all of my machines in the last 15 years/i)).toBeInTheDocument();

    fireEvent.click(within(carousel).getByRole('button', { name: /pause testimonial rotation/i }));
    act(() => {
      vi.advanceTimersByTime(7500);
    });
    expect(within(carousel).getByText(/Donald has built all of my machines in the last 15 years/i)).toBeInTheDocument();
  });

  it('keeps the testimonial live announcement clipped to one pixel to prevent page overflow', () => {
    render(<App />);

    const liveRegion = screen.getByText(/showing testimonial from s\. c\./i);
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveStyle({ width: '1px', height: '1px' });
  });

  it('keeps the long Mauro Perez review readable with inline expansion that reveals the full story', async () => {
    const user = userEvent.setup();
    render(<App />);

    const carousel = screen.getByRole('region', { name: /customer testimonials/i });
    await user.click(within(carousel).getByRole('button', { name: /show testimonial from mauro perez/i }));

    expect(within(carousel).getByText(/Donald got all my old files from my old computer/i)).toBeInTheDocument();
    expect(within(carousel).queryByText(/I went with a broken laptop, scared I was going to lose everything/i)).not.toBeInTheDocument();

    await user.click(within(carousel).getByRole('button', { name: /read full story from mauro perez/i }));
    expect(within(carousel).getByText(/I went with a broken laptop, scared I was going to lose everything/i)).toBeInTheDocument();
    expect(within(carousel).getByRole('button', { name: /show less from mauro perez/i })).toBeInTheDocument();
  });

  it('lists the diagnostics-first process and seven service offerings', () => {
    render(<App />);

    ['Diagnose', 'Explain', 'Repair or Recover', 'Verify'].forEach((step) => {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument();
    });

    const services = screen.getByTestId('services-grid');
    expect(within(services).getAllByRole('article')).toHaveLength(7);
    [
      'Computer Repair',
      'Malware Removal',
      'Data Recovery Guidance',
      'Custom PC Builds',
      'Performance Tune-Ups',
      'Small Business Support',
      'Technology Training',
    ].forEach((serviceName) => {
      expect(within(services).getByRole('heading', { name: serviceName })).toBeInTheDocument();
    });
  });

  it('removes internal requirement-explanation copy and uses Kyle-approved Donald Bean wording', () => {
    render(<App />);

    expect(screen.queryByText(/Service copy is intentionally grounded in the provided requirements/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/The site references the provided local service area without overclaiming/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Donald Bean is presented as the accountable local professional behind the work/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Donald Bean is the named professional behind It’s No Secret Computer Services/i)).not.toBeInTheDocument();

    expect(screen.getByText(/Donald Bean is the local professional behind the work/i)).toBeInTheDocument();
    expect(screen.getByText(/Donald Bean is the professional behind It’s No Secret Computer Services/i)).toBeInTheDocument();
  });

  it('shows the top trust badges as larger icon-only cards without visible text labels', () => {
    render(<App />);

    const trustIndicators = screen.getByRole('region', { name: /trust indicators/i });
    [
      'Serving clients since 2003',
      'Owner-operated accountability',
      'San Antonio-area service',
      'Diagnostics-first process',
    ].forEach((label) => {
      expect(within(trustIndicators).queryByText(label)).not.toBeInTheDocument();
    });
    within(trustIndicators).getAllByTestId('trust-badge-frame').forEach((frame) => {
      expect(frame).toHaveStyle({ aspectRatio: '260 / 96' });
    });
    within(trustIndicators).getAllByTestId('trust-badge-icon').forEach((badge) => {
      expect(badge).toHaveStyle({ width: '80%' });
    });
  });

  it('centers transparent service icons', () => {
    render(<App />);

    const services = screen.getByTestId('services-grid');
    within(services).getAllByTestId('service-icon-frame').forEach((frame) => {
      expect(frame).toHaveAttribute('style', expect.stringContaining('margin-left: auto'));
      expect(frame).toHaveAttribute('style', expect.stringContaining('margin-right: auto'));
      expect(frame).toHaveAttribute('style', expect.stringContaining('background-color: transparent'));
    });
    within(services).getAllByTestId('service-line-icon').forEach((icon) => {
      expect(icon).toHaveStyle({ width: '82px', height: '82px' });
    });
  });

  it('keeps service icon SVG assets free of opaque background panels', () => {
    serviceIconSvgFiles.forEach((filePath) => {
      const svgSource = readFileSync(filePath, 'utf8');
      expect(svgSource).not.toContain('<rect width="96" height="96" rx="20" fill="#07111F"/>');
    });
  });

  it('lets any signed-in user update their own account credentials', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 'user_1', name: 'Current User', email: 'current@example.com', roles: ['CLIENT'] }));
    window.history.pushState({}, '', '/portal/account');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
      if (url === '/api/users/me' && options.method === 'PUT') {
        expect(JSON.parse(options.body)).toEqual({
          name: 'Updated User',
          email: 'updated@example.com',
          currentPassword: 'old-password',
          newPassword: 'new-password-123',
          confirmNewPassword: 'new-password-123',
        });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token: 'new-token',
            user: { id: 'user_1', name: 'Updated User', email: 'updated@example.com', roles: ['CLIENT'] },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: /account settings/i })).toBeInTheDocument();
    expect(screen.getByText(/update your login email, display name, or password/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), 'Updated User');
    await user.clear(screen.getByLabelText(/email address/i));
    await user.type(screen.getByLabelText(/email address/i), 'updated@example.com');
    await user.type(screen.getByLabelText(/^current password/i), 'old-password');
    await user.type(screen.getByLabelText(/^new password/i), 'new-password-123');
    await user.type(screen.getByLabelText(/confirm new password/i), 'new-password-123');
    await user.click(screen.getByRole('button', { name: /save credentials/i }));

    expect(await screen.findByText(/credentials updated/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/users/me', expect.objectContaining({ method: 'PUT' }));
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(JSON.parse(localStorage.getItem('user'))).toMatchObject({ name: 'Updated User', email: 'updated@example.com' });
  });

  it('shows dashboard lead, customer, and open ticket counts on one row plus open tickets table', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin User', email: 'admin@example.com', roles: ['ADMIN'] }));
    window.history.pushState({}, '', '/admin');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const payloads = {
        '/api/crm/leads': [
          { id: 'lead_1', name: 'Fresh Lead', status: 'NEW' },
          { id: 'lead_2', name: 'Qualified Lead', status: 'QUALIFIED' },
          { id: 'lead_3', name: 'Converted Lead', status: 'CONVERTED' },
        ],
        '/api/crm/customers': [
          { id: 'customer_1', name: 'Jane Customer' },
          { id: 'customer_2', name: 'Bob Customer' },
        ],
        '/api/crm/tickets': [
          {
            id: 'ticket_open',
            title: 'Computer will not boot',
            description: 'Needs diagnosis.',
            status: 'OPEN',
            priority: 'HIGH',
            type: 'PC_REPAIR',
            customer: { name: 'Jane Customer' },
            createdAt: '2026-06-07T00:00:00.000Z',
          },
          {
            id: 'ticket_progress',
            title: 'Slow laptop cleanup',
            description: 'Malware removal in progress.',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            type: 'MALWARE_REMOVAL',
            customer: { name: 'Bob Customer' },
            createdAt: '2026-06-08T00:00:00.000Z',
          },
          {
            id: 'ticket_closed',
            title: 'Closed ticket should not show',
            description: 'Already complete.',
            status: 'CLOSED',
            priority: 'LOW',
            type: 'OTHER',
            customer: { name: 'Closed Customer' },
            createdAt: '2026-06-09T00:00:00.000Z',
          },
        ],
      };
      return { ok: true, status: 200, json: async () => payloads[url] ?? [] };
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: /staff dashboard/i })).toBeInTheDocument();
    const countsRow = screen.getByTestId('dashboard-counts-row');
    expect(countsRow).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
    const countCards = within(countsRow).getAllByTestId('dashboard-count-card');
    expect(countCards).toHaveLength(3);
    expect(within(countCards[0]).getByRole('heading', { name: /leads/i })).toBeInTheDocument();
    expect(within(countCards[0]).getByText('3')).toBeInTheDocument();
    expect(within(countCards[1]).getByRole('heading', { name: /total customers/i })).toBeInTheDocument();
    expect(within(countCards[1]).getByText('2')).toBeInTheDocument();
    expect(within(countCards[2]).getByRole('heading', { name: /open tickets/i })).toBeInTheDocument();
    expect(within(countCards[2]).getByText('2')).toBeInTheDocument();

    const openTicketsTable = screen.getByRole('table', { name: /open tickets/i });
    expect(within(openTicketsTable).getByText(/computer will not boot/i)).toBeInTheDocument();
    expect(within(openTicketsTable).getByText(/slow laptop cleanup/i)).toBeInTheDocument();
    expect(within(openTicketsTable).queryByText(/closed ticket should not show/i)).not.toBeInTheDocument();
  });


  it('sizes detail page left-column card stacks to 650px on desktop layouts', async () => {
    const detailCustomer = {
      id: 'customer_1',
      name: 'Jane Detail',
      email: 'jane.detail@example.com',
      phone: '210-555-0101',
      address: '123 Main St',
      user: null,
      tickets: [],
    };
    const detailTicket = {
      id: 'ticket_1',
      title: 'Detail page layout check',
      description: 'The left column should be wider and easier to read.',
      status: 'OPEN',
      priority: 'HIGH',
      type: 'PC_REPAIR',
      assignedToId: '',
      assignedTo: null,
      customer: detailCustomer,
      comments: [],
      createdAt: '2026-06-07T00:00:00.000Z',
      updatedAt: '2026-06-07T01:00:00.000Z',
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/crm/customers/customer_1') {
        return { ok: true, status: 200, json: async () => detailCustomer };
      }
      if (url === '/api/crm/tickets/ticket_1' || url === '/api/portal/tickets/ticket_1') {
        return { ok: true, status: 200, json: async () => detailTicket };
      }
      if (url === '/api/crm/users') {
        return { ok: true, status: 200, json: async () => [] };
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    const assertLeftColumnWidth = async (route, readyText) => {
      cleanup();
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({ name: 'Admin User', email: 'admin@example.com', roles: ['ADMIN', 'TECHNICIAN'] }));
      window.history.pushState({}, '', route);
      render(<App />);
      expect(await screen.findByText(readyText)).toBeInTheDocument();
      const leftColumn = screen.getByTestId('detail-left-column');
      expect(leftColumn).toHaveStyle({ '--detail-left-column-width': '650px' });
    };

    await assertLeftColumnWidth('/admin/customers/customer_1', /service history/i);
    await assertLeftColumnWidth('/admin/tickets/ticket_1', /classification/i);
    await assertLeftColumnWidth('/portal/tickets/ticket_1', /service info/i);
  });

  it('adds Leads navigation and renders lead rows in the admin portal', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin User', email: 'admin@example.com', roles: ['ADMIN'] }));
    window.history.pushState({}, '', '/admin/leads');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([{
        id: 'lead_1',
        name: 'Jane Visitor',
        email: 'jane@example.com',
        phone: '210-555-0100',
        preferredContact: 'EMAIL',
        serviceNeed: 'Computer Repair',
        message: 'Laptop will not start and needs diagnosis.',
        source: 'CONSULTATION_MODAL',
        status: 'NEW',
        createdAt: '2026-06-07T00:00:00.000Z',
        convertedCustomer: null,
      }]),
    });

    render(<App />);

    expect(screen.getByRole('button', { name: /leads/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /leads/i })).toBeInTheDocument();
    expect(screen.getByText(/review consultation requests and convert qualified leads into customers/i)).toBeInTheDocument();
    expect(await screen.findByText(/jane visitor/i)).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convert to customer/i })).toBeInTheDocument();
  });

  it('calls admin lead edit, delete, and convert endpoints from the Leads page', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin User', email: 'admin@example.com', roles: ['ADMIN'] }));
    window.history.pushState({}, '', '/admin/leads');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
      if (url === '/api/crm/leads' && !options.method) {
        return {
          ok: true,
          status: 200,
          json: async () => ([{
            id: 'lead_1',
            name: 'Jane Visitor',
            email: 'jane@example.com',
            phone: '210-555-0100',
            preferredContact: 'EMAIL',
            serviceNeed: 'Computer Repair',
            message: 'Laptop will not start.',
            source: 'CONSULTATION_MODAL',
            status: 'NEW',
            notes: '',
            createdAt: '2026-06-07T00:00:00.000Z',
            convertedCustomer: null,
          }]),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          lead: { id: 'lead_1', name: 'Jane Visitor', status: 'CONVERTED' },
          customer: { id: 'customer_1', name: 'Jane Visitor' },
          createdCustomer: true,
          alreadyConverted: false,
        }),
      };
    });

    render(<App />);
    expect(await screen.findByText(/jane visitor/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit lead/i }));
    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), 'Jane Visitor Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/leads/lead_1', expect.objectContaining({ method: 'PUT' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /convert to customer/i }));
    await user.click(screen.getByRole('button', { name: /confirm convert/i }));
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/leads/lead_1/convert', expect.objectContaining({ method: 'POST' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete lead/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(fetchMock).toHaveBeenCalledWith('/api/crm/leads/lead_1', expect.objectContaining({ method: 'DELETE' }));
  });
});
