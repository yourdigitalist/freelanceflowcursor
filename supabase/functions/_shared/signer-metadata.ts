export type SignerNetworkMetadata = {
  ip: string | null;
  geo: string | null;
  isp: string | null;
};

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80:/i,
];

function normalizeIp(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  // x-forwarded-for can be "client, proxy1, proxy2"
  const first = value.split(",")[0]?.trim() || "";
  if (!first) return null;
  // Strip IPv6-mapped IPv4 prefix
  if (first.startsWith("::ffff:")) return first.slice(7);
  return first;
}

export function getRequestClientIp(req: Request): string | null {
  const headers = req.headers;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for"),
    headers.get("x-client-ip"),
  ];
  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip) return ip;
  }
  return null;
}

function isPublicIp(ip: string): boolean {
  if (ip === "localhost") return false;
  return !PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

function formatGeo(city: string | null, region: string | null, country: string | null): string | null {
  const parts = [city, region, country].map((part) => (part || "").trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

async function lookupIpWhoIs(ip: string): Promise<SignerNetworkMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { ip, geo: null, isp: null };
    const data = await response.json() as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
      connection?: { isp?: string; org?: string };
    };
    if (!data.success) return { ip, geo: null, isp: null };
    const isp = (data.connection?.isp || data.connection?.org || "").trim() || null;
    return {
      ip,
      geo: formatGeo(data.city || null, data.region || null, data.country || null),
      isp,
    };
  } catch {
    return { ip, geo: null, isp: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveSignerNetworkMetadata(
  req: Request,
  clientProvided?: Partial<SignerNetworkMetadata> | null,
): Promise<SignerNetworkMetadata> {
  const requestIp = getRequestClientIp(req);
  const clientIp = normalizeIp(clientProvided?.ip);
  const ip = requestIp || clientIp || null;

  if (!ip || !isPublicIp(ip)) {
    return {
      ip,
      geo: (clientProvided?.geo || "").trim() || null,
      isp: (clientProvided?.isp || "").trim() || null,
    };
  }

  const lookedUp = await lookupIpWhoIs(ip);
  return {
    ip: lookedUp.ip,
    geo: lookedUp.geo || (clientProvided?.geo || "").trim() || null,
    isp: lookedUp.isp || (clientProvided?.isp || "").trim() || null,
  };
}
