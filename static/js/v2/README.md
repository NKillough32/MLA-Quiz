# V2 Application Files

## Status: **TESTING - EXPERIMENTAL** 🚧

This folder contains the new V2 modular application code that is **currently in development and testing**.

## Architecture

**Type**: Modular ES6
**Pattern**: Manager-based with event bus
**Dependencies**: ES6 modules (import/export)
**Load**: `<script type="module">` in HTML

## Files

### `main.js`
Main entry point for V2 application. Initializes all managers and coordinates the system.

### `modules/` Directory
Contains all V2 manager modules:

#### Foundation Modules
- `EventBus.js` - Event communication system
- `StorageManager.js` - Local/IndexedDB storage
- `OrientationManager.js` - Device orientation handling
- `AnalyticsManager.js` - Analytics and haptic feedback
- `UIHelpers.js` - Utility functions for UI
- `Constants.js` - Shared constants and configuration

#### Feature Modules
- `AnatomyManager.js` - Anatomy explorer functionality
- `QuizManager.js` - Quiz system
- `UIManager.js` - UI state and theme management
- `CalculatorManager.js` - Calculator registry and execution

#### Reference Managers
- `DrugReferenceManager.js` - Drug database (200+ UK BNF drugs)
- `LabValuesManager.js` - Lab values (15 panels, 100+ tests)
- `GuidelinesManager.js` - Clinical guidelines (29 NICE guidelines)

#### Integration
- `V2Integration.js` - Bridge between V1 and V2 systems

#### Calculator System
- `calculators/CalculatorRegistry.js` - All 51 clinical calculators

## Feature Parity with V1

### ✅ Complete
- 51 clinical calculators (98% of V1's clinical scores)
- 200+ drugs (UK BNF-aligned)
- 15 lab panels with 100+ tests
- 29 clinical guidelines
- Event-driven architecture
- Modern ES6+ code
- Manager-based organization

### 🚧 In Progress
- Full UI integration testing
- Calculator list UI
- Search functionality
- Mobile responsiveness optimization

### 📋 Not Yet Implemented
- Some V1 utility tools (intentionally excluded, see CALCULATOR_COMPARISON.md)

## How to Enable V2 for Testing

In `templates/index.html`, uncomment the V2 section:

```html
<!-- Uncomment to enable V2 -->
<script src="/static/js/drugDatabase.js"></script>
<script src="/static/js/labDatabase.js"></script>
<script src="/static/js/guidelinesDatabase.js"></script>
<script type="module" src="/static/js/v2/main.js"></script>
```

And uncomment the V2 integration initialization code in the DOMContentLoaded handler.

## Testing Checklist

Before deploying V2 to production:

- [ ] All V1 features work in V2
- [ ] All calculators render correctly
- [ ] Calculator calculations are accurate
- [ ] Drug search works
- [ ] Lab panels display correctly
- [ ] Guidelines are accessible
- [ ] No JavaScript console errors
- [ ] Works on desktop browsers
- [ ] Works on mobile browsers
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Offline functionality works (PWA)
- [ ] Performance is acceptable
- [ ] Memory usage is reasonable

## Benefits of V2

1. **Modular**: Easy to maintain and update
2. **Testable**: Individual modules can be tested in isolation
3. **Scalable**: Easy to add new features
4. **Modern**: Uses ES6+ features
5. **Event-Driven**: Loose coupling between components
6. **Type-Safe Ready**: Can add TypeScript later
7. **Tree-Shakeable**: Unused code can be eliminated
8. **Debuggable**: Clear module boundaries

## Development Guidelines

### Adding a New Calculator

1. Add to `calculators/CalculatorRegistry.js`
2. Follow the existing pattern:
   ```javascript
   'calculator-id': {
       name: 'Calculator Name',
       category: 'category',
       description: 'Brief description',
       render: () => `<HTML>`,
       calculate: () => { /* logic */ }
   }
   ```
3. Test thoroughly
4. Document in CALCULATOR_COMPARISON.md

### Adding a New Manager

1. Create `modules/NewManager.js`
2. Export singleton instance
3. Add to `main.js` imports and initialization
4. Document in README

### Modifying Existing Code

1. Update the specific manager file
2. Test the change in isolation
3. Test integration with other managers
4. Update documentation if needed

## Deployment Strategy

### Phase 1: Current (Testing)
- V1 in production
- V2 disabled in HTML
- Testing V2 locally

### Phase 2: Parallel Testing
- V1 in production
- V2 enabled for testing users
- Feature flag to switch between V1/V2

### Phase 3: V2 Production
- V2 in production
- V1 kept as backup
- Monitor for issues

### Phase 4: V1 Deprecation
- V2 stable in production
- V1 archived
- V2 becomes "production" (no V2 prefix)

## Contact

For questions about V2 architecture or development, refer to:
- V2_INTEGRATION_COMPLETE.md (integration guide)
- CALCULATOR_COMPARISON.md (feature comparison)
- Individual module JSDoc comments
