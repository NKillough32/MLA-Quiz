# MLA Quiz - Progressive Web App

A Medical Learning Assessment quiz application optimized for mobile devices with full PWA capabilities and advanced touch interactions.

## 🚀 Key Features

- **iOS Native Experience**: Looks and feels like a native iPhone app
- **Progressive Web App**: Install directly from Safari to home screen  
- **Offline Support**: Take quizzes without internet connection
- **Advanced Touch Controls**: Long-press to rule out incorrect answers with haptic feedback
- **Pinch-to-Zoom Images**: Examine medical images with full zoom and pan capabilities
- **Investigation Section Parsing**: Advanced parsing handles all medical investigation formats
- **Responsive Design**: Optimized for iPhone, iPad, and desktop
- **Real-time Feedback**: Instant scoring with immediate answer validation

## 📱 Mobile Experience

### Installation:
1. Visit the app URL in iOS Safari
2. Tap the Share button (□↑)
3. Select "Add to Home Screen"
4. App installs with custom icon
5. Launch from home screen for full-screen experience

### Touch Interactions:
- **Tap**: Select answers
- **Long-press**: Rule out incorrect options (with haptic feedback)
- **Right-click**: Rule out options (desktop)
- **Tap images**: Open full-screen viewer with pinch-to-zoom
- **Double-tap images**: Quick zoom toggle
- **Pinch**: Zoom medical images for detailed examination

## 🛠️ Technical Stack

- **Backend**: Flask (Python 3.11) with Vercel serverless functions
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PWA**: Service Worker, Web App Manifest, Offline Caching
- **Deployment**: Vercel (optimized for serverless architecture)
- **Mobile**: Touch events, Haptic feedback, Responsive design

## 📦 Development Setup

1. Clone the repository:
```bash
git clone https://github.com/NKillough32/MLA-Quiz.git
cd MLA-Quiz
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run locally (development only - files in archive folder):
```bash
python archive/main.py  # Local development server
```

4. For Vercel development:
```bash
vercel dev  # Runs serverless functions locally
```

## 🌐 Deployment (Vercel Optimized)

This project is optimized for **Vercel** deployment with serverless architecture:

```bash
# Deploy to Vercel
vercel --prod

# Or connect GitHub repo for auto-deployment
```

**Deployment files:**
- `vercel.json` - Routing and build configuration
- `api/index.py` - Serverless function entry point
- `requirements.txt` - Python dependencies
- `runtime.txt` - Python version specification

## 📁 Clean Project Structure

```
├── api/
│   └── index.py          # Vercel serverless function
├── static/
│   ├── icons/icon.png    # Custom PWA icon
│   ├── js/app.js         # Touch interactions & quiz logic
│   ├── manifest.json     # PWA configuration
│   └── sw.js            # Service worker for offline support
├── templates/
│   └── index.html       # Responsive UI with iOS styling
├── Questions/
│   └── MLA.zip          # Medical quiz content
├── archive/             # Development files (not deployed)
├── vercel.json         # Vercel deployment configuration
├── requirements.txt    # Production dependencies
└── runtime.txt        # Python 3.11.6
```

## 🎯 Advanced Features

### Answer Elimination System
- **Long-press** any answer option to rule it out
- **Visual feedback**: Crossed-out styling for eliminated options
- **Haptic feedback**: Strong vibration pattern (500ms) for mobile
- **Persistence**: Ruled-out answers stay marked during question

### Image Viewing System
- **Full-screen modal** for all medical images
- **Pinch-to-zoom**: 1x to 4x magnification
- **Pan support**: Drag to navigate zoomed images
- **Double-tap zoom**: Quick 2x toggle
- **Mouse wheel**: Desktop zoom support
- **Touch boundaries**: Smart limits prevent over-panning

### Quiz Content Support
- Multiple choice medical questions
- Investigation sections with enhanced parsing
- Embedded images with zoom capability
- File upload for custom quizzes
- Progress tracking and scoring

## 🔧 Quiz File Formats

Supports multiple quiz formats:
- **ZIP files**: Containing markdown quiz files and images  
- **Direct upload**: Via browser interface
- **Markdown format**: Standard medical quiz structure
- **Images**: Embedded or referenced medical images

## 📊 Investigation Parsing

Handles various medical investigation formats:
- `**Investigations:**` / `**Investigation:**`
- `**Investigations**` / `**Investigation**` 
- Automatic line break formatting
- Reference range parsing
- Multiple test result handling

## � PWA Capabilities

- **Offline-first**: Service worker caches all content
- **App-like**: Full screen, native navigation feel
- **iOS integration**: Custom splash screen, status bar styling
- **Performance**: Optimized loading, smooth 60fps animations
- **Auto-updates**: Service worker handles content updates
- **Cross-platform**: iOS, Android, desktop compatibility

## 🧪 File Organization

**Active files** (deployed to Vercel):
- All files in root, api/, static/, templates/, Questions/

**Archived files** (development/legacy):
- `archive/main.py` - Local development server
- `archive/app_old.py` - Legacy version
- `archive/utils.py` - Standalone utilities  
- `archive/Procfile` - Heroku configuration
- `archive/*.md` - Development documentation

## 🔍 Browser Compatibility

- **iOS Safari**: Full PWA support, haptic feedback
- **Chrome Mobile**: Complete touch gesture support
- **Firefox Mobile**: Standard PWA features
- **Desktop**: Mouse interactions, keyboard shortcuts
- **Offline**: Full functionality without internet

## � Performance Features

- **Serverless**: Vercel functions for instant scaling
- **CDN**: Static assets served globally
- **Caching**: Aggressive caching for offline use
- **Compression**: Optimized asset delivery
- **Touch**: 60fps touch response, minimal latency

## 📞 Support & Troubleshooting

**Common Issues:**
- Images not loading: Check file upload and browser storage
- Touch not working: Ensure modern mobile browser
- PWA not installing: Use iOS Safari or Chrome

**Development:**
- Use browser dev tools for debugging
- Check service worker for cache issues
- Verify touch events in mobile device mode

---

**🚀 Production-ready Vercel deployment with advanced mobile features!**