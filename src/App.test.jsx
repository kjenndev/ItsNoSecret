import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  window.location.hash = '';
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

  it('exposes all required CTAs with the correct phone link', async () => {
    const user = userEvent.setup();
    render(<App />);

    const callLinks = screen.getAllByRole('link', { name: /call now/i });
    expect(callLinks.length).toBeGreaterThanOrEqual(1);
    callLinks.forEach((link) => expect(link).toHaveAttribute('href', 'tel:+12106586964'));

    expect(screen.getAllByRole('link', { name: /schedule service/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /request a free consultation/i }).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getAllByRole('link', { name: /schedule service/i })[0]);
    expect(window.location.hash).toBe('#contact');
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
});
