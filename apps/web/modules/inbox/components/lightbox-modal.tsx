"use client";

interface LightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function LightboxModal({ imageUrl, onClose }: LightboxModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 cursor-pointer"
        aria-label="Close image"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Full size preview"
        className="max-h-[90vh] max-w-[90vw] rounded-[8px] object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
