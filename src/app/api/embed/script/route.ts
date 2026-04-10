import { NextRequest, NextResponse } from "next/server"

// Genererar JavaScript-snippet som skapar en responsiv iframe för inbäddning.
// Vidarebefordrar UTM-parametrar och klick-ID:n till iframen.
// Lyssnar på konverteringsmeddelanden för client-side pixlar.
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

  // Vidarebefordra UTM-parametrar och klick-ID:n från parent till iframe
  var params = new URLSearchParams(window.location.search);
  var trackingParams = [];
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid'].forEach(function(key) {
    var val = params.get(key);
    if (val) trackingParams.push(key + '=' + encodeURIComponent(val));
  });

  var iframeSrc = '${origin}/embed/' + encodeURIComponent(slug);
  if (trackingParams.length > 0) {
    iframeSrc += '?' + trackingParams.join('&');
  }

  var iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.minHeight = '0';
  iframe.style.borderRadius = '8px';
  iframe.setAttribute('title', 'Bestillingsskjema');
  iframe.setAttribute('loading', 'lazy');

  // Lyssna på meddelanden från iframe
  window.addEventListener('message', function(event) {
    try {
      var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      // Dynamisk höjd
      if (data.type === 'serwent-resize' && data.height) {
        iframe.style.height = data.height + 'px';
        iframe.style.minHeight = data.height + 'px';
      }

      // Konvertering — trigga client-side pixlar på parent-sidan
      if (data.type === 'serwent-conversion') {
        // Meta Pixel
        if (typeof fbq === 'function') {
          fbq('track', 'Lead');
        }
        // Google Analytics 4
        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', {
            event_category: 'bestilling',
            event_label: data.order_id || ''
          });
        }
        // Google Ads — stödjer flera konton
        if (typeof gtag === 'function' && window.serwentGoogleConversionIds) {
          window.serwentGoogleConversionIds.forEach(function(id) {
            gtag('event', 'conversion', { send_to: id });
          });
        } else if (typeof gtag === 'function' && window.serwentGoogleConversionId) {
          gtag('event', 'conversion', { send_to: window.serwentGoogleConversionId });
        }
        // Egen händelse som kunden kan lyssna på
        window.dispatchEvent(new CustomEvent('serwent:conversion', { detail: data }));
      }
    } catch(e) {}
  });

  container.appendChild(iframe);
})();
`.trim()

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
