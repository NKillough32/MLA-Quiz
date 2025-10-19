// Lightweight analytics wrapper for MLA-Quiz
// Supports: console fallback, Plausible, GA4 (measurementId), or Vercel Analytics via a small adapter.

(function (window) {
    const config = {
        provider: localStorage.getItem('analyticsProvider') || 'console', // 'console' | 'plausible' | 'ga4' | 'vercel'
        plausibleDomain: localStorage.getItem('plausibleDomain') || '',
        ga4MeasurementId: localStorage.getItem('ga4MeasurementId') || '',
    };

    function sendConsole(eventName, payload) {
        console.debug('[Analytics][Console] Event:', eventName, payload);
    }

    function sendPlausible(eventName, payload) {
        if (!config.plausibleDomain) return sendConsole(eventName, payload);
        try {
            // plausible custom event
            if (window.plausible) {
                window.plausible(eventName, { props: payload });
            } else if (navigator.sendBeacon) {
                const url = `https://plausible.io/api/event`;
                const data = {
                    name: eventName,
                    url: location.href,
                    domain: config.plausibleDomain,
                    props: payload || {}
                };
                navigator.sendBeacon(url, JSON.stringify(data));
            } else {
                sendConsole(eventName, payload);
            }
        } catch (e) {
            sendConsole(eventName, payload);
        }
    }

    function sendGA4(eventName, payload) {
        if (!config.ga4MeasurementId) return sendConsole(eventName, payload);
        try {
            if (window.gtag) {
                window.gtag('event', eventName, payload || {});
            } else if (navigator.sendBeacon) {
                const url = `https://www.google-analytics.com/mp/collect?measurement_id=${config.ga4MeasurementId}&api_secret=`;
                navigator.sendBeacon(url, JSON.stringify(payload || {}));
            } else {
                sendConsole(eventName, payload);
            }
        } catch (e) {
            sendConsole(eventName, payload);
        }
    }

    function sendVercel(eventName, payload) {
        // Vercel Analytics requires server-side integration or the provided adapter.
        // Fallback to console for now.
        sendConsole('[vercel]' + eventName, payload);
    }

    function track(eventName, payload) {
        switch (config.provider) {
            case 'plausible':
                sendPlausible(eventName, payload);
                break;
            case 'ga4':
                sendGA4(eventName, payload);
                break;
            case 'vercel':
                sendVercel(eventName, payload);
                break;
            default:
                sendConsole(eventName, payload);
        }
    }

    // Public API
    window.MLAAnalytics = {
        track: track,
        pageView: function (path, title) {
            track('page_view', { path: path || location.pathname, title: title || document.title });
        },
        event: function (name, props) {
            track(name, props || {});
        },
        setProvider: function (p) {
            localStorage.setItem('analyticsProvider', p);
            config.provider = p;
        },
        setPlausibleDomain: function (d) {
            localStorage.setItem('plausibleDomain', d);
            config.plausibleDomain = d;
        },
        setGA4MeasurementId: function (id) {
            localStorage.setItem('ga4MeasurementId', id);
            config.ga4MeasurementId = id;
        }
    };

})(window);
