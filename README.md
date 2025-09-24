# MLA Quiz - Progressive Web App

A Medical Learning Assessment quiz application that works perfectly on iOS devices as a Progressive Web App (PWA).

## 🚀 Features

- **iOS Native Experience**: Looks and feels like a native iPhone app
- **Progressive Web App**: Install directly from Safari to home screen
- **Offline Support**: Take quizzes without internet connection
- **Investigation Section Parsing**: Advanced regex patterns handle all Investigation formats
- **Responsive Design**: Works on iPhone, iPad, and desktop
- **Real-time Scoring**: Instant feedback and results

## 📱 How to Use

### For End Users:
1. Visit the app URL in iOS Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app installs like a native app
5. Launch from home screen for full PWA experience

### Features:
- Browse available medical quizzes
- Take interactive quizzes with Investigation sections
- Track progress with visual progress bar
- View detailed results and scoring
- Works completely offline once loaded

## 🛠️ Technical Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **PWA Features**: Service Worker, Web App Manifest
- **Deployment**: Multiple platform support (Heroku, Vercel, Railway, Render)

## 📦 Installation for Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mla-quiz-pwa.git
cd mla-quiz-pwa
```

2. Install dependencies:
```bash
pip install -r requirements_pwa.txt
```

3. Run locally:
```bash
python app.py
```

4. Open http://localhost:5000 in your browser

## 🌐 Deployment

The app includes configuration for multiple deployment platforms:

- **Heroku**: Use `Procfile` and `runtime.txt`
- **Vercel**: Use `vercel.json` for serverless deployment
- **Railway/Render**: Connect GitHub repo for auto-deployment

See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## 📁 Project Structure

```
├── app.py                 # Flask backend with quiz logic
├── templates/
│   └── index.html        # iOS-style responsive interface
├── static/
│   ├── js/app.js         # Quiz functionality and API communication
│   ├── manifest.json     # PWA manifest for installation
│   └── sw.js            # Service worker for offline support
├── Questions/           # Medical quiz content (.md files)
├── requirements_pwa.txt # Python dependencies
└── Procfile            # Heroku deployment config
```

## 🔧 Quiz Content

Place your medical quiz files (`.md` format) in the `Questions/` folder. The app supports:

- Multiple choice questions
- Investigation sections with enhanced parsing
- Medical specialty categorization
- Detailed explanations and feedback

## 📊 Investigation Section Support

The app handles various Investigation section formats:
- `**Investigations:**`
- `**Investigations**:`
- `**Investigation:**`
- `**Investigation**:`
- Variations with trailing spaces

## 🎯 PWA Capabilities

- **Offline First**: Service worker caches quizzes
- **App-like Experience**: Full screen, native navigation
- **iOS Integration**: Home screen installation, splash screen
- **Performance**: Fast loading, smooth interactions
- **Cross-Platform**: Works on iOS, Android, and desktop

## 📈 Benefits Over Native Apps

- **No App Store**: Direct distribution via URL
- **Instant Updates**: No user downloads required
- **Cross-Platform**: One codebase works everywhere
- **Easy Development**: No macOS needed for iOS deployment
- **Lower Barriers**: Users just visit URL, no installation friction

## 🔍 Testing

Run the test suite:
```bash
python test_pwa.py
```

This tests:
- API endpoints functionality
- Quiz loading and parsing
- Investigation section handling
- Error handling and edge cases

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
1. Check the `DEPLOYMENT_GUIDE.md` for troubleshooting
2. Verify quiz files are properly formatted
3. Test locally before deployment
4. Use browser developer tools for debugging

---

**Ready for production deployment!** 🚀