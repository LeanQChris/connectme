import { CONTACT_EMAIL, DocList, DocSection, PageFrame } from "@/components/site/page-frame";

export const metadata = {
  title: "Privacy Policy · ConnectMe",
  description: "What ConnectMe collects, why it collects it, and who can see it.",
};

const UPDATED = "October 2, 2026";

export default function PrivacyPage() {
  return (
    <PageFrame>
      <article className="mx-auto max-w-3xl px-4 py-14">
        <span className="font-mono text-[11px] uppercase tracking-wider text-mute">Legal</span>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[36px]">
          Privacy Policy
        </h1>
        <p className="mt-3 text-[13.5px] text-body">
          Last updated {UPDATED}. This policy explains how ConnectMe (&ldquo;we&rdquo;, the
          &ldquo;Service&rdquo;) handles personal data when you sign in with Google, connect your
          own messaging accounts, and use the unified inbox. You are the controller of the
          conversations you route through the Service; we act as a processor on your behalf.
        </p>

        <div className="mt-10 space-y-6">
          <DocSection title="What we collect">
            <DocList
              items={[
                <>
                  <strong className="font-medium text-ink">Account identity.</strong> Your Google
                  email address, display name, and profile picture, along with the internal user id
                  Clerk issues. Sign-in happens through Google OAuth; we never see your Google
                  password.
                </>,
                <>
                  <strong className="font-medium text-ink">Provider credentials.</strong> The Meta
                  and Telegram tokens you paste into Settings. They are encrypted with AES-256-GCM
                  before being written to the store and are never returned to the browser.
                </>,
                <>
                  <strong className="font-medium text-ink">Conversation content.</strong> Messages
                  inbound from your customers and outbound messages you send, including contact
                  names, channel identifiers (phone numbers, handles, chat ids), timestamps, read
                  and delivery status, internal notes, tags, and assignment or status fields you
                  set.
                </>,
                <>
                  <strong className="font-medium text-ink">Attachments.</strong> Media you upload
                  and media referenced by provider lookaside URLs, including voice notes, images,
                  video, and documents up to 8&nbsp;MB.
                </>,
                <>
                  <strong className="font-medium text-ink">Technical data.</strong> A signed
                  HTTP-only session cookie, the IP address and user agent recorded in our hosting
                  and infrastructure logs, and crash or error output needed to debug a failure.
                </>,
              ]}
            />
          </DocSection>

          <DocSection title="What we do not collect">
            <DocList
              items={[
                "No advertising or cross-site tracking pixels.",
                "No third-party analytics or session-replay SDKs.",
                "No sale or rental of personal data, in any form.",
                "No card or banking details — ConnectMe is not a billing product.",
              ]}
            />
          </DocSection>

          <DocSection title="How we use it">
            <DocList
              items={[
                "Authenticate you, keep your session alive, and mirror your profile on first sign-in.",
                "Normalize inbound provider events, render your inbox, and deliver the replies you send.",
                "Enforce the Meta 24-hour customer-care messaging window so replies are not rejected.",
                "Encrypt, store, and return only your own records; every read and write is scoped to your account.",
                "Detect abuse of the webhook endpoints, such as replayed or forged signatures.",
                "Diagnose errors and keep the Service available.",
              ]}
            />
          </DocSection>

          <DocSection title="Cookies">
            <p>
              ConnectMe sets one strictly necessary cookie: the Clerk session cookie that keeps you
              signed in. It is HTTP-only, signed, and scoped to this app — no script on this page
              can read it. We do not use advertising, preference, or analytics cookies. Theme
              selection is stored in your browser&rsquo;s local storage and never leaves your device.
            </p>
          </DocSection>

          <DocSection title="How we protect it">
            <DocList
              items={[
                "Provider credentials are encrypted at rest with AES-256-GCM under a key that never reaches the browser.",
                "Sessions use signed, HTTP-only cookies; every API route re-checks the session rather than trusting the page.",
                "Webhook payloads are verified with timing-safe HMAC-SHA256 comparisons, so forged events are dropped.",
                "Tenant scoping is enforced in the data layer, so one account can never read another account's conversations.",
                "Data in transit is encrypted with TLS.",
              ]}
            />
          </DocSection>

          <DocSection title="Who else sees your data">
            <p>
              We share the minimum needed to run the Service, with these processors. Each is
              governed by its own terms and privacy policy.
            </p>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
              <li>
                <strong className="font-medium text-ink">Clerk</strong> — identity, sessions, and
                Google OAuth. Sees your email, name, and profile picture.
              </li>
              <li>
                <strong className="font-medium text-ink">Meta Platforms</strong> — WhatsApp Cloud
                API, Messenger Graph API, and Instagram Graph API. Receives the customer messages you
                reply to, under your own Meta credentials.
              </li>
              <li>
                <strong className="font-medium text-ink">Telegram</strong> — Bot API. Receives
                messages sent to your bot, under your own bot token.
              </li>
              <li>
                <strong className="font-medium text-ink">Vercel</strong> (and Vercel KV / Upstash
                Redis in production) — hosting, request logs, and the encrypted store.
              </li>
            </ul>
            <p>
              We do not disclose personal data to third parties for their own purposes. We may
              disclose it if legally required, to protect the rights and safety of anyone, or as
              part of a corporate transaction — with notice to affected users where the law allows.
            </p>
          </DocSection>

          <DocSection title="Retention">
            <DocList
              items={[
                "Conversations, notes, and attachments are kept until you delete them or ask us to delete your account.",
                "Credentials are kept while your account exists, so the Service can keep working.",
                "Infrastructure logs are rotated on a short rolling window, typically under 30 days.",
                "Deleted data is removed from the live store promptly and from backups as those backups age out.",
              ]}
            />
          </DocSection>

          <DocSection title="Your rights">
            <p>
              Depending on where you live, you may have the right to access, correct, export, or
              delete your personal data, to object to or restrict processing, to withdraw consent,
              and to complain to a regulator. Because you control the conversations, we treat those
              records as yours on request. To exercise any of these rights, email us — we respond
              within 30 days. You can also close your browser session at any time using the account
              menu; that signs you out but does not delete stored data, so use the email route for
              deletion.
            </p>
          </DocSection>

          <DocSection title="Children">
            <p>
              The Service is a business tool and is not directed at children. We do not knowingly
              collect data from anyone under 13 (or the minimum age of digital consent in your
              jurisdiction). If you believe a child has signed in, contact us and we will delete the
              account.
            </p>
          </DocSection>

          <DocSection title="Changes to this policy">
            <p>
              When we change this policy we update the date at the top and post the revised version
              here. Material changes affecting existing accounts are announced in the app before they
              take effect.
            </p>
          </DocSection>

          <DocSection title="Contact">
            <p>
              Questions, requests, or concerns about this policy:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-link underline decoration-hairline underline-offset-2 hover:decoration-link"
              >
                {CONTACT_EMAIL}
              </a>
              . Prefer email over any address listed inside the app — we will confirm your identity
              before fulfilling a request.
            </p>
          </DocSection>
        </div>
      </article>
    </PageFrame>
  );
}
