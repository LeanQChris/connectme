"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DeleteConversationModalProps {
  isOpen: boolean;
  contactName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConversationModal({
  isOpen,
  contactName,
  onClose,
  onConfirm,
}: DeleteConversationModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-canvas p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mb-4">
          <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-ink">Delete Conversation</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mute">
          Are you sure you want to permanently delete the conversation with{" "}
          <strong className="text-ink font-semibold">{contactName}</strong>? All message history will be removed. This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {loading ? "Deleting..." : "Delete Conversation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
