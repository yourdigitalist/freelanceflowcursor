// @ts-nocheck
/** Meta Conversions API (server-side events). */

const GRAPH_API_VERSION = "v22.0";
export const DEFAULT_META_PIXEL_ID = "1377760630866019";

export type MetaConversionEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website" | "email" | "app" | "phone_call" | "chat" | "physical_store" | "system_generated" | "business_messaging" | "other";
  event_source_url?: string;
  user_data?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

async function sha256Hex(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash email for Meta user_data.em (array of hashed strings). */
export async function hashMetaEmail(email: string): Promise<string> {
  return sha256Hex(email);
}

export async function sendMetaConversionEvents(params: {
  pixelId?: string;
  accessToken: string;
  events: MetaConversionEvent[];
  testEventCode?: string;
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const pixelId = (params.pixelId || Deno.env.get("META_PIXEL_ID") || DEFAULT_META_PIXEL_ID).trim();
  const accessToken = params.accessToken.trim();
  if (!pixelId) throw new Error("META_PIXEL_ID is not configured");
  if (!accessToken) throw new Error("META_CAPI_ACCESS_TOKEN is not configured");

  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`);
  url.searchParams.set("access_token", accessToken);

  const payload: Record<string, unknown> = {
    data: params.events,
  };
  if (params.testEventCode?.trim()) {
    payload.test_event_code = params.testEventCode.trim();
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { raw: await res.text() };
  }

  return { ok: res.ok, status: res.status, body };
}

export function buildWebsiteEvent(input: {
  eventName: string;
  eventSourceUrl?: string;
  eventId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  email?: string;
  customData?: Record<string, unknown>;
}): Promise<MetaConversionEvent> {
  return (async () => {
    const user_data: Record<string, unknown> = {};
    if (input.clientIpAddress) user_data.client_ip_address = input.clientIpAddress;
    if (input.clientUserAgent) user_data.client_user_agent = input.clientUserAgent;
    if (input.email?.trim()) {
      user_data.em = [await hashMetaEmail(input.email)];
    }

    return {
      event_name: input.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId || crypto.randomUUID(),
      action_source: "website",
      event_source_url: input.eventSourceUrl,
      user_data: Object.keys(user_data).length > 0 ? user_data : undefined,
      custom_data: input.customData,
    };
  })();
}
