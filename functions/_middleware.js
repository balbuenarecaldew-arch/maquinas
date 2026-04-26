const FACEBOOK_PREVIEW = "https://maquinas.pages.dev/social-preview.jpg";
const WHATSAPP_PREVIEW = "https://maquinas.pages.dev/whatsapp-preview.jpg";

function isWhatsAppCrawler(userAgent) {
  return /whatsapp/i.test(userAgent || "");
}

function withWhatsAppPreview(html) {
  return html
    .replaceAll(FACEBOOK_PREVIEW, WHATSAPP_PREVIEW)
    .replace(
      /(<meta id="og-image-width" property="og:image:width" content=")1200("[^>]*>)/,
      (_, before, after) => `${before}904${after}`
    )
    .replace(
      /(<meta id="og-image-height" property="og:image:height" content=")630("[^>]*>)/,
      (_, before, after) => `${before}1177${after}`
    );
}

export async function onRequest(context) {
  const response = await context.next();
  const request = context.request;
  const url = new URL(request.url);
  const contentType = response.headers.get("content-type") || "";

  if (
    request.method !== "GET" ||
    !isWhatsAppCrawler(request.headers.get("user-agent")) ||
    !contentType.includes("text/html") ||
    (url.pathname !== "/" && url.pathname !== "/index.html")
  ) {
    return response;
  }

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-cache, no-store, must-revalidate");

  return new Response(withWhatsAppPreview(html), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
