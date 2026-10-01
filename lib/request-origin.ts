/**
 * Next.js can construct Request.url using its internal listening address.
 * Host is the browser's destination authority; the reverse proxy supplies the
 * public protocol. Never trust X-Forwarded-Host to bypass the Origin check.
 */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (!host) return url.origin;
  if (!host.trim() || /[\s,/@\\?#]/.test(host))
    throw new Error("Invalid request host");

  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  if (
    forwardedProtocol &&
    forwardedProtocol !== "http" &&
    forwardedProtocol !== "https"
  ) {
    throw new Error("Invalid request protocol");
  }
  const protocol = forwardedProtocol ? `${forwardedProtocol}:` : url.protocol;
  return new URL(`${protocol}//${host}`).origin;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    // An Origin is an authority, not a URL with credentials, a path or a query.
    return (
      new URL(origin).origin === origin && origin === requestOrigin(request)
    );
  } catch {
    return false;
  }
}
