import { Icons } from "@/components/landing/icons";
import { FaTwitter } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";
import { RiInstagramFill } from "react-icons/ri";

export const BLUR_FADE_DELAY = 0.15;

export const siteConfig = {
  name: "acme.ai",
  description: "Automate your workflow with AI",
  url: "http://localhost:3000",
  keywords: ["SaaS", "Template", "Next.js", "React", "Tailwind CSS"],
  links: {
    email: "support@acme.ai",
    twitter: "https://twitter.com/magicuidesign",
    discord: "https://discord.gg/87p2vpsat5",
    github: "https://github.com/magicuidesign/magicui",
    instagram: "https://instagram.com/magicuidesign/",
  },
  header: [
    {
      trigger: "Features",
      content: {
        main: {
          icon: <Icons.logo className="h-6 w-6" />,
          title: "Everything for client work",
          description:
            "Projects, time tracking, invoices, and feedback in one place.",
          href: "#features",
        },
        items: [
          {
            href: "#features",
            title: "Projects",
            description: "Give every client and project a clear home and status.",
          },
          {
            href: "#features",
            title: "Time tracking",
            description: "Track billable hours without leaving your workflow.",
          },
          {
            href: "#features",
            title: "Invoices & feedback",
            description: "Turn work into invoices and keep client feedback nearby.",
          },
        ],
      },
    },
    {
      trigger: "Solutions",
      content: {
        items: [
          {
            title: "Solo freelancers",
            href: "#solution",
            description: "Stay on top of client work without hiring a project manager.",
          },
          {
            title: "Small teams & studios",
            href: "#solution",
            description: "Keep projects, hours, and invoices aligned across your team.",
          },
          {
            title: "Growing agencies",
            href: "#solution",
            description: "Standardize how your team tracks time and bills clients.",
          },
          {
            title: "Hybrid setups",
            href: "#solution",
            description:
              "Use Lance alongside your existing tools while you transition.",
          },
        ],
      },
    },
  ],
  pricing: [
    {
      name: "Early Access Monthly",
      href: "#",
      price: "$29",
      period: "month",
      yearlyPrice: "$29",
      features: [
        "Unlimited projects & clients",
        "Time tracking & invoicing",
        "Client reviews & approvals",
        "Cancel anytime",
      ],
      description: "Full access. 15-day free trial.",
      buttonText: "Start 15-day free trial",
      isPopular: false,
    },
    {
      name: "Early Access Annual",
      href: "#",
      price: "$290",
      period: "year",
      yearlyPrice: "$290",
      features: [
        "Everything in Monthly",
        "Billed annually",
        "2 months free (pay $290/year)",
        "Early access to new features",
        "Best value",
      ],
      description: "2 months free when billed annually. 15-day free trial.",
      buttonText: "Start 15-day free trial",
      isPopular: true,
    },
  ],
  faqs: [
    {
      question: "What is Lance?",
      answer: (
        <span>
          Lance is a simple workspace for freelancers and agencies to manage
          projects, track time, and send invoices—all in one place. It replaces
          a handful of tools with one calm, focused app.
        </span>
      ),
    },
    {
      question: "How do I get started with Lance?",
      answer: (
        <span>
          Start a free 15‑day trial, add a couple of clients and projects, and
          start tracking your next piece of work in Lance. By the end of the
          week you’ll see exactly how much smoother your admin can be.
        </span>
      ),
    },
    {
      question: "Is Lance only for freelancers?",
      answer: (
        <span>
          Lance is perfect for solo freelancers, contractor teams, and small
          agencies. If you bill clients for your time or projects, Lance will
          feel right at home in your workflow.
        </span>
      ),
    },
    {
      question: "Do I have to move my whole business into Lance on day one?",
      answer: (
        <span>
          Not at all. Most people start by tracking time for one or two clients
          in Lance, then gradually move projects and invoicing over as they get
          comfortable.
        </span>
      ),
    },
    {
      question: "What kind of support do you provide?",
      answer: (
        <span>
          We offer fast email support from real humans who understand client
          work. On higher plans we also provide priority support and help
          setting up your workspace.
        </span>
      ),
    },
  ],
  footer: [
    {
      title: "Product",
      links: [
        { href: "#", text: "Features", icon: null },
        { href: "#", text: "Pricing", icon: null },
        { href: "#", text: "Documentation", icon: null },
        { href: "#", text: "API", icon: null },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "#", text: "About Us", icon: null },
        { href: "#", text: "Careers", icon: null },
        { href: "#", text: "Blog", icon: null },
        { href: "#", text: "Press", icon: null },
        { href: "#", text: "Partners", icon: null },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "#", text: "Community", icon: null },
        { href: "#", text: "Contact", icon: null },
        { href: "#", text: "Support", icon: null },
        { href: "#", text: "Status", icon: null },
      ],
    },
    {
      title: "Social",
      links: [
        {
          href: "#",
          text: "Twitter",
          icon: <FaTwitter />,
        },
        {
          href: "#",
          text: "Instagram",
          icon: <RiInstagramFill />,
        },
        {
          href: "#",
          text: "Youtube",
          icon: <FaYoutube />,
        },
      ],
    },
  ],
};

