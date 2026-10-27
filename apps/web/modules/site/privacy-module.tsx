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
    title: "Zero Tracking Pixels",
    desc: "No advertising pixels, third-party analytics SDKs, session replay trackers, or sale of user data.",
  },
  {
    title: "AES-256-GCM Vault",
    desc: "Provider tokens and credentials are encrypted at rest; secrets never reach the browser.",
  },
  {
    title: "Strict Tenant Isolation",
    desc: "Every read and write is scoped to your organization's ID at the database layer.",
  },
  {
    title: "Full Data Control",
    desc: "Disconnect channels or request complete data deletion at any time with 30-day turnaround.",
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    tags: ["collection", "account", "credentials", "meta", "messages", "attachments"],
    body: (
      <LegalList
        items={[
          <>
            <LegalStrong>Account identity.</LegalStrong> Your Google email address, display name, and
            profile picture, along with the internal user id Clerk issues. Sign-in happens through
            Google OAuth; we never see your Google password.
          </>,
          <>
            <LegalStrong>Provider credentials.</LegalStrong> The Meta and Telegram tokens you paste
            into Settings. They are encrypted with AES-256-GCM before being written to the store and
            are never returned to the browser.
          </>,
          <>
            <LegalStrong>Conversation content.</LegalStrong> Messages inbound from your customers and
            outbound messages you send, including contact names, channel identifiers (phone numbers,
            handles, chat ids), timestamps, read and delivery status, internal notes, tags, and
            assignment or status fields you set.
          </>,
          <>
            <LegalStrong>Attachments.</LegalStrong> Media you upload and media referenced by provider
            lookaside URLs, including voice notes, images, video, and documents up to 8&nbsp;MB.
          </>,
          <>
            <LegalStrong>Technical data.</LegalStrong> A signed HTTP-only session cookie, the IP
            address and user agent recorded in our hosting and infrastructure logs, and crash or
            error output needed to debug a failure.
          </>,
        ]}
      />
    ),
  },
  {
    id: "what-we-do-not-collect",
    title: "What we do not collect",
    tags: ["tracking", "advertising", "analytics", "billing", "pixels"],
    body: (
      <LegalList
        items={[
          "No advertising or cross-site tracking pixels from any ad network.",
          "No third-party analytics or session-replay SDKs (no FullStory, Hotjar, or Google Analytics).",
          "No sale or rental of personal data, in any form or to any partner.",
          "No card or banking details. ConnectMe does not process or retain billing instruments.",
        ]}
      />
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    tags: ["purpose", "processing", "meta", "window", "delivery"],
    body: (
      <LegalList
        items={[
          "Authenticate you, keep your session alive, and mirror your profile on first sign-in.",
          "Normalize inbound provider events, render your inbox, and deliver the replies you send.",
          "Enforce the Meta 24-hour customer-care messaging window so replies are not rejected by the Graph API.",
          "Encrypt, store, and return only your own records; every read and write is strictly tenant-scoped.",
          "Detect abuse of the webhook endpoints, such as replayed or forged signatures.",
          "Diagnose errors and maintain high service availability.",
        ]}
      />
    ),
  },
  {
    id: "cookies",
    title: "Cookies & Local Storage",
    tags: ["cookies", "storage", "session", "clerk", "theme"],
    body: (
      <p>
        ConnectMe sets one strictly necessary cookie: the Clerk session cookie that keeps you signed
        in. It is HTTP-only, signed, and scoped to this app. No client-side script can read it. We
        do not use advertising, marketing, or tracking cookies. Theme selection is stored in your
        browser&rsquo;s local storage and never leaves your device.
      </p>
    ),
  },
  {
    id: "how-we-protect-it",
    title: "How we protect your data",
    tags: ["security", "encryption", "aes-256", "hmac", "tls"],
    body: (
      <LegalList
        items={[
          "Provider credentials are encrypted at rest with AES-256-GCM under an encryption key that never reaches the browser.",
          "Sessions use signed, HTTP-only cookies; every API route re-checks the session rather than trusting client state.",
          "Webhook payloads are verified with timing-safe HMAC-SHA256 comparisons, so forged events are dropped immediately.",
          "Tenant scoping is enforced in the database queries, so one workspace can never read another workspace's conversations.",
          "All data in transit is encrypted using modern TLS (Transport Layer Security).",
        ]}
      />
    ),
  },
  {
    id: "who-else-sees-your-data",
    title: "Subprocessors and third parties",
    tags: ["processors", "clerk", "meta", "telegram", "discord", "redis", "cloud"],
    body: (
      <>
        <p>
          We share only the minimum data required to deliver the Service, with these designated
          subprocessors. Each is bound by strict confidentiality and data protection agreements:
        </p>
        <LegalList
          items={[
            <>
              <LegalStrong>Clerk</LegalStrong> handles user authentication, multi-tenant sessions, and
              Google OAuth. Processes your email address, name, and profile picture.
            </>,
            <>
              <LegalStrong>Meta Platforms, Inc.</LegalStrong> powers the WhatsApp Cloud API, Messenger
              Graph API, and Instagram Graph API. Receives the customer messages you send, under your
              own Meta app credentials.
            </>,
            <>
              <LegalStrong>Telegram FZ-LLC</LegalStrong> powers the Telegram Bot API. Receives
              messages sent to and from your bot under your own bot token.
            </>,
            <>
              <LegalStrong>Discord Inc.</LegalStrong> powers Discord bot gateway interactions and
              webhook dispatch under your application client credentials.
            </>,
            <>
              <LegalStrong>Infrastructure Hosts</LegalStrong> (Vercel, managed PostgreSQL, and Redis)
              handle secure computing, application routing, and encrypted state persistence.
            </>,
          ]}
        />
        <p className="mt-3">
          We do not disclose personal data to third parties for commercial or marketing purposes. We
          may disclose records only if legally required by valid subpoena or emergency order.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention & deletion",
    tags: ["retention", "deletion", "export", "backups"],
    body: (
      <LegalList
        items={[
          "Conversations, internal notes, and attachments are retained until you delete them or request workspace deletion.",
          "Connected channel credentials remain in the encrypted vault until you disconnect the channel in Settings.",
          "Infrastructure and error logs are rotated on a rolling window of 30 days or less.",
          "Deleted records are purged from primary databases immediately and cascade out of backups as retention cycles complete.",
        ]}
      />
    ),
  },
  {
    id: "your-rights",
    title: "Your privacy rights (GDPR & CCPA)",
    tags: ["gdpr", "ccpa", "rights", "export", "access", "correction"],
    body: (
      <p>
        Under applicable data protection laws (including GDPR and CCPA), you have the right to
        access, export, rectify, or erase your personal data, as well as restrict or object to its
        processing. Because you control the customer conversations routed through ConnectMe, we treat
        those records as yours on request. To exercise any of these rights, email us directly. We
        verify your identity and fulfill requests within 30 days.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children's privacy",
    tags: ["children", "coppa", "age"],
    body: (
      <p>
        The Service is a professional business communication tool and is not intended for use by
        children under 16 years of age. We do not knowingly collect personal data from minors. If you
        learn that a child has created an account, notify us and we will delete it promptly.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact our privacy team",
    tags: ["contact", "email", "support", "dpo"],
    body: (
      <p>
        For inquiries, data access requests, or privacy concerns, reach out to our team at{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-link underline decoration-hairline underline-offset-2 hover:decoration-link font-medium"
        >
          {CONTACT_EMAIL}
        </a>
        . We confirm identity before fulfilling requests to protect your workspace from unauthorized
        access.
      </p>
    ),
  },
];

export default function PrivacyModule() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated={UPDATED}
      activeDoc="privacy"
      takeaways={TAKEAWAYS}
      intro={
        <p>
          This Privacy Policy describes how ConnectMe (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or the
          &ldquo;Service&rdquo;) collects, uses, and safeguards information when you access our
          omnichannel team inbox. You retain ownership of your customer conversations; ConnectMe acts
          as a secure data processor operating under your direct instructions.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
