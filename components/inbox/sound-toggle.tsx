import { useSyncExternalStore } from "react";
import { soundNotifier } from "@/lib/audio-chime";

export default function SoundToggle() {
  const enabled = useSyncExternalStore(
    soundNotifier.subscribe,
    soundNotifier.isEnabled,
    () => true,
  );

  function handleToggle() {
    soundNotifier.toggleSound();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={enabled ? "Notification chime: On (Click to mute)" : "Notification chime: Muted (Click to enable)"}
      className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
    >
      {enabled ? (
        <>
          <svg className="h-3.5 w-3.5 stroke-current text-ink" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"
            />
          </svg>
          <span className="hidden sm:inline">Sound</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5 stroke-current text-mute" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <span className="hidden sm:inline text-mute">Muted</span>
        </>
      )}
    </button>
  );
}
