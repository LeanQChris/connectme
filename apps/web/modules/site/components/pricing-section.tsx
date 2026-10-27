"use client";

/**
 * Pricing is deliberately not hard-coded with invented figures. Each tier's
 * `price` is null until the real number is confirmed, and renders as
 * "Contact us" until then, so the page can never publish a price nobody agreed
 * to. Set `price` to a string (for example "19") and it renders as "$19".
 */
const TIERS: {
  name: string;
  price: string | null;
  cadence: string;
  summary: string;
  features: string[];
  featured?: boolean;
}[] = [
  {
    name: "Solo",
    price: null,
    cadence: "per workspace",
    summary: "One person answering every channel from one inbox.",
    features: [
      "All five channels on one workspace",
      "Live reply-window countdown",
      "Internal notes and tags",
      "Encrypted provider tokens",
    ],
  },
  {
    name: "Team",
    price: null,
    cadence: "per workspace",
    summary: "Several agents sharing a queue without stepping on each other.",
    featured: true,
    features: [
      "Everything in Solo",
      "Assignment and conversation status",
      "Several pages per channel",
      "Scheduled posts",
      "Keyboard-first triage",
    ],
  },
  {
    name: "Agency",
    price: null,
    cadence: "per workspace",
    summary: "Client workspaces that stay isolated from each other.",
    features: [
      "Everything in Team",
      "Multiple isolated workspaces",
      "Tenant scoping enforced in the data layer",
      "Direct support channel",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <div data-reveal className="max-w-2xl">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[38px]">
            Priced per workspace, not per channel.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-body">
            Connect as many channels as the workspace actually handles. Each tier
            is priced once, with no per-inbox surcharge.
          </p>
        </div>

        <div data-reveal className="mt-10 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`flex flex-col rounded-xl border bg-canvas-elevated p-6 ${
                tier.featured ? "border-ink" : "border-hairline"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-ink">
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span className="rounded-full border border-hairline bg-surface-well px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mute">
                    Most common
                  </span>
                )}
              </div>

              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-[30px] font-semibold leading-none tracking-[-0.035em] text-ink">
                  {tier.price ? `$${tier.price}` : "Contact us"}
                </span>
                {tier.price ? (
                  <span className="font-mono text-[11.5px] text-mute">{tier.cadence}</span>
                ) : null}
              </p>

              <p className="mt-3 text-[13px] leading-relaxed text-body">{tier.summary}</p>

              <ul className="mt-5 space-y-2 border-t border-hairline pt-5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-[13px] leading-snug text-body">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-hairline-strong"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
