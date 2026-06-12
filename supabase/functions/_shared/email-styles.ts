// @ts-nocheck
/** Shared typography, logo sizes, and auth colours for all transactional emails. */

export const LANCE_EMAIL_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

/** Supabase Auth email accent (confirm signup, magic link, recovery). */
export const LANCE_AUTH_PRIMARY_COLOR = "#6d71f0";

/** White Lance wordmark in email headers. */
export const LANCE_EMAIL_LOGO_WHITE_HEIGHT_PX = 20;
export const LANCE_EMAIL_LOGO_WHITE_WIDTH_PX = 86;
export const LANCE_EMAIL_LOGO_WHITE_MAX_WIDTH_PX = 120;

/** Black Lance wordmark in footers / signatures. */
export const LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX = 14;
export const LANCE_EMAIL_LOGO_BLACK_WIDTH_PX = 69;

export function normalizeAuthEmailHtml(html: string): string {
  let out = html;
  out = out.replace(/#9B63E9/gi, LANCE_AUTH_PRIMARY_COLOR);
  out = out.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/gi, "");
  out = out.replace(/font-family:\s*[^;"]+/gi, `font-family: ${LANCE_EMAIL_FONT_FAMILY}`);
  out = out.replace(
    /width="120"\s+height="28"\s+style="height:28px;\s*max-width:160px/gi,
    `width="${LANCE_EMAIL_LOGO_WHITE_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_WHITE_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_WHITE_HEIGHT_PX}px; max-width:${LANCE_EMAIL_LOGO_WHITE_MAX_WIDTH_PX}px`,
  );
  out = out.replace(
    /lance-logo-black\.svg" alt="Get Lance" width="80" height="20" style="height:20px;\s*max-width:100px/gi,
    `lance-logo-black.png" alt="Get Lance" width="${LANCE_EMAIL_LOGO_BLACK_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}px; max-width:80px`,
  );
  out = out.replace(
    /lance-logo-black\.png" alt="Get Lance" width="99" height="20" style="height:20px/gi,
    `lance-logo-black.png" alt="Get Lance" width="${LANCE_EMAIL_LOGO_BLACK_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}px`,
  );
  return out;
}
