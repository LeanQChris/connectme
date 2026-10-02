"use client";

const CAPABILITIES = [
  {
    title: "The reply window is a countdown, not a footnote",
    body: "Every inbound message opens a timed window on the thread, so you can see how long you have before the channel forces a template.",
    render: (
      <div className="flex items-center gap-2.5 rounded-[6px] border border-hairline bg-canvas px-3 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate text-[12px] text-body">24h window open</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink">
          23h 58m
        </span>
      </div>
    ),
  },
  {
    title: "Notes stay inside the thread",
    body: "Internal notes sit in the conversation as annotations, never in the reply box, so nothing leaks out to a customer by accident.",
    render: (
      <div className="flex items-stretch gap-2.5">
        <span className="w-0.5 shrink-0 rounded-full bg-warning/45" />
        <p className="text-[12px] leading-relaxed text-body">
          Customer is asking about delivery — check the courier first.
        </p>
      </div>
    ),
  },
  {
    title: "Know which page each message came from",
    body: "Connect several Facebook pages or Instagram accounts and the agent picks one. Every thread carries its page badge, and replies go out on the right token.",
    render: (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-[4px] bg-messenger/10 px-1.5 py-px font-mono text-[10px] text-messenger">
          Northwind Store
        </span>
        <span className="rounded-[4px] bg-messenger/10 px-1.5 py-px font-mono text-[10px] text-messenger">
          Northwind EU
        </span>
        <span className="rounded-[4px] bg-pink-500/10 px-1.5 py-px font-mono text-[10px] text-pink-500">
          @northwind
        </span>
      </div>
    ),
  },
];

export function CapabilitiesSection() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">In the inbox</p>
        <div className="mt-2.5 grid gap-px overflow-hidden rounded-[10px] border border-hairline bg-hairline md:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <article key={capability.title} className="flex flex-col bg-canvas p-5">
              <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                {capability.title}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-body">{capability.body}</p>
              <div className="mt-4">{capability.render}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
