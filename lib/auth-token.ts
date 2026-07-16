// Deterministic HMAC token used for the demo password gate.
// The middleware and the login route both derive the same token from the
// server-side secret, so a cookie holding the token proves it was minted by
// this server (a caller who doesn't know the secret can't forge it).
export async function computeAccessToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("veolia-fms-gate:v1"),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ACCESS_COOKIE = "veolia_gate";
