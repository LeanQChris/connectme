import { ChannelNotConfiguredError } from "../meta/client";

const VIBER_API = "https://chatapi.viber.com/pa";

type ViberPayload = {
  receiver: string;
  type: "text" | "picture" | "video" | "file";
  text?: string;
  media?: string;
  file_name?: string;
  file_size?: number;
  sender: { name: string; avatar?: string | null };
};

async function postViber(authToken: string, path: string, body: unknown): Promise<{ messageToken: string }> {
  const response = await fetch(`${VIBER_API}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Viber-Auth-Token": authToken,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as {
    status?: number;
    status_message?: string;
    message_token?: number;
  } | null;

  if (!response.ok || data?.status !== 0 || !data?.message_token) {
    throw new Error(data?.status_message ?? `Viber replied HTTP ${response.status}`);
  }
  return { messageToken: String(data.message_token) };
}

export async function sendViberMessage(
  authToken: string,
  receiver: string,
  payload: Omit<ViberPayload, "receiver">,
): Promise<{ messageId: string }> {
  if (!authToken) {
    throw new ChannelNotConfiguredError("Viber is not connected. Add the auth token in Settings.");
  }
  const { messageToken } = await postViber(authToken, "send_message", { receiver, ...payload });
  return { messageId: messageToken };
}

export async function getViberAccountInfo(authToken: string): Promise<{ name: string; id: string } | null> {
  if (!authToken) return null;
  try {
    const data = (await (await fetch(`${VIBER_API}/get_account_info`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Viber-Auth-Token": authToken },
      body: "{}",
    })).json()) as { status?: number; name?: string; id?: string };
    if (data.status === 0 && data.id) return { name: data.name ?? "Viber Bot", id: data.id };
    return null;
  } catch {
    return null;
  }
}
