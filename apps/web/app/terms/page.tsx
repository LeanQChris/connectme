import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";

export const metadata: Metadata = {
  title: "Terms of Service · ConnectMe",
  description: "Terms and conditions for using ConnectMe omnichannel unified messaging gateway.",
};

export default function TermsPage() {
  return (
    <PageFrame>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-8 border-b border-hairline pb-6">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mute">
            Legal &amp; Compliance
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-[13px] text-mute">
            Last updated: October 5, 2026 · Effective immediately
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-[14px] leading-relaxed text-body">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ConnectMe (&ldquo;the Service&rdquo;), you agree to be bound by these
              Terms of Service. If you are using the Service on behalf of an organization or business,
              you represent and warrant that you have full authority to bind that entity to these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">2. Description of Service</h2>
            <p>
              ConnectMe provides a unified, multi-tenant communication platform allowing businesses
              and organizations to connect, aggregate, and reply to inbound customer messages across
              multiple external messaging channels, including Meta platforms (Facebook Messenger,
              Instagram Direct Messages, WhatsApp Cloud API), Telegram, and Discord.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">
              3. Platform &amp; Channel Partner Compliance
            </h2>
            <p>
              ConnectMe integrates with third-party APIs provided by Meta Platforms, Inc., Telegram
              FZ-LLC, and Discord Inc. When using ConnectMe, you agree to comply with all applicable
              platform policies:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Meta Platform Terms &amp; Developer Policies:</strong> You agree not to send spam,
                unsolicited marketing messages, or violate Meta&apos;s 24-hour standard messaging window
                rules without an approved message tag or template.
              </li>
              <li>
                <strong>WhatsApp Business Messaging Policy:</strong> You must maintain proper opt-in
                consent before initiating business messaging conversations with WhatsApp users.
              </li>
              <li>
                <strong>Instagram &amp; Messenger Community Standards:</strong> You will not use the
                gateway for deceptive practices, harassment, or distribution of illegal content.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">4. Account Security &amp; Access Tokens</h2>
            <p>
              You are responsible for safeguarding your account credentials, Clerk authentication
              sessions, and API access tokens. ConnectMe encrypts all third-party access tokens and
              secrets using industry-standard AES-256-GCM encryption. You must notify us immediately if
              you suspect any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">5. Customer Data &amp; Privacy</h2>
            <p>
              Our collection and processing of data, including message contents, contact profiles, and
              tenant metadata, is governed by our{" "}
              <Link href="/privacy" className="text-ink underline hover:opacity-80">
                Privacy Policy
              </Link>
              . ConnectMe acts solely as a data processor for the conversations you receive through
              connected messaging providers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">6. Service Availability &amp; SLA</h2>
            <p>
              We strive to provide reliable and uninterrupted service. However, ConnectMe depends on
              third-party APIs and network infrastructure. We are not liable for downtime, API rate limits,
              or messaging outages caused by upstream provider disruptions (e.g. Meta Graph API outages,
              Telegram bot disruptions, Cloudflare network maintenance).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">7. Termination</h2>
            <p>
              You may terminate your account at any time by disconnecting your channels and requesting
              data deletion. We reserve the right to suspend or terminate accounts that violate these
              Terms, abuse messaging rate limits, or engage in abusive or malicious behavior.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">8. Contact Us</h2>
            <p>
              If you have any questions regarding these Terms of Service or need platform compliance
              documentation, please contact us at{" "}
              <a
                href="mailto:support@openresume.online"
                className="text-ink underline hover:opacity-80"
              >
                support@openresume.online
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-hairline pt-6 flex items-center justify-between text-[12px] text-mute">
          <span>&copy; {new Date().getFullYear()} ConnectMe Inc.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about" className="hover:text-ink transition-colors">
              About
            </Link>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
