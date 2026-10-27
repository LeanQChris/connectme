import Link from "next/link";

import { CONTACT_EMAIL } from "@/components/layout/page-frame";

import {
  LegalDoc,
  LegalList,
  LegalStrong,
  type LegalSection,
  type LegalTakeaway,
} from "./components/legal-doc";

const UPDATED = "October 25, 2026";

const TAKEAWAYS: LegalTakeaway[] = [
  {
    title: "Omnichannel Routing",
    desc: "Single queue aggregating WhatsApp, Messenger, Instagram, Telegram, and Discord.",
  },
  {
    title: "Policy Adherence",
    desc: "Enforces Meta 24-hour messaging limits and platform anti-spam rules automatically.",
  },
  {
    title: "BYO Key Ownership",
    desc: "You maintain ownership of your developer API credentials; we encrypt and store them securely.",
  },
  {
    title: "Fair Use & SLA",
    desc: "Transparent operational limits, rate throttling protections, and reliable cloud uptime.",
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    tags: ["acceptance", "agreement", "binding", "organization"],
    body: (
      <p>
        By creating an account, accessing, or using ConnectMe (&ldquo;the Service&rdquo;), you agree
        to be bound by these Terms of Service. If you are using the Service on behalf of a company,
        organization, or other legal entity, you represent and warrant that you have full legal
        authority to bind that entity to these Terms.
      </p>
    ),
  },
  {
    id: "description-of-service",
    title: "Description of Service",
    tags: ["service", "channels", "meta", "telegram", "discord", "gateway"],
    body: (
      <p>
        ConnectMe provides a unified, multi-tenant team messaging platform allowing businesses to
        connect, route, and reply to inbound customer messages across external messaging networks,
        including WhatsApp Business Cloud API, Facebook Messenger, Instagram Direct, Telegram Bot
        API, and Discord Webhooks &amp; Gateway.
      </p>
    ),
  },
  {
    id: "platform-and-channel-compliance",
    title: "Platform & Channel Partner Compliance",
    tags: ["compliance", "meta", "whatsapp", "24-hour", "spam", "telegram", "discord"],
    body: (
      <>
        <p>
          ConnectMe interacts directly with APIs provided by Meta Platforms, Inc., Telegram FZ-LLC,
          and Discord Inc. You agree to comply with all applicable upstream platform terms and
          developer policies:
        </p>
        <LegalList
          items={[
            <>
              <LegalStrong>Meta Platform Terms &amp; 24-Hour Policy:</LegalStrong> You agree not to
              send spam, unsolicited bulk messages, or attempt to circumvent Meta&apos;s standard
              24-hour customer-care messaging window without utilizing approved message templates or
              tags.
            </>,
            <>
              <LegalStrong>WhatsApp Business Messaging Policy:</LegalStrong> You must maintain
              verifiable opt-in consent before initiating business messaging conversations with
              WhatsApp users.
            </>,
            <>
              <LegalStrong>Community Standards &amp; Acceptable Use:</LegalStrong> You may not use the
              gateway for deceptive practices, harassment, dissemination of malware, or distribution
              of prohibited content.
            </>,
            <>
              <LegalStrong>Telegram &amp; Discord Bot Terms:</LegalStrong> You must comply with
              Telegram&apos;s Bot Terms of Service and Discord&apos;s Developer Terms of Service
              regarding rate limits and user privacy.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "account-security-and-credentials",
    title: "Account Security & Access Tokens",
    tags: ["security", "tokens", "encryption", "aes-256", "credentials"],
    body: (
      <p>
        You are responsible for maintaining the confidentiality of your authentication credentials,
        OAuth sessions, and the third-party API keys you input into ConnectMe. ConnectMe stores
        access tokens and secrets using industry-standard AES-256-GCM encryption. You must notify us
        immediately if you suspect any unauthorized access or breach of your credentials.
      </p>
    ),
  },
  {
    id: "customer-data-and-privacy",
    title: "Customer Data & Privacy Governance",
    tags: ["privacy", "data", "gdpr", "processing"],
    body: (
      <p>
        Our collection and processing of conversation records, contact handles, and workspace
        metadata is governed by our{" "}
        <Link
          href="/privacy"
          className="text-link underline decoration-hairline underline-offset-2 hover:decoration-link font-medium"
        >
          Privacy Policy
        </Link>
        . ConnectMe operates strictly as a data processor for the conversations you process through
        connected messaging providers.
      </p>
    ),
  },
  {
    id: "service-availability-and-sla",
    title: "Service Availability & Upstream SLA",
    tags: ["availability", "sla", "uptime", "rate-limits", "outage"],
    body: (
      <p>
        We strive to ensure continuous, high-performance availability for our webhook routing and
        real-time message sync. However, ConnectMe depends on third-party messaging networks and
        hosting infrastructure. We are not liable for transient downtime, rate throttling, or
        delivery interruptions caused by upstream provider outages (such as Meta Graph API
        degradations or Cloudflare network incidents).
      </p>
    ),
  },
  {
    id: "rate-limits-and-fair-use",
    title: "Rate Limits & Fair Use Policy",
    tags: ["rate-limits", "fair-use", "abuse", "volume"],
    body: (
      <p>
        To preserve reliability and fair resource allocation for all tenants, ConnectMe enforces
        throughput rate limits on webhook ingestion and outbound message dispatch. Workspaces that
        generate abusive traffic patterns, flood webhooks, or attempt Denial of Service attacks may
        experience rate limiting or temporary suspension.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Account Termination & Offboarding",
    tags: ["termination", "cancellation", "offboarding", "deletion"],
    body: (
      <p>
        You may terminate your account at any time by disconnecting your channels in Settings and
        requesting data deletion. We reserve the right to suspend or terminate access for any account
        found in material breach of these Terms, channel partner terms, or engaging in fraudulent
        activity.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law & Dispute Resolution",
    tags: ["law", "jurisdiction", "disputes", "arbitration"],
    body: (
      <p>
        These Terms are governed by and construed in accordance with the laws of the jurisdiction in
        which ConnectMe operates, without giving effect to conflict of laws principles. Any legal
        proceedings arising out of or in connection with these Terms shall be resolved in competent
        courts.
      </p>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Information",
    tags: ["contact", "email", "support", "legal"],
    body: (
      <p>
        For questions regarding these Terms of Service or to request platform compliance
        documentation, contact our legal and support team at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-link underline decoration-hairline underline-offset-2 hover:decoration-link font-medium"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    ),
  },
];

export default function TermsModule() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated={UPDATED}
      activeDoc="terms"
      note="Effective immediately"
      takeaways={TAKEAWAYS}
      intro={
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the ConnectMe
          unified omnichannel messaging gateway and team inbox. Please review them carefully before
          connecting your messaging channels.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
