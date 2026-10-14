/**
 * Stable id from the full feed URL.
 * Truncating base64 collided for same-host paths (e.g. every cinenerdle.app URL).
 */
export function makeFeedId(url: string): string {
  const bytes = new TextEncoder().encode(url)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  // btoa is available in browsers; Node 16+ provides it globally too.
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}
