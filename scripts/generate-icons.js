import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Clean SVG matching the user's provided Ledgerly logo
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="35%" stop-color="#0d9488"/>
      <stop offset="70%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#0f3d4a"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="50%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#0f3d4a"/>
    </linearGradient>
    <linearGradient id="swooshGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#0c3744"/>
      <stop offset="50%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#2dd4bf"/>
    </linearGradient>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f3d4a" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Background for app icon -->
  <rect width="512" height="512" rx="96" fill="#ffffff"/>

  <g transform="translate(0, -10)">
    <!-- The Stylized 'L' stem & curves -->
    <!-- Vertical stem of L -->
    <path d="M 215 110 
             C 215 110, 245 112, 248 135 
             C 250 155, 235 270, 235 285 
             C 235 295, 245 305, 260 305 
             L 335 305 
             C 348 305, 350 315, 348 340 
             C 345 365, 335 365, 315 365 
             L 230 365 
             C 215 365, 202 355, 202 335 
             L 202 140 
             C 202 120, 208 110, 215 110 Z" 
          fill="url(#tealGrad)" />

    <!-- Left swooshing curve of L -->
    <path d="M 160 380 
             C 160 330, 215 250, 310 220 
             C 255 245, 205 295, 185 360 
             C 178 385, 168 385, 160 380 Z" 
          fill="url(#tealGrad)" />

    <!-- Main Dynamic Swoosh across L connecting to circle -->
    <path d="M 165 372 
             C 205 280, 275 250, 325 240 
             C 305 255, 255 275, 215 320 
             C 195 345, 180 365, 165 372 Z" 
          fill="#0c3744" opacity="0.4" />

    <!-- Dynamic Streamline looping toward magnifying check badge -->
    <path d="M 175 360 
             C 210 300, 280 250, 320 225 
             C 335 215, 340 195, 340 175 
             C 340 215, 305 245, 250 280 
             C 210 305, 185 340, 175 360 Z" 
          fill="url(#swooshGrad)" />

    <!-- Circular Badge / Lens -->
    <circle cx="320" cy="175" r="50" fill="#ffffff" stroke="url(#ringGrad)" stroke-width="14" filter="url(#subtleGlow)"/>
    
    <!-- Outer concentric ring curve on badge -->
    <path d="M 350 145 A 40 40 0 0 1 355 195" fill="none" stroke="#2dd4bf" stroke-width="4" stroke-linecap="round" opacity="0.6"/>

    <!-- Crisp Checkmark inside badge -->
    <path d="M 302 175 L 314 188 L 338 160" fill="none" stroke="#0c3744" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- LEDGERLY Brand Text -->
    <text x="256" y="445" 
          text-anchor="middle" 
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="44" 
          font-weight="900" 
          letter-spacing="6" 
          fill="#0c3744">LEDGERLY</text>
  </g>
</svg>`;

// Safe-zone padded maskable SVG for Android adaptive icons (prevents browser badges on mobile PWA)
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0d3a46"/>
  <g transform="translate(64, 64) scale(0.75)">
    <defs>
      <linearGradient id="tealGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2dd4bf"/>
        <stop offset="50%" stop-color="#14b8a6"/>
        <stop offset="100%" stop-color="#0d9488"/>
      </linearGradient>
    </defs>
    <!-- Background circle for maskable -->
    <circle cx="256" cy="256" r="230" fill="#ffffff"/>
    <g transform="translate(0, -15)">
      <!-- L Stem -->
      <path d="M 215 110 C 215 110, 245 112, 248 135 C 250 155, 235 270, 235 285 C 235 295, 245 305, 260 305 L 335 305 C 348 305, 350 315, 348 340 C 345 365, 335 365, 315 365 L 230 365 C 215 365, 202 355, 202 335 L 202 140 C 202 120, 208 110, 215 110 Z" fill="#0f766e" />
      <!-- Left curve -->
      <path d="M 160 380 C 160 330, 215 250, 310 220 C 255 245, 205 295, 185 360 C 178 385, 168 385, 160 380 Z" fill="#0d9488" />
      <!-- Swoosh -->
      <path d="M 175 360 C 210 300, 280 250, 320 225 C 335 215, 340 195, 340 175 C 340 215, 305 245, 250 280 C 210 305, 185 340, 175 360 Z" fill="#14b8a6" />
      <!-- Lens Badge -->
      <circle cx="320" cy="175" r="50" fill="#ffffff" stroke="#0f766e" stroke-width="14"/>
      <path d="M 302 175 L 314 188 L 338 160" fill="none" stroke="#0c3744" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="256" y="445" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="900" letter-spacing="6" fill="#0c3744">LEDGERLY</text>
    </g>
  </g>
</svg>`;

async function generate() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgLogo);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgLogo);

  // Generate 512x512 PNG
  await sharp(Buffer.from(svgLogo))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  await sharp(Buffer.from(svgLogo))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  // Generate 192x192 PNG
  await sharp(Buffer.from(svgLogo))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate Apple Touch Icon (180x180)
  await sharp(Buffer.from(svgLogo))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate Maskable 512x512
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate Favicon 64x64
  await sharp(Buffer.from(svgLogo))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon-64.png'));

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
