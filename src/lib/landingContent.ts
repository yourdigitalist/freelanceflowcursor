/**
 * Shape of editable landing page content (stored in landing_content.content).
 * All text and image URLs for the landing page so admin can edit everything.
 */
export interface LandingContent {
  header: {
    ctaLogin: string;
    ctaTrial: string;
  };
  hero: {
    headline: string;
    subtext: string;
    subtext2: string;
    trialNote: string;
    ctaTrial: string;
    ctaLogin: string;
    ctaSecondary: string;
    imageUrl: string;
  };
  logos: {
    heading: string;
    imageUrls: string[];
  };
  problem: {
    title: string;
    subtitle: string;
    boxes: { icon: string; heading: string; text: string }[];
  };
  solution: {
    title: string;
    subtitle: string;
    description: string;
    boxes: { heading: string; text: string; imageUrl: string }[];
    ctaButtonText: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: { step: string; title: string; bullets: string[] }[];
    footer: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: { title: string; content: string; imageUrl: string }[];
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: { quote: string; name: string; role: string; imageUrl: string }[];
  };
  pricing: {
    title: string;
    subtitle: string;
    planName: string;
    priceMonthly: string;
    priceYearly: string;
    yearlyNote: string;
    trialNote: string;
    features: string[];
    note: string;
    cta: string;
  };
  storage: {
    title: string;
    paragraphs: string[];
    closing: string;
  };
  faq: {
    title: string;
    subtitle: string;
    items: { question: string; answer: string }[];
    contactPrompt: string;
    contactEmail: string;
  };
  trial: {
    title: string;
    bullets: string[];
    closing: string;
  };
  cta: {
    title: string;
    subtext: string;
    buttonText: string;
    bgImageUrl?: string;
    bgMode?: "cover" | "contain";
  };
  footer: {
    aboutText: string;
    contactEmail: string;
    links: { label: string; href: string }[];
    copyright: string;
  };
}

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  header: {
    ctaLogin: 'Login',
    ctaTrial: 'Get started for free',
  },
  hero: {
    headline: 'Run your freelance business in one place',
    subtext: 'Track time, manage projects, and get paid – without juggling twelve different tools.',
    subtext2: '',
    trialNote: '15‑day free trial.',
    ctaTrial: 'Get started for free',
    ctaLogin: 'Login',
    ctaSecondary: '',
    imageUrl: '',
  },
  logos: {
    heading: 'TRUSTED BY BUSY FREELANCERS AND SMALL TEAMS',
    imageUrls: [],
  },
  problem: {
    title: 'Problem',
    subtitle: 'Freelance admin shouldn’t be your full‑time job.',
    boxes: [
      {
        icon: 'brain',
        heading: 'Too many tabs and subscriptions, not enough time',
        text: "Spreadsheets for projects, one app for time, another for invoices… and somehow you're still not sure what's due, when, or for who.",
      },
      {
        icon: 'zap',
        heading: 'Guessing your hours',
        text: 'Reconstructing your week from memory is stressful and usually wrong. You either under‑bill or over‑bill.',
      },
      {
        icon: 'shield',
        heading: 'Chasing payments',
        text: 'Sending invoices, remembering who\'s late, and writing "just bumping this to the top of your inbox" for the 4th time drains your energy and your calendar.',
      },
    ],
  },
  solution: {
    title: 'Solution',
    subtitle: 'Lance takes care of the “business” in your business.',
    description:
      'One light, friendly workspace where projects, time tracking, and invoicing all play nicely together, so you can focus on the work you’re actually hired for.',
    boxes: [
      {
        heading: 'A home for every client',
        text: "Keep projects, notes, files, and timelines in one place. See what's active, what's waiting on the client, and what's done at a glance.",
        imageUrl: '',
      },
      {
        heading: 'Time tracking, accurately',
        text: 'Start a timer once and forget about it. Switch between tasks without losing your place, and turn tracked time into billable hours in a click.',
        imageUrl: '',
      },
      {
        heading: 'Invoicing on autopilot',
        text: "Generate clean, professional invoices from your time logs and project fees. Know exactly who's paid, who's late, and what's coming up.",
        imageUrl: '',
      },
      {
        heading: 'Delight clients with clarity',
        text: "Share clear summaries of hours, deliverables, and status so clients always know what they're paying for, and keep coming back.",
        imageUrl: '',
      },
    ],
    ctaButtonText: 'Get started for free',
  },
  howItWorks: {
    title: 'How it works',
    subtitle: 'Just 3 simple steps to get your freelance business under control',
    steps: [
      {
        step: '1',
        title: 'Set up your workspace',
        bullets: [
          'Add your clients, projects, and rates.',
          'It takes a few minutes and immediately replaces a messy stack of docs and spreadsheets.',
        ],
      },
      {
        step: '2',
        title: 'Track the work you’re already doing',
        bullets: [
          'Start the timer when you begin, stop when you’re done.',
          'Lance organizes your time by client and project automatically.',
        ],
      },
      {
        step: '3',
        title: 'Send invoices and get paid',
        bullets: [
          'Turn tracked time into invoices in a couple of clicks.',
          'Share a clear breakdown, send reminders, and keep cash flow moving without awkward follow‑ups.',
        ],
      },
    ],
    footer: '',
  },
  features: {
    title: 'Features',
    subtitle: 'Everything you need to run client work',
    items: [
      {
        title: 'Projects',
        content:
          'Organize every client, project, and deliverable with clear statuses and due dates, all in one simple view.',
        imageUrl: '',
      },
      {
        title: 'Invoices',
        content:
          'Create clean, branded invoices from your projects and time logs, and see what’s paid or overdue at a glance.',
        imageUrl: '',
      },
      {
        title: 'Time tracking',
        content:
          'Track billable and non‑billable hours without friction, right where you already manage the work.',
        imageUrl: '',
      },
      {
        title: 'Client feedback',
        content:
          'Keep feedback, approvals, and requests next to the work instead of buried in email threads and chat history.',
        imageUrl: '',
      },
    ],
  },
  testimonials: {
    title: 'Testimonials',
    subtitle: 'What our customers are saying',
    items: [
      {
        quote:
          'Before Lance, I had Trello boards, timers, and invoice templates all over the place. Now I open one tab and everything I need to run my studio is there. It feels like I finally have a proper HQ.',
        name: 'Alex Rivera',
        role: 'Freelance Product Designer',
        imageUrl: 'https://randomuser.me/api/portraits/men/91.jpg',
      },
      {
        quote:
          'I used to spend Sunday evenings cleaning up spreadsheets and chasing old invoices. Lance gave me my weekends back. Admin is now a 10‑minute task instead of a two‑hour chore.',
        name: 'Samantha Lee',
        role: 'Marketing Consultant',
        imageUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
      },
      {
        quote:
          'Coordinating a small team of contractors was chaos. With Lance, everyone tracks time the same way and our invoices finally match the work we actually did.',
        name: 'Raj Patel',
        role: 'Agency Owner',
        imageUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
      },
      {
        quote:
          'My clients love the clarity they get from Lance summaries. They can see exactly what I worked on and how long it took, which makes approvals and repeat projects so much easier.',
        name: 'Emily Chen',
        role: 'Brand & Web Designer',
        imageUrl: 'https://randomuser.me/api/portraits/women/83.jpg',
      },
      {
        quote:
          'The first month I used Lance I billed for 8 extra hours I would’ve completely forgotten about. It literally paid for itself in a week.',
        name: 'Michael Brown',
        role: 'Freelance Developer',
        imageUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
      },
      {
        quote:
          'We run dozens of client projects at once. Lance keeps our timelines, hours, and invoices in sync so nothing slips through the cracks when things get busy.',
        name: 'Linda Wu',
        role: 'Operations Manager at a Creative Studio',
        imageUrl: 'https://randomuser.me/api/portraits/women/5.jpg',
      },
      {
        quote:
          'I used to manage projects in email and bill from memory. With Lance, I can confidently show clients exactly what they’re paying for and charge for the value I’m actually delivering.',
        name: 'Carlos Gomez',
        role: 'Content Strategist',
        imageUrl: 'https://randomuser.me/api/portraits/men/14.jpg',
      },
      {
        quote:
          'Switching between campaigns and clients used to be a mess. Lance gives me one clean schedule and a single place to track every billable hour.',
        name: 'Aisha Khan',
        role: 'Social Media Manager',
        imageUrl: 'https://randomuser.me/api/portraits/women/56.jpg',
      },
      {
        quote:
          'I live inside project timelines. Lance keeps our team aligned and makes hand‑offs between producers, designers, and clients feel effortless.',
        name: 'Tom Chen',
        role: 'Studio Producer',
        imageUrl: 'https://randomuser.me/api/portraits/men/18.jpg',
      },
    ],
  },
  pricing: {
    title: 'Pricing',
    subtitle: 'Choose the plan that fits you best',
    planName: 'Early Access',
    priceMonthly: '$29',
    priceYearly: '$290',
    yearlyNote: '2 months free (pay $290/year)',
    trialNote: '15-day free trial.',
    features: [
      'Unlimited projects & clients',
      'Time tracking & invoicing',
      'Client reviews & approvals',
      'Cancel anytime',
    ],
    note: 'Early access pricing.',
    cta: 'Start 15-day free trial',
  },
  storage: {
    title: 'About file storage',
    paragraphs: [
      'Lance includes active storage for client review files.',
      'You can delete old files anytime to free up space. Most freelancers keep long-term assets in Google Drive or similar tools.',
      'Lance is your active workspace, not a file archive.',
    ],
    closing: 'Transparent. In your control.',
  },
  faq: {
    title: 'FAQ',
    subtitle: 'Frequently asked questions',
    items: [
      {
        question: 'What is Lance?',
        answer:
          'Lance is a simple workspace for freelancers and agencies to manage projects, track time, and send invoices—all in one place. It replaces a handful of tools with one calm, focused app.',
      },
      {
        question: 'How do I get started with Lance?',
        answer:
          'Start a free 15‑day trial, add a couple of clients and projects, and start tracking your next piece of work in Lance. By the end of the week you’ll see exactly how much smoother your admin can be.',
      },
      {
        question: 'Is Lance only for freelancers?',
        answer:
          'Lance is perfect for solo freelancers, contractor teams, and small agencies. If you bill clients for your time or projects, Lance will feel right at home in your workflow.',
      },
      {
        question: 'Do I have to move my whole business into Lance on day one?',
        answer:
          'Not at all. Most people start by tracking time for one or two clients in Lance, then gradually move projects and invoicing over as they get comfortable.',
      },
      {
        question: 'What kind of support do you provide?',
        answer:
          'We offer fast email support from real humans who understand client work. On higher plans we also provide priority support and help setting up your workspace.',
      },
    ],
    contactPrompt: 'Still have questions? Email us at',
    contactEmail: 'support@getlance.app',
  },
  trial: {
    title: '',
    bullets: [],
    closing: '',
  },
  cta: {
    title: 'Ready to get started?',
    subtext: 'Start your free trial today.',
    buttonText: 'Get started for free',
    bgImageUrl: '',
    bgMode: 'cover',
  },
  footer: {
    aboutText: 'Get Lance helps freelancers manage projects, time and billing in one place.',
    contactEmail: 'support@getlance.app',
    links: [
      { label: 'Log in', href: '/auth' },
      { label: 'Terms and conditions', href: '/terms' },
      { label: 'Privacy policy', href: '/privacy' },
    ],
    copyright: 'Lance',
  },
};

/** Deep-merge DB content over defaults so partial updates work */
export function mergeLandingContent(partial: Partial<LandingContent> | null): LandingContent {
  if (!partial || typeof partial !== 'object') return DEFAULT_LANDING_CONTENT;
  const merge = <T>(def: T, p?: T): T => {
    if (p == null) return def;
    if (Array.isArray(def) && Array.isArray(p)) return p as T;
    if (typeof def === 'object' && def !== null && typeof p === 'object' && p !== null) {
      const out = { ...def } as Record<string, unknown>;
      for (const k of Object.keys(p as object)) {
        out[k] = merge((def as Record<string, unknown>)[k], (p as Record<string, unknown>)[k]);
      }
      return out as T;
    }
    return p;
  };
  return merge(DEFAULT_LANDING_CONTENT, partial) as LandingContent;
}
