# JavaScript Folder Structure

This folder contains all JavaScript code for the MLA Quiz PWA, organized into V1 and V2 versions.

## Folder Structure

```
static/js/
├── v1/                          # V1 Production Code (Stable)
│   ├── app.js                   # Main V1 application (22,961 lines)
│   ├── anatomyEnhancements.js   # Anatomy features
│   ├── analytics.js             # Analytics tracking
│   └── README.md                # V1 documentation
│
├── v2/                          # V2 Testing Code (Experimental)
│   ├── main.js                  # V2 entry point
│   ├── modules/                 # V2 manager modules
│   │   ├── EventBus.js          # Event system
│   │   ├── StorageManager.js    # Storage handling
│   │   ├── AnalyticsManager.js  # Analytics + haptics
│   │   ├── UIManager.js         # UI state management
│   │   ├── CalculatorManager.js # Calculator registry
│   │   ├── DrugReferenceManager.js # Drug database manager
│   │   ├── LabValuesManager.js  # Lab values manager
│   │   ├── GuidelinesManager.js # Guidelines manager
│   │   ├── AnatomyManager.js    # Anatomy explorer
│   │   ├── QuizManager.js       # Quiz system
│   │   ├── OrientationManager.js # Device orientation
│   │   ├── Constants.js         # Shared constants
│   │   ├── UIHelpers.js         # Utility functions
│   │   ├── V2Integration.js     # V1/V2 bridge
│   │   └── calculators/         # Calculator modules
│   │       └── CalculatorRegistry.js # 51 calculators
│   └── README.md                # V2 documentation
│
├── drugDatabase.js              # Drug data (shared)
├── labDatabase.js               # Lab values data (shared)
├── guidelinesDatabase.js        # Guidelines data (shared)
├── qrisk3/                      # QRISK3 calculator module
└── README.md                    # This file
```

## Current Production Status

### 🟢 **V1 (Production - Active)**
- **Status**: Live on Vercel
- **Location**: `static/js/v1/`
- **Architecture**: Monolithic (single large file)
- **Stability**: Proven and stable
- **Modifications**: ⚠️ DO NOT MODIFY while V2 is testing

### 🟡 **V2 (Testing - Experimental)**
- **Status**: Development/Testing only
- **Location**: `static/js/v2/`
- **Architecture**: Modular (ES6 modules)
- **Stability**: In testing phase
- **Modifications**: ✅ Can be freely modified

## Shared Resources

### External Databases
These files are used by BOTH V1 and V2:

- `drugDatabase.js` - 200+ UK BNF-aligned drugs
- `labDatabase.js` - 15 lab panels, 100+ tests  
- `guidelinesDatabase.js` - 29 NICE guidelines

**Location**: `static/js/` (root level)
**Access**: Both V1 and V2 load these via `<script>` tags

### QRISK3 Module
Special calculator module for cardiovascular risk assessment.

**Location**: `static/js/qrisk3/`
**Used by**: Both V1 and V2

## How to Switch Between V1 and V2

### Current Configuration (V1 Active)

In `templates/index.html`:

```html
<!-- V1 ACTIVE -->
<script src="/static/js/v1/app.js"></script>
<script src="/static/js/v1/anatomyEnhancements.js"></script>

<!-- V2 DISABLED (commented out) -->
<!--
<script src="/static/js/drugDatabase.js"></script>
<script src="/static/js/labDatabase.js"></script>
<script src="/static/js/guidelinesDatabase.js"></script>
<script type="module" src="/static/js/v2/main.js"></script>
-->
```

### To Enable V2 for Testing

1. Comment out V1 script tags
2. Uncomment V2 script tags
3. Uncomment V2 integration code
4. Test thoroughly before deploying

## Version Comparison

| Feature | V1 | V2 |
|---------|----|----|
| **Architecture** | Monolithic | Modular |
| **File Count** | 3 files | 16+ modules |
| **Total Lines** | ~23,000 | ~11,000 |
| **Calculators** | 60 (embedded) | 51 (registry) |
| **Drugs** | Embedded | 200+ (manager) |
| **Lab Panels** | Embedded | 15 (manager) |
| **Guidelines** | Embedded | 29 (manager) |
| **Code Style** | ES5/ES6 mixed | ES6+ |
| **Testing** | Monolithic | Per-module |
| **Maintenance** | Difficult | Easy |
| **Performance** | Good | Better |
| **Bundle Size** | Large | Tree-shakeable |

## Feature Parity Status

✅ = Complete | 🚧 = In Progress | ❌ = Not Implemented

| Feature | V1 | V2 | Notes |
|---------|----|----|-------|
| Quiz System | ✅ | ✅ | Fully migrated |
| Calculators | ✅ | ✅ | 51/60 (clinically relevant) |
| Drug Reference | ✅ | ✅ | Enhanced with manager |
| Lab Values | ✅ | ✅ | Enhanced with manager |
| Guidelines | ✅ | ✅ | Enhanced with manager |
| Anatomy Explorer | ✅ | ✅ | Fully migrated |
| Differential Dx | ✅ | ❌ | V1 only (for now) |
| Clinical Triads | ✅ | ❌ | V1 only (for now) |
| Examination Guides | ✅ | ❌ | V1 only (for now) |
| Emergency Protocols | ✅ | ❌ | V1 only (for now) |
| Theme System | ✅ | ✅ | Enhanced in V2 |
| Storage | ✅ | ✅ | Enhanced in V2 |
| Analytics | ✅ | ✅ | Enhanced in V2 |
| PWA Features | ✅ | ✅ | Same in both |

## Development Workflow

### Working on V1 (Production)
1. ⚠️ **Avoid modifications** during V2 testing
2. Bug fixes only (critical issues)
3. Test on Vercel staging before production
4. Keep changes minimal and targeted

### Working on V2 (Development)
1. ✅ Free to modify and experiment
2. Add new features
3. Refactor existing code
4. Test locally before committing
5. Document changes in module comments

### Testing Changes
1. Local testing first
2. Vercel preview deployments
3. Check console for errors
4. Test on multiple devices
5. Verify PWA functionality

## Deployment Checklist

### Before Deploying V1 Changes
- [ ] Bug fix is critical and necessary
- [ ] Tested locally
- [ ] No breaking changes
- [ ] V2 development won't be affected
- [ ] Backup of current production code exists

### Before Enabling V2 in Production
- [ ] All V1 features work in V2
- [ ] Comprehensive testing completed
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Mobile devices tested
- [ ] PWA functionality verified
- [ ] Rollback plan in place
- [ ] V1 kept as backup

## File Size Comparison

### V1 Total: ~970 KB
- `app.js`: ~950 KB (22,961 lines)
- `anatomyEnhancements.js`: ~15 KB
- `analytics.js`: ~5 KB

### V2 Total: ~450 KB
- `main.js`: ~12 KB
- All modules combined: ~430 KB
- Individual modules: 5-150 KB each
- Largest: `CalculatorRegistry.js` (~150 KB)

### Shared Resources: ~200 KB
- `drugDatabase.js`: ~120 KB
- `labDatabase.js`: ~50 KB
- `guidelinesDatabase.js`: ~30 KB

## Benefits of This Organization

### ✅ Clear Separation
- Production code isolated from experimental code
- Easy to see which version is active
- No accidental modifications to production

### ✅ Safe Testing
- Can test V2 without affecting V1
- Easy rollback if issues occur
- Both versions can coexist

### ✅ Documentation
- Each folder has its own README
- Clear status indicators
- Usage instructions included

### ✅ Maintainability
- Logical organization
- Easy to navigate
- Clear dependency paths

## Migration Timeline

### Phase 1: ✅ COMPLETE
- [x] Separate V1 and V2 code
- [x] Move files to subfolders
- [x] Update HTML to use V1 paths
- [x] Disable V2 by default
- [x] Document structure

### Phase 2: 🚧 CURRENT
- [ ] Test V2 thoroughly
- [ ] Verify all features work
- [ ] Performance testing
- [ ] Mobile device testing
- [ ] User acceptance testing

### Phase 3: 📅 FUTURE
- [ ] Enable V2 for select users (feature flag)
- [ ] Monitor for issues
- [ ] Gather feedback
- [ ] Fix bugs

### Phase 4: 📅 FUTURE
- [ ] Deploy V2 to production
- [ ] Monitor performance
- [ ] Keep V1 as backup
- [ ] Archive V1 after stability confirmed

## Questions?

See individual README files:
- `v1/README.md` - V1 documentation
- `v2/README.md` - V2 documentation

Or check these files:
- `V2_INTEGRATION_COMPLETE.md` - Integration guide
- `CALCULATOR_COMPARISON.md` - Feature comparison
