# Deployment Guide for MLA Quiz PWA

## Overview
This guide covers deploying your MLA Quiz Progressive Web App to various cloud platforms. The PWA includes Flask backend, iOS-style frontend, and offline capabilities.

## Prerequisites
- Quiz files in `Questions/` folder (must include `*.md` files)
- All PWA files created (app.py, templates/, static/)
- Requirements file (requirements_pwa.txt)

## Option 1: Heroku Deployment (Recommended)

### 1. Create Heroku-specific files

Create `Procfile`:
```
web: python app.py
```

Create `runtime.txt`:
```
python-3.11.6
```

### 2. Heroku Deployment Steps
```bash
# Install Heroku CLI first
heroku login
heroku create your-mla-quiz-app
git init
git add .
git commit -m "Initial PWA deployment"
heroku git:remote -a your-mla-quiz-app
git push heroku main
```

### 3. Configure Heroku Environment
```bash
heroku config:set FLASK_ENV=production
heroku config:set PORT=5000
heroku ps:scale web=1
```

## Option 2: Railway Deployment

### 1. Create railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "python app.py"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "never"
```

### 2. Railway Deployment Steps
1. Connect your GitHub repo to Railway
2. Deploy automatically on push
3. Custom domain available

## Option 3: Render Deployment

### 1. Create render.yaml
```yaml
services:
  - type: web
    name: mla-quiz-pwa
    env: python
    buildCommand: pip install -r requirements_pwa.txt
    startCommand: python app.py
    envVars:
      - key: FLASK_ENV
        value: production
      - key: PORT
        fromGroup: PORT
```

### 2. Render Deployment Steps
1. Connect GitHub repo to Render
2. Auto-deploy on commits
3. Free SSL included

## Option 4: Vercel Deployment (Serverless)

### 1. Create vercel.json
```json
{
    "version": 2,
    "builds": [
        {
            "src": "app.py",
            "use": "@vercel/python"
        }
    ],
    "routes": [
        {
            "src": "/(.*)",
            "dest": "app.py"
        }
    ]
}
```

### 2. Install Vercel CLI and Deploy
```bash
npm i -g vercel
vercel --prod
```

## Option 5: PythonAnywhere (Beginner-Friendly)

### 1. Upload files to PythonAnywhere
- Upload all files via Files tab
- Ensure Questions folder is included

### 2. Configure WSGI
Create wsgi configuration pointing to app.py

### 3. Enable web app from Web tab

## iOS PWA Installation Instructions

### For End Users:
1. Open the deployed app URL in Safari on iOS
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add" to install PWA
5. App appears on home screen like native app

### PWA Features:
- ✅ Works offline (cached quizzes)
- ✅ iOS-style interface
- ✅ Full-screen experience
- ✅ Home screen installation
- ✅ Native iOS look and feel

## Testing Your Deployment

### 1. Functionality Tests
- [ ] Quiz list loads correctly
- [ ] Questions display properly
- [ ] Investigation sections render
- [ ] Answer selection works
- [ ] Quiz submission functions
- [ ] Results page displays

### 2. PWA Tests
- [ ] Manifest.json accessible
- [ ] Service worker registers
- [ ] App installable on iOS
- [ ] Offline functionality works
- [ ] iOS safe area support

### 3. Mobile Tests
- [ ] Responsive design works
- [ ] Touch interactions smooth
- [ ] Typography readable
- [ ] Navigation intuitive

## Troubleshooting

### Common Issues:

**Quiz files not found:**
- Ensure Questions/ folder uploaded
- Check file permissions
- Verify .md files present

**PWA not installable:**
- Verify manifest.json served correctly
- Check HTTPS deployment
- Test service worker registration

**iOS styling issues:**
- Verify safe area CSS
- Check iOS meta tags
- Test on actual iOS device

**Performance issues:**
- Enable gzip compression
- Optimize quiz file loading
- Consider CDN for static assets

## Post-Deployment Optimization

### 1. Performance
- Add quiz file compression
- Implement lazy loading
- Cache static assets

### 2. Features
- Add user progress tracking
- Implement quiz bookmarking
- Add performance analytics

### 3. Content Management
- Add admin interface for quiz uploads
- Implement quiz editing
- Add user management

## Monitoring

### Recommended Tools:
- **Uptime:** UptimeRobot, Pingdom
- **Analytics:** Google Analytics, Plausible
- **Errors:** Sentry, LogRocket
- **Performance:** GTmetrix, WebPageTest

Choose the deployment option that best fits your needs. Heroku is recommended for beginners, while Vercel offers excellent performance for serverless deployment.