import { NextRequest, NextResponse } from "next/server"

// Genererar JavaScript-snippet som skapar en responsiv iframe för inbäddning
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const script = `
(function() {
  var container = document.getElementById('serwent-form');
  if (!container) {
    console.error('[Serwent] Fant ikke element med id="serwent-form"');
    return;
  }

  var slug = container.getAttribute('data-form') || 'bestilling';
  var iframe = document.createElement('iframe');
  iframe.src = '${origin}/embed/' + encodeURIComponent(slug);
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.minHeight = '300px';
  iframe.style.borderRadius = '8px';
  iframe.setAttribute('title', 'Bestillingsskjema');
  iframe.setAttribute('loading', 'lazy');

  // Lyssna på resize-meddelanden från iframe för dynamisk höjd
  window.addEventListener('message', function(event) {
    try {
      var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data.type === 'serwent-resize' && data.height) {
        iframe.style.height = data.height + 'px';
        iframe.style.minHeight = data.height + 'px';
      }
    } catch(e) {}
  });

  container.appendChild(iframe);
})();
`.trim()

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
