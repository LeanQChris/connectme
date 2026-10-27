"use client";

const SETUP = [
  {
    verb: "Sign in",
    body: "Your workspace is created on first sign-in. Nothing to install and no server to run.",
  },
  {
    verb: "Authorize your pages",
    body: "Meta returns the pages and professional accounts you manage, each with its own encrypted token.",
  },
  {
    verb: "Answer",
    body: "ConnectMe subscribes every page to the webhook on your behalf. Messages land in the inbox as they arrive.",
  },
] as const;

export function SetupSteps() {
  return (
    <section id="setup" className="border-t border-hairline bg-canvas-elevated">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <div data-reveal className="max-w-2xl">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[38px]">
            Live in three steps.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-body">
            No webhook URL to paste into Meta, no token to copy by hand. The
            wiring happens the first time you authorize a page.
          </p>
        </div>

        <ol className="mt-12 grid border-t border-hairline md:grid-cols-3">
          {SETUP.map((item, index) => (
            <li
              key={item.verb}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}
              className="border-b border-hairline py-8 last:border-b-0 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <span className="font-mono text-[11px] text-mute">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.025em] text-ink">
                {item.verb}
              </h3>
              <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-body">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
