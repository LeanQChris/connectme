"use client";

const SETUP = [
  {
    step: "01",
    title: "Sign in with Google",
    body: "Your workspace is created on first sign-in. Nothing to install.",
  },
  {
    step: "02",
    title: "Authorize your pages",
    body: "Meta hands over the pages and professional accounts you manage, with their own tokens.",
  },
  {
    step: "03",
    title: "Start answering",
    body: "ConnectMe subscribes each page to the webhook itself. Messages arrive in the inbox as they land.",
  },
];

export function SetupSteps() {
  return (
    <section id="setup" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">Setup</p>
            <h2 className="mt-2.5 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">
              Three steps, then it runs itself.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-body">
              No webhook to paste into Meta, no token to copy. ConnectMe subscribes every page you authorize.
            </p>
          </div>

          <ol className="space-y-px overflow-hidden rounded-[10px] border border-hairline bg-hairline">
            {SETUP.map((item) => (
              <li key={item.step} className="flex gap-4 bg-canvas px-4 py-4">
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-mute">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-[14px] font-medium text-ink">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
