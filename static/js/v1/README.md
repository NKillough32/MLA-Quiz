# V1 Application Files

## Status: **PRODUCTION - STABLE** ✅

This folder contains the original V1 monolithic application code that is **currently running in production on Vercel**.

## Files

### `app.js` (22,961 lines)
The main application file containing all V1 functionality:
- Quiz system
- Medical tools panel
- 60+ calculators (embedded)
- Drug reference (embedded)
- Lab values (embedded)
- Guidelines (embedded)
- Differential diagnosis
- Clinical triads
- Examination guides
- Emergency protocols
- Anatomy explorer
- All UI logic and event handlers

### `anatomyEnhancements.js`
Additional anatomy-related features and enhancements for the anatomy explorer.

### `analytics.js`
Analytics and tracking functionality for V1.

## Architecture

**Type**: Monolithic
**Pattern**: Single large class (`MLAQuizApp`)
**Dependencies**: None (self-contained)
**Load**: Direct `<script>` tag in HTML

## Usage in Production

The HTML template loads V1 files like this:

```html
<script src="/static/js/v1/app.js"></script>
<script src="/static/js/v1/anatomyEnhancements.js"></script>
```

## DO NOT MODIFY

⚠️ **These files should not be modified while V2 is being tested.**

V1 must remain stable and working in production until V2 has been:
1. Fully tested
2. Verified for feature parity
3. Approved for production deployment

## Migration Path

Once V2 is production-ready:
1. Update HTML template to load V2 instead
2. Test thoroughly on Vercel
3. Keep V1 files as backup
4. Eventually archive V1 folder

## Contact

For questions about V1 code, refer to the original documentation or commit history.
