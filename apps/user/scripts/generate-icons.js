const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Theme Accent Colors ─────────────────────────────────────────────────────
const THEME_COLORS = {
  blue: '#0A84FF',
  teal: '#14B8A6',
  sky: '#0EA5E9',
  indigo: '#6366F1',
  amber: '#F59E0B',
  red: '#EF4444',
  green: '#22C55E',
};

// Crisp Dark Slate background that makes all theme colors pop
const CONTAINER_BG_COLOR = '#0F172A'; 

const BASE_DIR = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(BASE_DIR, 'assets', 'icon-source');
const TRANSPARENT_ICON = path.join(SOURCE_DIR, 'icon-transparent.png');

if (!fs.existsSync(TRANSPARENT_ICON)) {
  const fallback = path.join(BASE_DIR, 'assets', 'images', 'icon.png');
  if (fs.existsSync(fallback)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
    fs.copyFileSync(fallback, TRANSPARENT_ICON);
  }
}

const DIRS = [
  path.join(BASE_DIR, 'assets'),
  path.join(BASE_DIR, 'assets', 'images'),
  path.join(BASE_DIR, 'assets', 'ios'),
  path.join(BASE_DIR, 'assets', 'android'),
  path.join(BASE_DIR, 'assets', 'android', 'mipmap-mdpi'),
  path.join(BASE_DIR, 'assets', 'android', 'mipmap-hdpi'),
  path.join(BASE_DIR, 'assets', 'android', 'mipmap-xhdpi'),
  path.join(BASE_DIR, 'assets', 'android', 'mipmap-xxhdpi'),
  path.join(BASE_DIR, 'assets', 'android', 'mipmap-xxxhdpi'),
  path.join(BASE_DIR, 'assets', 'images', 'icons'),
  path.join(BASE_DIR, 'assets', 'images', 'icons', 'android'),
];

DIRS.forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Python Image Processor Helper ───────────────────────────────────────────
const pythonScript = `
import sys
import os
import colorsys
from PIL import Image

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def recolor_artwork(im, target_hex):
    if not target_hex or target_hex == 'NONE':
        return im
    
    target_rgb = hex_to_rgb(target_hex)
    target_h, target_s, target_v = colorsys.rgb_to_hsv(target_rgb[0]/255.0, target_rgb[1]/255.0, target_rgb[2]/255.0)
    
    im_rgba = im.convert('RGBA')
    pixels = im_rgba.load()
    w, h = im_rgba.size
    
    for x in range(w):
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if a > 10:
                h_val, s_val, v_val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
                if s_val > 0.10:
                    new_s = max(s_val, target_s)
                    new_r, new_g, new_b = colorsys.hsv_to_rgb(target_h, new_s, v_val)
                    pixels[x, y] = (int(new_r * 255), int(new_g * 255), int(new_b * 255), a)
    return im_rgba

def make_icon(src_path, out_path, size, bg_color=None, safe_zone_ratio=1.0, theme_color=None):
    im = Image.open(src_path).convert('RGBA')
    
    if theme_color and theme_color != 'NONE':
        im = recolor_artwork(im, theme_color)
        
    target_w, target_h = size, size
    artwork_target_w = int(target_w * safe_zone_ratio)
    artwork_target_h = int(target_h * safe_zone_ratio)
    
    im.thumbnail((artwork_target_w, artwork_target_h), Image.Resampling.LANCZOS)
    
    if bg_color and bg_color != 'NONE':
        rgb = hex_to_rgb(bg_color)
        canvas = Image.new('RGBA', (target_w, target_h), rgb + (255,))
    else:
        canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        
    offset_x = (target_w - im.width) // 2
    offset_y = (target_h - im.height) // 2
    canvas.paste(im, (offset_x, offset_y), im)
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if bg_color and bg_color != 'NONE':
        canvas.convert('RGB').save(out_path, 'PNG', optimize=True)
    else:
        canvas.save(out_path, 'PNG', optimize=True)

if __name__ == '__main__':
    src = sys.argv[1]
    out = sys.argv[2]
    sz = int(sys.argv[3])
    bg = sys.argv[4] if sys.argv[4] != 'NONE' else None
    ratio = float(sys.argv[5])
    theme = sys.argv[6] if sys.argv[6] != 'NONE' else None
    make_icon(src, out, sz, bg, ratio, theme)
`;

const pyScriptPath = path.join(BASE_DIR, 'scripts', '_pil_helper.py');
fs.writeFileSync(pyScriptPath, pythonScript, 'utf8');

function processImage({ src, out, size, bg = null, safeRatio = 1.0, themeColor = null }) {
  const bgArg = bg || 'NONE';
  const themeArg = themeColor || 'NONE';
  const cmd = `python3 "${pyScriptPath}" "${src}" "${out}" ${size} "${bgArg}" ${safeRatio} "${themeArg}"`;
  execSync(cmd, { stdio: 'pipe' });
}

// ── Batch Generation Tasks ──────────────────────────────────────────────────
async function run() {
  console.log('🚀 Generating High-Contrast Percel Theme Icons...\n');
  const fileLog = [];
  const tasks = [];

  // 1. Expo Main App Icons
  tasks.push(
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'icon-ios-1024.png'), size: 1024, bg: CONTAINER_BG_COLOR, label: 'Expo iOS 1024x1024 Master' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'icon-android-foreground.png'), size: 1024, safeRatio: 0.66, label: 'Expo Android Adaptive Foreground' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'images', 'icon.png'), size: 1024, bg: CONTAINER_BG_COLOR, label: 'App Main Icon' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'images', 'favicon.png'), size: 48, bg: CONTAINER_BG_COLOR, label: 'Web Favicon 48x48' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'favicon-32.png'), size: 32, bg: CONTAINER_BG_COLOR, label: 'Web Favicon 32x32' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'favicon-48.png'), size: 48, bg: CONTAINER_BG_COLOR, label: 'Web Favicon 48x48 (root)' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'images', 'splash-icon.png'), size: 1024, safeRatio: 0.66, label: 'Splash Screen Icon' }
  );

  // 2. iOS Additional Sizes (/assets/ios/)
  const iosSizes = [
    { name: 'icon-1024.png', size: 1024, desc: 'App Store' },
    { name: 'icon-180.png', size: 180, desc: 'Home Screen @3x' },
    { name: 'icon-120.png', size: 120, desc: 'Home Screen @2x / Spotlight @3x' },
    { name: 'icon-80.png', size: 80, desc: 'Spotlight @2x' },
    { name: 'icon-87.png', size: 87, desc: 'Settings @3x' },
    { name: 'icon-58.png', size: 58, desc: 'Settings @2x' },
    { name: 'icon-114.png', size: 114, desc: 'Notifications @3x' },
    { name: 'icon-76.png', size: 76, desc: 'Notifications @2x' },
  ];

  iosSizes.forEach(({ name, size, desc }) => {
    tasks.push({
      src: TRANSPARENT_ICON,
      out: path.join(BASE_DIR, 'assets', 'ios', name),
      size,
      bg: CONTAINER_BG_COLOR,
      label: `iOS ${desc}`,
    });
  });

  // 3. Android Additional Sizes (/assets/android/)
  const mipmaps = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ];

  tasks.push(
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'android', 'ic_launcher_512.png'), size: 512, bg: CONTAINER_BG_COLOR, label: 'Android Master Launcher 512' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'android', 'ic_launcher_foreground_512.png'), size: 512, safeRatio: 0.66, label: 'Android Master Foreground 512' },
    { src: TRANSPARENT_ICON, out: path.join(BASE_DIR, 'assets', 'android', 'playstore-icon.png'), size: 512, bg: CONTAINER_BG_COLOR, safeRatio: 0.75, label: 'Play Store Listing Icon 512' }
  );

  mipmaps.forEach(({ folder, size }) => {
    tasks.push(
      {
        src: TRANSPARENT_ICON,
        out: path.join(BASE_DIR, 'assets', 'android', folder, 'ic_launcher.png'),
        size,
        bg: CONTAINER_BG_COLOR,
        label: `Android Legacy ${folder}`,
      },
      {
        src: TRANSPARENT_ICON,
        out: path.join(BASE_DIR, 'assets', 'android', folder, 'ic_launcher_foreground.png'),
        size,
        safeRatio: 0.66,
        label: `Android Adaptive ${folder}`,
      }
    );
  });

  // 4. Dynamic Theme Variations on Crisp Dark Slate Container Background
  Object.entries(THEME_COLORS).forEach(([colorName, hex]) => {
    tasks.push(
      {
        src: TRANSPARENT_ICON,
        out: path.join(BASE_DIR, 'assets', 'images', 'icons', `icon-${colorName}.png`),
        size: 1024,
        bg: CONTAINER_BG_COLOR,
        themeColor: hex,
        label: `Theme iOS App Icon (${colorName})`,
      },
      {
        src: TRANSPARENT_ICON,
        out: path.join(BASE_DIR, 'assets', 'images', 'icons', 'android', `android-icon-${colorName}.png`),
        size: 1024,
        safeRatio: 0.66,
        themeColor: hex,
        label: `Theme Android Foreground (${colorName})`,
      }
    );
  });

  // Execute all tasks
  for (const t of tasks) {
    processImage(t);
    const stats = fs.statSync(t.out);
    const relPath = path.relative(BASE_DIR, t.out);
    fileLog.push({
      Path: relPath,
      Dimensions: `${t.size}x${t.size}`,
      'Size (KB)': (stats.size / 1024).toFixed(1),
      Description: t.label,
    });
  }

  // Cleanup helper
  if (fs.existsSync(pyScriptPath)) {
    fs.unlinkSync(pyScriptPath);
  }

  console.log('✅ Generated High-Contrast Theme Icon Sets Successfully:\n');
  console.table(fileLog);
}

run().catch((err) => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
