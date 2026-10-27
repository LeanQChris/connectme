"use client";

import React, { useState } from "react";
import { cn } from "@/core/utils/cn";

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: "How does ConnectMe track the Meta 24-hour customer care window?",
    answer:
      "Meta's policy requires that any business response to a customer on WhatsApp, Facebook Messenger, or Instagram Direct occur within 24 hours of the customer's last message. ConnectMe extracts the inbound message timestamp, maintains a real-time countdown down to the second in the thread header, and dynamically locks or warns the composer when the window expires so your replies are never rejected silently by upstream APIs."
  },
  {
    question: "Where and how are platform secrets and access tokens stored?",
    answer:
      "ConnectMe implements a zero-trust model where you bring your own credentials (BYO). Your Meta App Secret, Phone Number ID, Page Access Tokens, and Telegram Bot Tokens are encrypted using AES-256-GCM before writing to the database. The encryption keys remain strictly on the backend and are never sent to the browser."
  },
  {
    question: "Can multiple team members work in the same queue simultaneously?",
    answer:
      "Yes. Inbound customer events and outbound replies are synced via low-latency WebSockets. Team members can assign threads, add private internal notes (invisible to the customer), and change ticket statuses without colliding or causing double replies."
  },
  {
    question: "What happens if a messaging network goes down or webhooks fail?",
    answer:
      "Inbound webhooks are queued through BullMQ on Redis. If a downstream consumer is temporarily busy, messages are held safely and retried with exponential backoff. In the event of an upstream Meta or Telegram API outage, ConnectMe displays an explicit provider status banner and queues outbound messages until the connection is restored."
  },
  {
    question: "Do you use customer conversations to train AI models?",
    answer:
      "Never. ConnectMe acts strictly as a data processor. We do not feed customer conversations, internal notes, or contact profiles to public or private AI models, and we do not sell or monetize workspace data in any way."
  },
  {
    question: "How are attachments, voice notes, and media handled?",
    answer:
      "ConnectMe normalizes attachments across all networks. Audio voice notes from WhatsApp (.ogg) and Telegram (.oga) are converted into playable in-browser audio waveforms. High-resolution images, videos, and PDF documents up to 8 MB are safely proxied with temporary signed URLs."
  }
];

export function AboutFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="space-y-3">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={faq.question}
            className="rounded-[12px] border border-hairline bg-canvas-elevated transition-colors"
          >
            <button
              type="button"
              onClick={() => toggleFaq(index)}
              className="flex w-full items-center justify-between p-5 text-left cursor-pointer select-none"
            >
              <span className="text-[15px] font-semibold text-ink tracking-tight pr-4">
                {faq.question}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-well text-[13px] text-mute transition-transform duration-200",
                  isOpen ? "rotate-180 text-ink" : ""
                )}
              >
                ↓
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-[14px] leading-relaxed text-body border-t border-hairline/60">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
