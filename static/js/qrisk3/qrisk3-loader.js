/* QRISK3 loader shim
   This file attempts to expose the upstream qrisk3 API as window.qrisk3 for
   the app. The upstream source was copied into qrisk3.umd.js (which may be
   an ES module). If that file already attaches to window.qrisk3 then this
   shim is a no-op. Otherwise, the shim will attempt to evaluate the source
   and attach exported functions to window.qrisk3.

   Note: This is a lightweight shim for the browser and intended for local
   vendoring/testing. For production, prefer a proper built UMD bundle.
*/
// ES module loader: import named exports from qrisk3.umd.js and attach to window.qrisk3
try {
    import('/static/js/qrisk3/qrisk3.umd.js').then(mod => {
        const calculateScore = mod.calculateScore;
        const inputBuilder = mod.inputBuilder || null;
        const Disclaimer = mod.Disclaimer || null;

        if (typeof calculateScore === 'function') {
            window.qrisk3 = window.qrisk3 || {};
            window.qrisk3.calculateScore = calculateScore;
            if (inputBuilder) window.qrisk3.inputBuilder = inputBuilder;
            if (Disclaimer) window.qrisk3.Disclaimer = Disclaimer;
            console.log('✅ qrisk3-loader: attached calculateScore to window.qrisk3');
        } else {
            console.warn('qrisk3-loader: module loaded but calculateScore not found on module exports');
        }
    }).catch(err => {
        console.warn('qrisk3-loader: failed to import vendored qrisk3 module', err);
    });
} catch (err) {
    console.warn('qrisk3-loader: dynamic import not supported or failed', err);
}
