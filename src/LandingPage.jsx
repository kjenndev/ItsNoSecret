import { useEffect, useMemo, useState } from 'react';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/500.css';

import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import PauseIcon from '@mui/icons-material/Pause';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import PlaceIcon from '@mui/icons-material/Place';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import logoPrimary from './assets/brand/logo-primary.svg';
import logoMark from './assets/brand/logo-mark.svg';
import RequestConsultationModal from './components/RequestConsultationModal.jsx';
import badgeSince from './assets/brand/badge-since-2003.svg';
import badgeOwner from './assets/brand/badge-owner-operated.svg';
import badgeLocal from './assets/brand/badge-local-sa.svg';
import badgeDiagnostics from './assets/brand/badge-diagnostics-first.svg';
import iconComputerRepair from './assets/brand/icon-computer-repair.svg';
import iconMalwareRemoval from './assets/brand/icon-malware-removal.svg';
import iconDataRecovery from './assets/brand/icon-data-recovery.svg';
import iconCustomPc from './assets/brand/icon-custom-pc.svg';
import iconPerformance from './assets/brand/icon-performance.svg';
import iconBusinessSupport from './assets/brand/icon-business-support.svg';
import iconTraining from './assets/brand/icon-training.svg';

const phoneDisplay = '(210) 658-6964';
const phoneHref = `tel:+1${'210'}${'658'}${'6964'}`;

const navLinks = [
  ['Why', '#why'],
  ['Services', '#services'],
  ['About', '#about'],
  ['Contact', '#contact'],
];

const trustBadges = [
  { src: badgeSince, alt: 'Since 2003 trust badge', label: 'Serving clients since 2003' },
  { src: badgeOwner, alt: 'Owner operated trust badge', label: 'Owner-operated accountability' },
  { src: badgeLocal, alt: 'Local San Antonio area trust badge', label: 'San Antonio-area service' },
  { src: badgeDiagnostics, alt: 'Diagnostics first trust badge', label: 'Diagnostics-first process' },
];

const services = [
  {
    name: 'Computer Repair',
    icon: iconComputerRepair,
    copy: 'Troubleshooting and repair for everyday hardware, software, startup, and stability problems.',
  },
  {
    name: 'Malware Removal',
    icon: iconMalwareRemoval,
    copy: 'Careful cleanup for suspicious behavior, unwanted pop-ups, and security concerns without scare tactics.',
  },
  {
    name: 'Data Recovery Guidance',
    icon: iconDataRecovery,
    copy: 'Practical next steps when files are missing, drives are failing, or backups need to be reviewed.',
  },
  {
    name: 'Custom PC Builds',
    icon: iconCustomPc,
    copy: 'Purpose-fit system planning, assembly guidance, and setup for home, work, or performance needs.',
  },
  {
    name: 'Performance Tune-Ups',
    icon: iconPerformance,
    copy: 'Identify bottlenecks, reduce slowdowns, and tune systems around how you actually use them.',
  },
  {
    name: 'Small Business Support',
    icon: iconBusinessSupport,
    copy: 'Dependable computer help for local teams that need clear answers and minimal downtime.',
  },
  {
    name: 'Technology Training',
    icon: iconTraining,
    copy: 'Patient, practical guidance that helps people feel more confident with their computers and tools.',
  },
];

const processSteps = [
  ['01', 'Diagnose', 'Look closely at symptoms, history, and system behavior before recommending a fix.'],
  ['02', 'Explain', 'Translate findings into plain language so you know what matters and what can wait.'],
  ['03', 'Repair or Recover', 'Take the agreed next step, from repair and cleanup to recovery guidance or replacement planning.'],
  ['04', 'Verify', 'Confirm the issue is resolved and review practical prevention steps before wrapping up.'],
];

const heroSummarySteps = [
  ['Discover', 'Listen, inspect, and identify the root cause.'],
  ['Clarify', 'Share a clear plan before repair decisions.'],
  ['Resolve', 'Fix the issue and verify the system is ready.'],
];

function SectionHeading({ eyebrow, title, body }) {
  return (
    <Stack spacing={1.5} sx={{ maxWidth: 760, mb: { xs: 4, md: 6 } }}>
      <Typography
        component="h2"
        sx={{
          color: 'secondary.light',
          fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
        }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 44 } }}>
        {title}
      </Typography>
      {body ? (
        <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 18 }, lineHeight: 1.65 }}>
          {body}
        </Typography>
      ) : null}
    </Stack>
  );
}

function CtaButtons({ stacked = false, onRequestConsultation }) {
  return (
    <Stack direction={{ xs: 'column', sm: stacked ? 'column' : 'row' }} spacing={1.5} sx={{ width: '100%' }}>
      <Button component={Link} href={phoneHref} variant="contained" startIcon={<PhoneInTalkIcon />} aria-label="Call Now">
        Call Now {phoneDisplay}
      </Button>
      <Button component={Link} href="#contact" variant="outlined" endIcon={<ArrowForwardIcon />} aria-label="Schedule Service">
        Schedule Service
      </Button>
      <Button type="button" onClick={onRequestConsultation} variant="text" color="secondary" endIcon={<ArrowForwardIcon />} aria-label="Request a Free Consultation">
        Request a Free Consultation
      </Button>
    </Stack>
  );
}

const polishedAccentSx = {
  position: 'relative',
  borderTop: '3px solid rgba(46,230,166,.78)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -3,
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, #2EE6A6 0%, #38D6FF 58%, rgba(56,214,255,0) 100%)',
    opacity: 0.9,
  },
};

function PolishedCard({ children, sx = {}, ...props }) {
  return (
    <Card data-testid="polished-accent-card" {...props} sx={{ ...polishedAccentSx, ...sx }}>
      {children}
    </Card>
  );
}

const testimonialRotationMs = 7500;

const testimonials = [
  {
    id: 'sc',
    author: 'S. C.',
    label: 'Computer service customer',
    theme: 'Quick turnaround',
    quote:
      'Very convenient computer services. Quick turn-around, affordable prices, and quality work! I’ll be calling Donald for help with my computers in the future!',
  },
  {
    id: 'dom-m',
    author: 'Dom M.',
    label: 'Custom PC customer',
    theme: 'Reliable custom builds',
    quote:
      'Donald has built all of my machines in the last 15 years, and all have been super reliable. He’s offered quick turnaround time and was very thorough in specifying parts for the right price. Super affordable and quality service.',
  },
  {
    id: 'tj-dubois',
    author: 'TJ Dubois',
    label: 'Data recovery customer',
    theme: 'Data saved',
    quote:
      'Incredibly helpful and useful insight and info! Truly a hidden gem in the community, and saved my data! Can’t say enough great things!',
  },
  {
    id: 'mauro-perez',
    author: 'Mauro Perez',
    label: 'File transfer customer',
    theme: 'Everything transferred',
    isLong: true,
    excerpt:
      'Donald got all my old files from my old computer and put everything on my new computer. Basically, he saved my life — I thought I was going to lose everything.',
    quote:
      'I went with a broken laptop, scared I was going to lose everything I worked so hard on. I thought the computer broke, but it was just the screen. I bought a new computer from Best Buy because my old computer, with all my files and work on it, was close to 10 years old. This computer wizard and technology guru got all my old files from my old computer and put everything — I mean everything — on my new computer. Basically, he saved my life. I thought I was going to die if I lost all those files. Would I go to him again? I’ll go to him as long as he’s in business. I don’t want to go to any other technology and computer people but him.',
  },
  {
    id: 'dj-ram-z',
    author: 'DJ Ram-Z',
    label: 'Computer service customer',
    theme: 'Honest quality service',
    quote:
      'I’ve known Donald for years and anytime I’ve had an issue with my computer, this is the man I come to! His turnaround time is quick, he’s honest and his quality is top notch. To top it off, he’s easy to talk to and a solid human being through and through! If you live in or close to San Antonio and your computer needs some lovin, look no further!',
  },
];

function TestimonialsCarousel() {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [liveMessage, setLiveMessage] = useState('Showing testimonial from S. C.');

  const activeTestimonial = testimonials[activeIndex];
  const isExpanded = expandedReviewId === activeTestimonial.id;
  const shouldRotate = !reduceMotion && !isUserPaused && !isInteractionPaused && !expandedReviewId;

  const showTestimonial = (nextIndex, announce = true) => {
    const normalizedIndex = (nextIndex + testimonials.length) % testimonials.length;
    setActiveIndex(normalizedIndex);
    setExpandedReviewId(null);
    setIsUserPaused(true);
    if (announce) {
      setLiveMessage(`Showing testimonial from ${testimonials[normalizedIndex].author}`);
    }
  };

  const visibleQuote = useMemo(() => {
    if (activeTestimonial.isLong && !isExpanded) {
      return activeTestimonial.excerpt;
    }
    return activeTestimonial.quote;
  }, [activeTestimonial, isExpanded]);

  useEffect(() => {
    if (!shouldRotate) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % testimonials.length);
    }, testimonialRotationMs);
    return () => window.clearInterval(intervalId);
  }, [shouldRotate]);

  useEffect(() => {
    const handleVisibilityChange = () => setIsInteractionPaused(document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const controlSx = {
    width: 46,
    height: 46,
    border: '1px solid rgba(56,214,255,.34)',
    bgcolor: 'rgba(11,23,40,.72)',
    color: 'text.primary',
    '&:hover': { borderColor: 'rgba(46,230,166,.72)', bgcolor: 'rgba(16,36,59,.92)' },
    '&:focus-visible': { outline: '3px solid rgba(56,214,255,.28)', outlineOffset: 2 },
  };

  return (
    <Box
      role="region"
      aria-label="Customer testimonials"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocus={() => setIsInteractionPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsInteractionPaused(false);
        }
      }}
    >
      <Grid container spacing={{ xs: 3, md: 5 }} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.25} sx={{ height: '100%', justifyContent: 'space-between' }}>
            <Box>
              <SectionHeading
                eyebrow="Testimonials"
                title="Trusted computer help when the stakes feel high."
                body="Real customers call out quick turnaround, honest guidance, reliable builds, and careful file recovery support from Donald Bean."
              />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mt: { xs: -2, md: -4 } }}>
                {['Quick turnaround', 'Data saved', 'Reliable custom builds'].map((item) => (
                  <Chip key={item} icon={<CheckCircleOutlineIcon />} label={item} sx={{ bgcolor: 'rgba(46,230,166,.08)' }} />
                ))}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1.25} aria-label="Testimonial carousel controls">
              <IconButton aria-label="Previous testimonial" onClick={() => showTestimonial(activeIndex - 1)} sx={controlSx}>
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                aria-label={isUserPaused ? 'Resume testimonial rotation' : 'Pause testimonial rotation'}
                onClick={() => setIsUserPaused((paused) => !paused)}
                sx={controlSx}
              >
                {isUserPaused || reduceMotion ? <PlayArrowIcon /> : <PauseIcon />}
              </IconButton>
              <IconButton aria-label="Next testimonial" onClick={() => showTestimonial(activeIndex + 1)} sx={controlSx}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <PolishedCard
            component="article"
            aria-labelledby={`testimonial-author-${activeTestimonial.id}`}
            sx={{
              minHeight: { xs: 390, sm: 360, md: isExpanded ? 450 : 390 },
              overflow: 'hidden',
              borderColor: 'rgba(56,214,255,.28)',
              background:
                'radial-gradient(circle at 90% 0%, rgba(46,230,166,.12), transparent 20rem), linear-gradient(145deg, rgba(16,36,59,.92), rgba(11,23,40,.96))',
              transition: reduceMotion ? 'none' : 'min-height .2s ease, border-color .2s ease',
              '&:hover': { borderColor: 'rgba(56,214,255,.45)' },
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 4.5 }, position: 'relative', minHeight: 'inherit', display: 'flex', flexDirection: 'column' }}>
              <FormatQuoteIcon aria-hidden="true" sx={{ position: 'absolute', top: 18, right: 22, fontSize: { xs: 58, md: 86 }, color: 'rgba(56,214,255,.16)' }} />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 3, pr: 7 }}>
                <Chip label="Customer review" size="small" color="secondary" variant="outlined" />
                <Chip label={activeTestimonial.theme} size="small" sx={{ bgcolor: 'rgba(46,230,166,.08)' }} />
              </Stack>
              <Typography
                component="blockquote"
                sx={{
                  m: 0,
                  fontSize: { xs: 17, sm: 19, md: activeTestimonial.isLong ? 20 : 22 },
                  lineHeight: { xs: 1.65, md: 1.72 },
                  color: 'text.primary',
                  maxWidth: 760,
                }}
              >
                “{visibleQuote}”
              </Typography>
              {activeTestimonial.isLong ? (
                <Button
                  color="secondary"
                  onClick={() => setExpandedReviewId(isExpanded ? null : activeTestimonial.id)}
                  aria-label={isExpanded ? `Show less from ${activeTestimonial.author}` : `Read full story from ${activeTestimonial.author}`}
                  sx={{ alignSelf: 'flex-start', mt: 2, px: 0 }}
                >
                  {isExpanded ? 'Show less' : 'Read full story'}
                </Button>
              ) : null}
              <Box sx={{ mt: 'auto', pt: 3 }}>
                <Typography id={`testimonial-author-${activeTestimonial.id}`} sx={{ fontWeight: 600, fontSize: 17 }}>
                  {activeTestimonial.author}
                </Typography>
                <Typography color="text.secondary" sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 13, mt: 0.5 }}>
                  {activeTestimonial.label}
                </Typography>
              </Box>
            </CardContent>
          </PolishedCard>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mt: 2.5, flexWrap: 'wrap' }} aria-label="Choose testimonial">
            {testimonials.map((testimonial, index) => (
              <Box
                key={testimonial.id}
                component="button"
                type="button"
                aria-label={`Show testimonial from ${testimonial.author}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => showTestimonial(index)}
                sx={{
                  width: index === activeIndex ? 30 : 12,
                  height: 12,
                  borderRadius: 999,
                  border: '1px solid rgba(56,214,255,.5)',
                  bgcolor: index === activeIndex ? 'secondary.main' : 'rgba(185,199,216,.18)',
                  cursor: 'pointer',
                  transition: reduceMotion ? 'none' : 'width .2s ease, background-color .2s ease',
                  '&:focus-visible': { outline: '3px solid rgba(56,214,255,.28)', outlineOffset: 2 },
                }}
              />
            ))}
          </Stack>
          <Box aria-live="polite" sx={{ position: 'absolute', width: '1px', height: '1px', p: 0, m: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
            {liveMessage}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function LandingPage() {
  const [consultationOpen, setConsultationOpen] = useState(false);
  const openConsultation = () => setConsultationOpen(true);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: '1px solid rgba(32,53,79,.8)',
          bgcolor: 'rgba(5,10,18,.78)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 84, gap: 2, alignItems: 'center' }}>
            <Link
              href="#top"
              aria-label="It’s No Secret Computer Services home"
              style={{ paddingBottom: 8 }}
              sx={{ display: 'inline-flex', alignItems: 'center', pt: 0.5 }}
            >
              <Box
                component="img"
                src={logoPrimary}
                alt="It’s No Secret Computer Services magnifying-glass security logo"
                sx={{ width: { xs: 210, sm: 272 }, height: 'auto', display: 'block' }}
              />
            </Link>
            <Stack direction="row" spacing={2.5} sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' } }}>
              {navLinks.map(([label, href]) => (
                <Link key={href} href={href} color="text.secondary" underline="none" sx={{ '&:hover': { color: 'primary.light' } }}>
                  {label}
                </Link>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ ml: { xs: 'auto', md: 2 } }}>
              <Button component={Link} href="/login" variant="text" color="primary" size="small" aria-label="Portal Login">
                Login
              </Button>
              <Button component={Link} href={phoneHref} variant="outlined" size="small" aria-label="Call Now">
                Call Now
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" id="top">
        <Box component="section" sx={{ pt: { xs: 7, md: 11 }, pb: { xs: 7, md: 12 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 5, md: 7 }} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={3} sx={{ maxWidth: 680 }}>
                  <Chip
                    label="Local Computer Diagnostics & Repair"
                    color="secondary"
                    variant="outlined"
                    sx={{ alignSelf: 'flex-start', borderRadius: 999, fontFamily: '"IBM Plex Mono"' }}
                  />
                  <Typography variant="h1" sx={{ fontSize: { xs: 40, sm: 48, md: 60 } }}>
                    Computer problems solved with careful diagnostics.
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: { xs: 17, md: 20 }, lineHeight: 1.65, maxWidth: 620 }}>
                    It’s No Secret Computer Services helps San Antonio-area clients find the real cause of computer issues. Donald Bean brings a diagnostics-first approach shaped by service since 2003.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {['Finding What Others Miss.', 'Diagnostics-first process'].map((item) => (
                      <Chip key={item} icon={<CheckCircleOutlineIcon />} label={item} sx={{ bgcolor: 'rgba(46,230,166,.08)' }} />
                    ))}
                  </Stack>
                  <CtaButtons onRequestConsultation={openConsultation} />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Card
                  data-testid="hero-diagnostic-summary"
                  aria-label="Diagnostic summary"
                  sx={{
                    borderRadius: { xs: 5, md: 8 },
                    borderColor: 'rgba(56,214,255,.2)',
                    background: 'linear-gradient(145deg, rgba(11,23,40,.98), rgba(7,17,31,.99))',
                    boxShadow: '0 24px 80px rgba(0,0,0,.25)',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: { xs: 460, sm: 490, md: 530 },
                    maxWidth: { xs: 460, md: 'none' },
                    mx: { xs: 'auto', md: 0 },
                    display: 'flex',
                    alignItems: 'stretch',
                  }}
                >
                  <Box
                    component="img"
                    src={logoMark}
                    alt=""
                    aria-hidden="true"
                    sx={{
                      position: 'absolute',
                      width: { xs: 132, sm: 160, md: 190 },
                      right: { xs: -34, sm: -30, md: -26 },
                      top: { xs: -34, sm: -28, md: -24 },
                      opacity: { xs: 0.12, md: 0.14 },
                    }}
                  />
                  <CardContent
                    sx={{
                      width: '100%',
                      pt: { xs: 4.5, sm: 5, md: 6 },
                      pr: { xs: 3, sm: 4, md: 5 },
                      pb: { xs: 4, sm: 4.5, md: 5.5 },
                      pl: { xs: 3.5, sm: 5, md: 5.5 },
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ color: 'secondary.light', fontFamily: '"IBM Plex Mono"', fontSize: { xs: 12, sm: 13 }, letterSpacing: '.12em', textTransform: 'uppercase', mb: 1 }}>
                      Service path
                    </Typography>
                    <Typography variant="h2" sx={{ fontSize: { xs: 28, sm: 32, md: 34 }, maxWidth: { xs: 300, sm: 350, md: 370 }, mb: { xs: 3, md: 3.5 }, lineHeight: 1.16 }}>
                      Clear answers before the fix.
                    </Typography>
                    <Stack spacing={{ xs: 2, sm: 2.25, md: 2.5 }}>
                      {heroSummarySteps.map(([title, body], index) => (
                        <Stack key={title} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              width: { xs: 30, md: 34 },
                              height: { xs: 30, md: 34 },
                              borderRadius: '50%',
                              flex: '0 0 auto',
                              display: 'grid',
                              placeItems: 'center',
                              bgcolor: index === 2 ? 'rgba(46,230,166,.18)' : 'rgba(56,214,255,.13)',
                              border: '1px solid rgba(56,214,255,.2)',
                            }}
                          >
                            <CheckCircleOutlineIcon color="secondary" sx={{ fontSize: { xs: 18, md: 20 } }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
                            <Typography color="text.secondary" sx={{ fontSize: { xs: 14, md: 15 }, lineHeight: 1.45 }}>
                              {body}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Box component="section" aria-label="Trust indicators" sx={{ pb: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={2}>
              {trustBadges.map((badge) => (
                <Grid size={{ xs: 6, sm: 3 }} key={badge.alt}>
                  <PolishedCard sx={{ height: '100%' }}>
                    <CardContent
                      data-testid="trust-badge-frame"
                      style={{ aspectRatio: '260 / 96' }}
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        aspectRatio: '260 / 96',
                        p: { xs: 1, md: 1.5 },
                      }}
                    >
                      <Box data-testid="trust-badge-icon" component="img" src={badge.src} alt={badge.alt} sx={{ width: '80%', maxWidth: 240, height: 'auto', flex: '0 0 auto' }} />
                    </CardContent>
                  </PolishedCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box component="section" id="why" sx={{ py: { xs: 6, md: 11 }, bgcolor: 'rgba(7,17,31,.58)' }}>
          <Container maxWidth="lg">
            <SectionHeading
              eyebrow="Why choose us"
              title="The first job is finding what others miss."
              body="Computer problems are rarely helped by guesswork. This site keeps the promise simple: a careful diagnostic process, plain-language explanations, and owner-operated accountability."
            />
            <Grid container spacing={3}>
              {[
                ['Diagnostics first', 'Recommendations start with observation and testing rather than one-size-fits-all fixes.'],
                ['Plain answers', 'You get clear findings, priorities, and next steps before repair decisions are made.'],
                ['Owner-operated care', 'Donald Bean is the local professional behind the work.'],
              ].map(([title, body]) => (
                <Grid size={{ xs: 12, md: 4 }} key={title}>
                  <PolishedCard sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h3" sx={{ fontSize: 23, mb: 1 }}>
                        {title}
                      </Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
                        {body}
                      </Typography>
                    </CardContent>
                  </PolishedCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box component="section" id="services" sx={{ py: { xs: 6, md: 11 } }}>
          <Container maxWidth="lg">
            <SectionHeading
              eyebrow="Services"
              title="Practical computer help for homes and local businesses."
            />
            <Grid container spacing={3} data-testid="services-grid">
              {services.map((service) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.name}>
                  <PolishedCard component="article" sx={{ height: '100%', transition: 'border-color .2s ease', '&:hover': { borderColor: 'rgba(56,214,255,.45)' } }}>
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <Box data-testid="service-icon-frame" style={{ marginLeft: 'auto', marginRight: 'auto', backgroundColor: 'transparent' }} sx={{ width: 92, height: 92, mb: 2.25, display: 'grid', placeItems: 'center', bgcolor: 'transparent' }}>
                        <Box data-testid="service-line-icon" component="img" src={service.icon} alt={`${service.name} line icon`} sx={{ width: 82, height: 82, display: 'block' }} />
                      </Box>
                      <Typography variant="h3" sx={{ fontSize: 22, mb: 1 }}>
                        {service.name}
                      </Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
                        {service.copy}
                      </Typography>
                    </CardContent>
                  </PolishedCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box component="section" id="about" sx={{ py: { xs: 6, md: 11 }, bgcolor: 'rgba(7,17,31,.58)' }}>
          <Container maxWidth="lg">
            <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <SectionHeading
                  eyebrow="About Donald Bean"
                  title="Local computer service with accountable ownership."
                  body="Donald Bean is the professional behind It’s No Secret Computer Services. The tone is intentionally direct and restrained: careful diagnostics, clear communication, and service for the San Antonio area since 2003."
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <PolishedCard sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.75, mb: 3 }}>
                      When a computer issue keeps coming back, the right answer starts with understanding what changed, what the machine is doing now, and what risk the next step creates. It’s No Secret Computer Services frames every visit around those basics.
                    </Typography>
                    <Divider sx={{ my: 3 }} />
                    <Grid container spacing={2}>
                      {['San Antonio-area support', 'Since 2003', 'Diagnostics before assumptions', 'Clear repair conversations'].map((item) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={item}>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                            <CheckCircleOutlineIcon color="secondary" />
                            <Typography>{item}</Typography>
                          </Stack>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </PolishedCard>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Box component="section" aria-labelledby="process-heading" sx={{ py: { xs: 6, md: 11 } }}>
          <Container maxWidth="lg">
            <SectionHeading eyebrow="Process" title="Diagnose, explain, repair, verify." body="A simple service flow helps clients understand what is happening and reduces guesswork." />
            <Grid container spacing={3}>
              {processSteps.map(([number, title, body]) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={title}>
                  <PolishedCard sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography sx={{ fontFamily: '"IBM Plex Mono"', color: 'secondary.light', mb: 1 }}>{number}</Typography>
                      <Typography variant="h3" sx={{ fontSize: 22, mb: 1 }}>
                        {title}
                      </Typography>
                      <Typography color="text.secondary" sx={{ lineHeight: 1.65 }}>
                        {body}
                      </Typography>
                    </CardContent>
                  </PolishedCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box component="section" id="testimonials" sx={{ py: { xs: 6, md: 11 }, bgcolor: 'rgba(7,17,31,.58)' }}>
          <Container maxWidth="lg">
            <TestimonialsCarousel />
          </Container>
        </Box>

        <Box component="section" id="service-area" sx={{ py: { xs: 6, md: 11 } }}>
          <Container maxWidth="lg">
            <SectionHeading
              eyebrow="Service area"
              title="Computer service for the San Antonio area."
            />
            <PolishedCard>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: { md: 'center' } }}>
                  <PlaceIcon color="secondary" sx={{ fontSize: 44 }} />
                  <Box>
                    <Typography variant="h3" sx={{ fontSize: 24 }}>
                      San Antonio-area computer diagnostics and repair
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.65 }}>
                      Call to discuss your location, the computer problem, and the best next step for service.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </PolishedCard>
          </Container>
        </Box>

        <Box component="section" id="contact" sx={{ py: { xs: 6, md: 11 } }}>
          <Container maxWidth="lg">
            <PolishedCard
              sx={{
                overflow: 'hidden',
                borderColor: 'rgba(56,214,255,.32)',
                background:
                  'radial-gradient(circle at 86% 0%, rgba(46,230,166,.16), transparent 24rem), linear-gradient(135deg, #10243B 0%, #07111F 78%)',
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 6 } }}>
                <Grid container spacing={4} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Typography
                      component="h2"
                      sx={{ color: 'secondary.light', fontFamily: '"IBM Plex Mono"', letterSpacing: '.12em', textTransform: 'uppercase', mb: 1.5 }}
                    >
                      Contact
                    </Typography>
                    <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 46 }, mb: 2 }}>
                      Request a careful look at your computer problem.
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 18, lineHeight: 1.65 }}>
                      Call It’s No Secret Computer Services to schedule service or request a free consultation about your next step.
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <PolishedCard sx={{ bgcolor: 'rgba(5,10,18,.52)' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2.25}>
                          <Typography variant="h3" sx={{ fontSize: 24 }}>
                            Call {phoneDisplay}
                          </Typography>
                          <Typography color="text.secondary">Finding What Others Miss.</Typography>
                          <CtaButtons stacked onRequestConsultation={openConsultation} />
                        </Stack>
                      </CardContent>
                    </PolishedCard>
                  </Grid>
                </Grid>
              </CardContent>
            </PolishedCard>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ py: 4, borderTop: '1px solid #20354F' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
            <Typography color="text.secondary">© {new Date().getFullYear()} It’s No Secret Computer Services. Finding What Others Miss.</Typography>
            <Link href={phoneHref} color="primary.light" underline="hover">
              {phoneDisplay}
            </Link>
          </Stack>
        </Container>
      </Box>
      <RequestConsultationModal open={consultationOpen} onClose={() => setConsultationOpen(false)} />
    </>
  );
}

export default LandingPage;
