# High-Quality Anatomy SVG Download Guide

This guide helps you download and add high-quality anatomy images to improve the anatomy explorer.

## 📥 Recommended High-Quality SVG Files

### Skeleton (Bones) Images

**Front View:**
1. **Primary (Best Quality):**
   - URL: https://commons.wikimedia.org/wiki/File:Human_skeleton_front_en.svg
   - Download as: `bones_front.svg`
   - Features: Clear labels, high detail, 2000+ pixels

2. **Alternative with arrows:**
   - URL: https://commons.wikimedia.org/wiki/File:Human_skeleton_front_arrows_en.svg
   - Download as: `bones_front_arrows.svg`

**Back View:**
1. **Primary:**
   - URL: https://commons.wikimedia.org/wiki/File:Human_skeleton_back_en.svg
   - Download as: `bones_back.svg`

### Muscle Images

**Front View:**
1. **Primary (Best Quality):**
   - URL: https://commons.wikimedia.org/wiki/File:Anterior_muscles.svg
   - Download as: `muscles_front.svg`
   - Features: Detailed muscle groups, clear separation

2. **Alternative labeled:**
   - URL: https://commons.wikimedia.org/wiki/File:Muscles_anterior_labeled.svg
   - Download as: `muscles_front_labeled.svg`

**Back View:**
1. **Primary:**
   - URL: https://commons.wikimedia.org/wiki/File:Posterior_muscles.svg
   - Download as: `muscles_back.svg`

2. **Alternative labeled:**
   - URL: https://commons.wikimedia.org/wiki/File:Muscles_posterior_labeled.svg
   - Download as: `muscles_back_labeled.svg`

## 📂 Installation Instructions

### Method 1: Direct Download (Recommended)

1. Visit each Wikimedia Commons URL above
2. Click "Download" or "More details" 
3. Select "Original file" for best quality
4. Save to: `static/anatomy/` folder
5. Use the exact filenames listed above

### Method 2: Command Line (PowerShell)

```powershell
# Navigate to anatomy folder
cd "c:\Users\Nicho\Desktop\mla-quiz-pwa\MLA-Quiz\static\anatomy"

# Download bones (front)
Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/0/0b/Human_skeleton_front_en.svg" -OutFile "bones_front.svg"

# Download bones (back)
Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/5/53/Human_skeleton_back_en.svg" -OutFile "bones_back.svg"

# Download muscles (front)
Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/d/d9/Anterior_muscles.svg" -OutFile "muscles_front.svg"

# Download muscles (back)
Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/7/72/Posterior_muscles.svg" -OutFile "muscles_back.svg"
```

### Method 3: Using curl (if available)

```bash
cd static/anatomy

curl -o bones_front.svg "https://upload.wikimedia.org/wikipedia/commons/0/0b/Human_skeleton_front_en.svg"
curl -o bones_back.svg "https://upload.wikimedia.org/wikipedia/commons/5/53/Human_skeleton_back_en.svg"
curl -o muscles_front.svg "https://upload.wikimedia.org/wikipedia/commons/d/d9/Anterior_muscles.svg"
curl -o muscles_back.svg "https://upload.wikimedia.org/wikipedia/commons/7/72/Posterior_muscles.svg"
```

## 🎨 Optional: Custom Optimization

If you want to optimize the SVG files after download:

### Using SVGO (Node.js tool)
```bash
npm install -g svgo
svgo bones_front.svg -o bones_front.svg
svgo bones_back.svg -o bones_back.svg
svgo muscles_front.svg -o muscles_front.svg
svgo muscles_back.svg -o muscles_back.svg
```

### Benefits of Local Files:
- ✅ **Faster loading** - No network requests
- ✅ **Works offline** - PWA functionality maintained
- ✅ **No CORS issues** - Direct access
- ✅ **Better caching** - Service worker can cache
- ✅ **Consistent quality** - Always loads the same version

## 🔍 Verification

After downloading, verify files exist:
```powershell
dir static\anatomy\*.svg
```

Expected output:
```
bones_front.svg
bones_back.svg  
muscles_front.svg
muscles_back.svg
anatomy_data.json
ATTRIBUTION.md
```

## 📊 Image Quality Specifications

| Type | Format | Min Resolution | Recommended Size |
|------|--------|----------------|------------------|
| Bones | SVG | Vector | 100-300 KB |
| Muscles | SVG | Vector | 200-500 KB |

## 🔗 Additional Resources

### More Anatomy Images:
- **Gray's Anatomy:** https://commons.wikimedia.org/wiki/Gray%27s_Anatomy
- **Anatomography:** https://commons.wikimedia.org/wiki/Category:Anatomography
- **Medical Images:** https://commons.wikimedia.org/wiki/Category:Medical_diagrams

### Alternative Sources:
1. **Body Parts 3D** - http://lifesciencedb.jp/bp3d/
2. **BioDigital Human** - https://human.biodigital.com/
3. **Visible Body** - https://www.visiblebody.com/

## ⚖️ License Information

All Wikimedia Commons images are typically:
- **Licensed:** Public Domain or CC-BY-SA
- **Attribution:** See ATTRIBUTION.md
- **Usage:** Free for educational purposes

## 🚀 Performance Tips

1. **Compression:** Keep SVG files under 500KB each
2. **Simplification:** Remove unnecessary metadata
3. **Caching:** Files are automatically cached by service worker
4. **Lazy Loading:** Images load on-demand when anatomy tab opens

## 🛠️ Troubleshooting

### Images not showing?
1. Check file names match exactly (case-sensitive on some systems)
2. Verify files are in `static/anatomy/` folder
3. Clear browser cache and reload
4. Check browser console for errors

### Images load but are blurry?
1. Ensure you downloaded "Original file" not thumbnail
2. SVG should be vector format (scalable)
3. Check SVG viewBox attribute is set correctly

### Click handlers not working?
1. SVG element IDs must match keys in `anatomy_data.json`
2. Run normalization function (automatic)
3. Check console for normalization errors
