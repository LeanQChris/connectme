"use client";

interface EmojiPickerPopoverProps {
  onInsertEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: "Smiles & Gestures",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "🤔",
      "🤫", "👍", "👎", "👏", "🙌", "🙏", "🤝", "✌️", "👋", "👌",
    ],
  },
  {
    name: "Reactions & Love",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "✨",
      "🔥", "💯", "🎉", "🎊", "⭐", "🌟", "💡", "🚀", "⚡", "🎯",
      "🏆", "🎁", "🎈", "🔔", "📢", "💬", "👀", "💪", "🌈", "✅",
    ],
  },
  {
    name: "Symbols & Objects",
    emojis: [
      "📍", "📎", "📁", "📄", "📞", "📧", "💼", "💰", "💳", "🛒",
      "📦", "⏰", "⌛", "📅", "🔒", "🔑", "🔍", "📱", "💻", "🌐",
      "🛠️", "⚠️", "❓", "❗", "ℹ️", "🟢", "🔴", "🟡", "🔵", "✔️",
    ],
  },
];

export function EmojiPickerPopover({ onInsertEmoji, onClose }: EmojiPickerPopoverProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close emoji picker"
        className="fixed inset-0 z-20 cursor-default"
        onClick={onClose}
      />
      <div className="absolute bottom-full left-0 sm:left-3 z-30 mb-2 w-[calc(100vw-24px)] sm:w-72 max-w-[320px] rounded-[10px] border border-hairline bg-canvas-elevated p-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-2 border-b border-hairline mb-2">
          <span className="text-[12px] font-semibold text-ink">Emojis</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-mute hover:text-ink cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-3">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name}>
              <p className="text-[10.5px] font-mono uppercase text-mute tracking-wider mb-1.5">
                {category.name}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onInsertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-[6px] text-lg hover:bg-surface-well transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
