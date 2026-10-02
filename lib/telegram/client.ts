import { config } from "../config";
import { ChannelNotConfiguredError } from "../meta/client";

const telegramProfileCache = new Map<string, { name: string | null; avatarUrl: string | null }>();

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
): Promise<{ messageId: string }> {
  const token = config.telegramBotToken;
  if (!token) {
    throw new ChannelNotConfiguredError(
      "Telegram is not configured. Set TELEGRAM_BOT_TOKEN to enable replies.",
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const data = (await response.json()) as {
    ok: boolean;
    description?: string;
    result?: { message_id: number };
  };

  if (!data.ok || !data.result) {
    // If parse_mode HTML failed, retry with plain text
    const retry = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    const retryData = (await retry.json()) as {
      ok: boolean;
      description?: string;
      result?: { message_id: number };
    };

    if (!retryData.ok || !retryData.result) {
      throw new Error(retryData.description || data.description || "Failed to send Telegram message");
    }

    return { messageId: String(retryData.result.message_id) };
  }

  return { messageId: String(data.result.message_id) };
}

export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const token = config.telegramBotToken;
  if (!token || !fileId) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const data = (await res.json()) as { ok: boolean; result?: { file_path?: string } };
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    }
    return null;
  } catch (err) {
    console.warn("[telegram] failed to get file url:", err);
    return null;
  }
}

export async function fetchTelegramUserProfile(
  userId: number | string,
  firstName?: string,
  lastName?: string,
  username?: string,
): Promise<{ name: string; avatarUrl: string | null }> {
  const userKey = String(userId);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || (username ? `@${username}` : `User ${userKey}`);

  const cached = telegramProfileCache.get(userKey);
  if (cached) {
    return { name: cached.name || fullName, avatarUrl: cached.avatarUrl };
  }

  const token = config.telegramBotToken;
  if (!token) {
    return { name: fullName, avatarUrl: null };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${userId}&limit=1`,
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { photos?: Array<Array<{ file_id: string }>> };
    };

    let avatarUrl: string | null = null;
    const firstPhotoArray = data.result?.photos?.[0];
    if (firstPhotoArray && firstPhotoArray.length > 0) {
      // Pick highest resolution photo
      const largest = firstPhotoArray[firstPhotoArray.length - 1];
      avatarUrl = await getTelegramFileUrl(largest.file_id);
    }

    const result = { name: fullName, avatarUrl };
    telegramProfileCache.set(userKey, result);
    return result;
  } catch (err) {
    console.warn("[telegram] failed to fetch user profile photos:", err);
    return { name: fullName, avatarUrl: null };
  }
}
