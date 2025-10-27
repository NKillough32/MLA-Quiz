/* QRISK3 loader shim
   This file attempts to expose the upstream qrisk3 API as window.qrisk3 for
   the app. The upstream source was copied into qrisk3.umd.js (which may be
   an ES module). If that file already attaches to window.qrisk3 then this
   shim is a no-op. Otherwise, the shim will attempt to evaluate the source
   and attach exported functions to window.qrisk3.

   Note: This is a lightweight shim for the browser and intended for local
   vendoring/testing. For production, prefer a proper built UMD bundle.
*/
// Robust loader: prefer a UMD bundle (non-module) and attach to window.qrisk3.
// This tries the local vendored UMD first, then falls back to CDNs.
// If a UMD global isn't provided, it will attempt an ESM dynamic import as a last resort.

(function() {
    const umdCandidates = [
        '/static/js/qrisk3/qrisk3.umd.js',
        'https://cdn.jsdelivr.net/npm/sisuwellness-qrisk3@latest/dist/qrisk3.umd.js',
        'https://unpkg.com/sisuwellness-qrisk3@latest/dist/qrisk3.umd.js'
    ];

    function attachExportsFromModule(mod) {
        const calculateScore = mod && (mod.calculateScore || mod.default && mod.default.calculateScore);
        const inputBuilder = mod && (mod.inputBuilder || (mod.default && mod.default.inputBuilder)) || null;
        const Disclaimer = mod && (mod.Disclaimer || (mod.default && mod.default.Disclaimer)) || null;

        if (typeof calculateScore === 'function') {
            window.qrisk3 = window.qrisk3 || {};
            window.qrisk3.calculateScore = calculateScore;
            if (inputBuilder) window.qrisk3.inputBuilder = inputBuilder;
            if (Disclaimer) window.qrisk3.Disclaimer = Disclaimer;
            console.log('✅ qrisk3-loader: attached calculateScore to window.qrisk3 from module');
            return true;
        }
        return false;
    }

    function loadUmdScript(src) {
        return new Promise((resolve, reject) => {
            // If already attached by another script, resolve immediately
            if (window.qrisk3) return resolve(window.qrisk3);

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                if (window.qrisk3) {
                    console.log('✅ qrisk3-loader: loaded UMD from', src);
                    resolve(window.qrisk3);
                } else {
                    console.warn('qrisk3-loader: UMD loaded but did not attach to window.qrisk3:', src);
                    resolve(null);
                }
            };
            script.onerror = (e) => {
                console.warn('qrisk3-loader: failed to load UMD script:', src, e);
                reject(e);
            };
            document.head.appendChild(script);
        });
    }

    // Expose a promise that resolves when qrisk3 is available, or rejects on timeout/failure.
    const loadPromise = (async function tryLoad() {
        for (const src of umdCandidates) {
            try {
                const attached = await loadUmdScript(src).catch(() => null);
                if (attached) return window.qrisk3; // success
            } catch (e) {
                // continue to next candidate
            }
        }

        // If UMD attempts didn't attach window.qrisk3, try dynamic ESM import as last resort
        try {
            const esmPath = '/static/js/qrisk3/qrisk3.js';
            await import(esmPath).then(mod => {
                if (attachExportsFromModule(mod)) return window.qrisk3;
            }).catch(err => {
                console.warn('qrisk3-loader: failed to import ESM module', err);
            });
            if (window.qrisk3) return window.qrisk3;
        } catch (err) {
            console.warn('qrisk3-loader: dynamic import not supported or failed', err);
        }

        throw new Error('qrisk3-loader: all attempts to load qrisk3 failed');
    })();

    // Timeout/final rejection after 7 seconds to allow graceful degradation in the app
    window.qrisk3Ready = Promise.race([
        loadPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('qrisk3-loader: timeout')), 7000))
    ]);
})();
