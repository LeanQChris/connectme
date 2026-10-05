import { CONTACT_EMAIL, DocList, DocSection, PageFrame } from "@/components/site/page-frame";

export const metadata = {
  title: "Terms of Service · ConnectMe",
  description: "Terms and conditions governing the use of ConnectMe and connected messaging services.",
};

const UPDATED = "October 5, 2026";

export default function TermsPage() {
  return (
    <PageFrame>
      <article className="mx-auto max-w-3xl px-4 py-14">
        <span className="font-mono text-[11px] uppercase tracking-wider text-mute">Legal</span>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[36px]">
          Terms of Service
        </h1>
        <p className="mt-3 text-[13.5px] text-body">
          Last updated {UPDATED}. These Terms of Service (&ldquo;Terms&rdquo;) govern your access
          to and use of ConnectMe (&ldquo;we&rdquo;, &ldquo;us&rdquo;, the &ldquo;Service&rdquo;).
          By creating an account or using the Service, you agree to be bound by these Terms. If you
          are using the Service on behalf of an organization, you represent that you have the
          authority to bind that organization to these Terms.
        </p>

        <div className="mt-10 space-y-6">
          <DocSection title="1. Description of the Service">
            <p>
              ConnectMe is a unified omnichannel customer messaging workspace that aggregates
              inbound and outbound communications across third-party platforms, including WhatsApp,
              Facebook Messenger, Instagram Direct, Telegram, and Discord.
            </p>
            <DocList
              items={[
                "You connect your own third-party accounts, pages, or bots via OAuth or API tokens.",
                "ConnectMe normalizes and routes messages to a single workspace interface.",
                "ConnectMe acts as a technical processor on your behalf; you retain full control and ownership of your customer conversations.",
              ]}
            />
          </DocSection>

          <DocSection title="2. Account Registration & Security">
            <DocList
              items={[
                <>
                  <strong className="font-medium text-ink">Account Creation:</strong> You must sign in using a supported identity provider (such as Google via Clerk) and provide accurate, current information.
                </>,
                <>
                  <strong className="font-medium text-ink">Credential Safety:</strong> You are responsible for safeguarding your session credentials, API keys, and connected provider tokens. You must notify us immediately if you suspect unauthorized access.
                </>,
                <>
                  <strong className="font-medium text-ink">Eligibility:</strong> You must be at least 18 years old (or the age of legal majority in your jurisdiction) and legally permitted to use the Service.
                </>,
              ]}
            />
          </DocSection>

          <DocSection title="3. Third-Party Platforms & Compliance">
            <p>
              The Service integrates with platforms operated by third parties (including Meta Platforms, Inc., Telegram, and Discord). Your use of those platforms through ConnectMe is subject to their respective terms and policies:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
              <li>
                <strong className="font-medium text-ink">Meta Platforms:</strong> You agree to comply with the{" "}
                <a
                  href="https://developers.facebook.com/terms/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link underline underline-offset-2 hover:decoration-link"
                >
                  Meta Platform Terms
                </a>
                , the WhatsApp Business Terms of Service, and Meta&rsquo;s 24-hour customer support messaging window.
              </li>
              <li>
                <strong className="font-medium text-ink">Telegram:</strong> You agree to adhere to Telegram&rsquo;s Terms of Service and Bot API policies.
              </li>
              <li>
                <strong className="font-medium text-ink">Discord:</strong> You agree to abide by the Discord Developer Terms of Service and Community Guidelines.
              </li>
            </ul>
            <p>
              We are not responsible for suspensions, rate limits, API modifications, or policy enforcements imposed on your accounts by third-party providers.
            </p>
          </DocSection>

          <DocSection title="4. Acceptable Use Policy">
            <p>You agree NOT to use ConnectMe to:</p>
            <DocList
              items={[
                "Send unsolicited spam, bulk marketing blasts, or abusive/harassing messages in violation of applicable laws (including CAN-SPAM and GDPR) or platform rules.",
                "Distribute malware, phishing scams, fraudulent content, or defamatory materials.",
                "Impersonate another person, business, or entity without authorization.",
                "Interfere with, overload, or disrupt the integrity or security of the Service or its API infrastructure.",
                "Attempt to reverse-engineer, decompile, or breach the security measures of the Service.",
              ]}
            />
          </DocSection>

          <DocSection title="5. Data Ownership & Privacy">
            <p>
              Your use of personal data and conversation histories is governed by our{" "}
              <a
                href="/privacy"
                className="text-link underline underline-offset-2 hover:decoration-link"
              >
                Privacy Policy
              </a>
              . As between you and ConnectMe:
            </p>
            <DocList
              items={[
                "You own all rights, title, and interest in your customer conversation data.",
                "You grant ConnectMe a limited license to transmit, decrypt, display, and process your data strictly to provide and maintain the Service.",
                "You are responsible for obtaining all necessary consents from your end customers before transmitting their personal data through third-party messaging channels.",
              ]}
            />
          </DocSection>

          <DocSection title="6. Service Availability & Modifications">
            <p>
              We strive for continuous reliability and uptime, but the Service is provided on an
              &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. We reserve the right to
              modify, update, or temporarily suspend features for maintenance, security updates, or
              platform improvements.
            </p>
          </DocSection>

          <DocSection title="7. Disclaimer of Warranties">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONNECTME AND ITS AFFILIATES DISCLAIM ALL
              WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT
              LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
              OR COMPLETELY SECURE.
            </p>
          </DocSection>

          <DocSection title="8. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CONNECTME, ITS
              OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, DATA, USE,
              GOODWILL, OR SERVICE INTERRUPTIONS) ARISING OUT OF OR IN CONNECTION WITH YOUR ACCESS
              TO OR INABILITY TO USE THE SERVICE.
            </p>
          </DocSection>

          <DocSection title="9. Termination & Account Deletion">
            <p>
              You may terminate these Terms at any time by disconnecting your accounts and requesting
              account deletion. We may suspend or terminate your access to the Service if you violate
              these Terms, fail to adhere to connected platform policies, or pose a security risk to
              other users. Upon termination, stored provider tokens and messages will be deleted in
              accordance with our data retention policy.
            </p>
          </DocSection>

          <DocSection title="10. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When changes are made, we will update the
              &ldquo;Last updated&rdquo; date at the top. Your continued use of the Service after any
              modifications signifies your acceptance of the revised Terms.
            </p>
          </DocSection>

          <DocSection title="11. Contact Information">
            <p>
              If you have any questions, inquiries, or legal notices concerning these Terms of
              Service, please contact us at:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-link underline decoration-hairline underline-offset-2 hover:decoration-link"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </DocSection>
        </div>
      </article>
    </PageFrame>
  );
}
