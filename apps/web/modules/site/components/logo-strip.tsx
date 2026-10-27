"use client";

/**
 * Customer logo strip.
 *
 * Intentionally empty. Add real customers only: a made-up company name is worse
 * than no social proof at all. Each entry is a Simple Icons slug (see
 * https://simpleicons.org), rendered as a logo and nothing else.
 *
 * Example:
 *   { name: "Northwind", slug: "shopify" }
 *
 * Renders nothing while the list is empty rather than leaving a hollow band.
 */
const CUSTOMERS: { name: string; slug: string }[] = [];

export function LogoStrip() {
  if (CUSTOMERS.length === 0) return null;

  return (
    <section aria-label="Customers" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {CUSTOMERS.map((customer) => (
            <li key={customer.slug}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://cdn.simpleicons.org/${customer.slug}/8f8f8f`}
                alt={customer.name}
                height={26}
                loading="lazy"
                className="h-[26px] w-auto opacity-80"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}