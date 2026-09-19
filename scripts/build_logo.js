import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 32x32 Grid
const W = 32;
const H = 32;

// Initialize grid with transparent
const canvas = Array(H).fill(null).map(() => Array(W).fill(null));

function setPixel(x, y, color) {
  if (x >= 0 && x < W && y >= 0 && y < H) {
    canvas[y][x] = color;
  }
}

function fillRect(x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(x, y, color);
    }
  }
}

// Colors
const C = {
  // Outlines
  k: '#0d0704', // Black-brown Minecraft outline
  k2: '#1a0f08', // Slightly lighter outline

  // Leather Base & Shading
  l1: '#381a0b', // Darkest leather
  l2: '#4e250f', // Dark leather
  l3: '#6a3416', // Base leather
  l4: '#87441d', // Midtone leather
  l5: '#a35525', // Highlight leather
  l6: '#be662f', // Rim leather highlight

  // Spine
  s1: '#2e1509',
  s2: '#421f0d',
  s3: '#592b13',
  s4: '#713919',

  // Gold Corners, Clasps & "L" Ingot
  g0: '#473103', // Deep gold outline
  g1: '#7d5600', // Gold dark shade
  g2: '#b57f00', // Gold shade
  g3: '#dea000', // Gold midtone
  g4: '#ffd700', // Bright Minecraft Gold
  g5: '#ffea6c', // Gold highlight
  g6: '#fffce6', // Gold glint

  // Parchment Pages
  p0: '#4d4233', // Deep page crease
  p1: '#796a54', // Dark page edge
  p2: '#9e8c72', // Page shade
  p3: '#c8b697', // Main parchment
  p4: '#e8dcbe', // Bright page
  p5: '#fff8e3', // White parchment highlight

  // Emerald Gem & Ribbon
  e0: '#062910', // Emerald deep border
  e1: '#0c5220', // Emerald shade
  e2: '#127e32', // Emerald mid-shade
  e3: '#1db046', // Emerald base
  e4: '#42ea74', // Bright emerald
  e5: '#8affad', // Emerald gleam
  e6: '#e2fff0', // White emerald glint

  // Feather Quill
  q0: '#334155', // Feather stem shadow
  q1: '#64748b', // Feather slate shade
  q2: '#94a3b8', // Feather grey
  q3: '#cbd5e1', // Feather soft white
  q4: '#f1f5f9', // Feather bright white
  q5: '#ffffff', // Pure feather white

  // Diamond sparkles
  d1: '#249f9c',
  d2: '#4bede2',
  d3: '#b2ffff',
  d4: '#ffffff',
};

// --- 1. Drop Shadow for Item (Authentic Minecraft GUI item shadow) ---
for (let y = 5; y <= 28; y++) {
  for (let x = 6; x <= 28; x++) {
    setPixel(x, y, 'rgba(0, 0, 0, 0.45)');
  }
}

// --- 2. Book Outline & Structure ---
// Book Body: X: 4 to 23 (Cover), X: 24 to 26 (Pages & Back cover)
// Y: 4 to 24 (Cover), Y: 25 to 27 (Bottom pages)

// Back cover rim
fillRect(26, 6, 2, 21, C.k);
fillRect(7, 26, 20, 2, C.k);

// Spine outline
fillRect(3, 4, 2, 21, C.k);
setPixel(4, 3, C.k);
setPixel(5, 3, C.k);
setPixel(4, 25, C.k);
setPixel(5, 25, C.k);

// Top cover outline
fillRect(5, 3, 19, 2, C.k);
setPixel(24, 4, C.k);
setPixel(24, 5, C.k);

// Right cover crease outline (between front cover and pages)
fillRect(23, 5, 2, 20, C.k);

// Bottom front cover outline
fillRect(5, 23, 19, 2, C.k);

// --- 3. Parchment Pages (Right side & Bottom side) ---
// Right side pages: x=24..26, y=6..24
for (let y = 6; y <= 24; y++) {
  const isLine = y % 2 === 0;
  setPixel(24, y, isLine ? C.p2 : C.p3);
  setPixel(25, y, isLine ? C.p1 : C.p4);
  setPixel(26, y, isLine ? C.p0 : C.p2);
}
// Page corner bevels
setPixel(26, 6, C.k);
setPixel(26, 24, C.k);
setPixel(25, 25, C.k);

// Bottom side pages: x=7..25, y=24..26
for (let x = 7; x <= 25; x++) {
  const isLine = x % 2 === 0;
  setPixel(x, 24, isLine ? C.p2 : C.p4);
  setPixel(x, 25, isLine ? C.p1 : C.p3);
  setPixel(x, 26, isLine ? C.p0 : C.p2);
}
setPixel(25, 26, C.k);

// --- 4. Leather Book Cover (x=5..22, y=5..22) ---
for (let y = 5; y <= 22; y++) {
  for (let x = 5; x <= 22; x++) {
    // Subtle Minecraft leather grain
    const noise = ((x * 7 + y * 13) % 5);
    let col = C.l3;
    if (x === 5) col = C.l1; // Crease next to spine
    else if (x === 6) col = C.l2;
    else if (y === 5) col = C.l5; // Top rim highlight
    else if (y === 6 && x < 18) col = C.l4;
    else if (y === 22) col = C.l2; // Bottom shadow
    else if (x === 22) col = C.l2; // Right shadow
    else if (noise === 0) col = C.l4;
    else if (noise === 3) col = C.l2;
    setPixel(x, y, col);
  }
}

// Spine face (x=4, y=4..24)
for (let y = 4; y <= 24; y++) {
  if (y === 4) setPixel(4, y, C.s4);
  else if (y === 24) setPixel(4, y, C.s1);
  else if (y % 4 === 0) setPixel(4, y, C.s1); // Spine bands
  else setPixel(4, y, C.s3);
}

// --- 5. Gold Corner Plates (Minecraft Ingot Metal) ---
// Top-Left Corner (x=5..8, y=5..8)
setPixel(5, 5, C.g6); setPixel(6, 5, C.g5); setPixel(7, 5, C.g4); setPixel(8, 5, C.g2);
setPixel(5, 6, C.g5); setPixel(6, 6, C.g4); setPixel(7, 6, C.g3); setPixel(8, 6, C.g1);
setPixel(5, 7, C.g4); setPixel(6, 7, C.g3); setPixel(7, 7, C.g1);
setPixel(5, 8, C.g2); setPixel(6, 8, C.g1);
// Corner rivet
setPixel(6, 6, C.g6); setPixel(7, 6, C.g0);

// Top-Right Corner (x=19..22, y=5..8)
setPixel(19, 5, C.g3); setPixel(20, 5, C.g4); setPixel(21, 5, C.g5); setPixel(22, 5, C.g4);
setPixel(19, 6, C.g1); setPixel(20, 6, C.g3); setPixel(21, 6, C.g4); setPixel(22, 6, C.g3);
                       setPixel(20, 7, C.g1); setPixel(21, 7, C.g3); setPixel(22, 7, C.g2);
                                              setPixel(21, 8, C.g1); setPixel(22, 8, C.g1);
setPixel(21, 6, C.g6);

// Bottom-Left Corner (x=5..8, y=19..22)
setPixel(5, 19, C.g3); setPixel(6, 19, C.g1);
setPixel(5, 20, C.g4); setPixel(6, 20, C.g3); setPixel(7, 20, C.g1);
setPixel(5, 21, C.g5); setPixel(6, 21, C.g4); setPixel(7, 21, C.g2); setPixel(8, 21, C.g1);
setPixel(5, 22, C.g4); setPixel(6, 22, C.g3); setPixel(7, 22, C.g2); setPixel(8, 22, C.g0);
setPixel(6, 21, C.g5);

// Bottom-Right Corner (x=19..22, y=19..22)
                                              setPixel(21, 19, C.g1); setPixel(22, 19, C.g1);
                       setPixel(20, 20, C.g1); setPixel(21, 20, C.g2); setPixel(22, 20, C.g2);
setPixel(19, 21, C.g1); setPixel(20, 21, C.g2); setPixel(21, 21, C.g3); setPixel(22, 21, C.g2);
setPixel(19, 22, C.g0); setPixel(20, 22, C.g1); setPixel(21, 22, C.g2); setPixel(22, 22, C.g0);

// --- 6. Emerald Ribbon (Vertical bookmark through the ledger) ---
// Runs along x=10..11, y=3..24
setPixel(10, 3, C.k); setPixel(11, 3, C.k);
setPixel(10, 4, C.e5); setPixel(11, 4, C.e3);
setPixel(10, 5, C.e4); setPixel(11, 5, C.e2);
setPixel(10, 6, C.e4); setPixel(11, 6, C.e2);
setPixel(10, 7, C.e3); setPixel(11, 7, C.e1);
setPixel(10, 8, C.e4); setPixel(11, 8, C.e2);

// Emerald Hanging Ribbon & Gemstone at bottom (x=9..13, y=23..30)
// Ribbon dangling out from pages:
setPixel(10, 23, C.e4); setPixel(11, 23, C.e2);
setPixel(10, 24, C.e3); setPixel(11, 24, C.e1);
setPixel(10, 25, C.e4); setPixel(11, 25, C.e2);

// Minecraft Emerald Gem Crystal (Cut diamond shape)
// Outline
setPixel(10, 26, C.e0); setPixel(11, 26, C.e0);
setPixel(9, 27, C.e0); setPixel(12, 27, C.e0);
setPixel(8, 28, C.e0); setPixel(13, 28, C.e0);
setPixel(9, 29, C.e0); setPixel(12, 29, C.e0);
setPixel(10, 30, C.e0); setPixel(11, 30, C.e0);

// Emerald facets
setPixel(10, 27, C.e5); setPixel(11, 27, C.e4);
setPixel(9, 28, C.e6); setPixel(10, 28, C.e5); setPixel(11, 28, C.e3); setPixel(12, 28, C.e1);
setPixel(10, 29, C.e4); setPixel(11, 29, C.e2);

// --- 7. Golden Ingot "L" Monogram (Ledgerly's iconic mark) ---
// Positioned prominently on front cover: x=13..19, y=8..18
// Beveled Minecraft Gold Ingot style

// Outline around the L for high contrast:
const lOutline = [
  [12, 8], [13, 7], [14, 7], [15, 7], [16, 8],
  [16, 9], [16, 10], [16, 11], [16, 12], [16, 13],
  [17, 13], [18, 13], [19, 13], [20, 14],
  [20, 15], [20, 16], [20, 17], [19, 18],
  [18, 18], [17, 18], [16, 18], [15, 18], [14, 18], [13, 18],
  [12, 17], [12, 16], [12, 15], [12, 14], [12, 13], [12, 12], [12, 11], [12, 10], [12, 9]
];
for (const [ox, oy] of lOutline) {
  setPixel(ox, oy, C.g0);
}

// Vertical stem of "L": x=13..15, y=8..17
for (let y = 8; y <= 16; y++) {
  setPixel(13, y, y === 8 ? C.g6 : C.g5); // Left bright highlight
  setPixel(14, y, y === 8 ? C.g5 : C.g4); // Midtone gold
  setPixel(15, y, C.g2); // Right shadow bevel
}

// Horizontal base of "L": x=13..19, y=15..17
for (let x = 13; x <= 19; x++) {
  setPixel(x, 15, x === 13 ? C.g5 : C.g4); // Top edge
  setPixel(x, 16, x === 13 ? C.g4 : C.g3); // Middle
  setPixel(x, 17, C.g1); // Bottom shadow bevel
}
// Brightest corner highlights on L:
setPixel(13, 8, C.g6);
setPixel(14, 8, C.g6);
setPixel(13, 9, C.g6);
setPixel(19, 15, C.g5);
setPixel(19, 16, C.g3);
setPixel(19, 17, C.g1);

// --- 8. Minecraft Feather Quill (Writing Pen) ---
// Angled down from top right (x=29, y=1) to the book (x=20, y=10)
// Feather Barbs & Shaft:
const quillPixels = [
  // Tip of feather:
  [28, 1, C.q5], [29, 1, C.q4],
  [27, 2, C.q5], [28, 2, C.q5], [29, 2, C.q4], [30, 2, C.q3],
  [26, 3, C.q5], [27, 3, C.q5], [28, 3, C.q4], [29, 3, C.q2],
  [25, 4, C.q5], [26, 4, C.q4], [27, 4, C.q3], [28, 4, C.q1],
  // Mid feather:
  [24, 5, C.q5], [25, 5, C.q4], [26, 5, C.q2],
  [23, 6, C.q5], [24, 6, C.q3], [25, 6, C.q1],
  [22, 7, C.q4], [23, 7, C.q2],
  // Lower shaft:
  [21, 8, C.q3], [22, 8, C.q0],
  // Golden Nib of the Pen (Writing on the ledger):
  [20, 9, C.g5], [21, 9, C.g2],
  [19, 10, C.g6], [20, 10, C.g1],
  [18, 11, C.k], // Nib point
];

// Quill dark border
const quillBorder = [
  [27, 1], [30, 1],
  [26, 2], [31, 2],
  [25, 3], [30, 3],
  [24, 4], [29, 4],
  [23, 5], [27, 5],
  [22, 6], [26, 6],
  [21, 7], [24, 7],
  [20, 8], [23, 8],
  [19, 9], [22, 9],
  [18, 10], [21, 10],
  [17, 11], [19, 11], [20, 11],
  [18, 12]
];
for (const [bx, by] of quillBorder) {
  if (!canvas[by][bx] || canvas[by][bx].startsWith('rgba')) {
    setPixel(bx, by, C.k);
  }
}
for (const [qx, qy, qc] of quillPixels) {
  setPixel(qx, qy, qc);
}

// --- 9. Minecraft Magic Sparkles / Particles ---
// Diamond star at [2, 10]
setPixel(2, 9, C.d3);
setPixel(1, 10, C.d3); setPixel(2, 10, C.d4); setPixel(3, 10, C.d3);
setPixel(2, 11, C.d3);
setPixel(2, 8, C.d1); setPixel(0, 10, C.d1); setPixel(4, 10, C.d1); setPixel(2, 12, C.d1);

// Gold star at [29, 9]
setPixel(29, 8, C.g5);
setPixel(28, 9, C.g5); setPixel(29, 9, C.g6); setPixel(30, 9, C.g5);
setPixel(29, 10, C.g5);

// Little glint near emerald at [7, 28]
setPixel(6, 28, C.e5); setPixel(7, 27, C.e5); setPixel(7, 29, C.e5);

// Export to SVG with crispEdges
function generateSvg(transparent = true, bgFrame = false) {
  let rects = '';
  
  if (bgFrame) {
    // 512x512 framed icon for PWA home-screen app icon
    rects += `<rect width="512" height="512" fill="#181410"/>\n`;
    // Minecraft item-frame border
    rects += `<rect x="16" y="16" width="480" height="480" fill="#261d15" stroke="#3d2e22" stroke-width="8"/>\n`;
    rects += `<rect x="28" y="28" width="456" height="456" fill="#120e0a" stroke="#000000" stroke-width="6"/>\n`;
  }

  // Scale: 32x32 -> 512x512 (each pixel is 16x16 units)
  const SCALE = 16;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const col = canvas[y][x];
      if (col && col !== 'transparent') {
        const px = x * SCALE;
        const py = y * SCALE;
        rects += `<rect x="${px}" y="${py}" width="${SCALE}" height="${SCALE}" fill="${col}"/>\n`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" shape-rendering="crispEdges">
${rects}</svg>`;
}

const transparentSvg = generateSvg(true, false);
const framedSvg = generateSvg(false, true);

fs.writeFileSync(path.resolve('public/logo.svg'), transparentSvg);
fs.writeFileSync(path.resolve('public/favicon.svg'), transparentSvg);

console.log('Successfully generated public/logo.svg and public/favicon.svg!');

// Also generate high-res PNG files using sharp
async function makePngs() {
  const transparentBuffer = Buffer.from(transparentSvg);
  const framedBuffer = Buffer.from(framedSvg);

  // Logo png
  await sharp(transparentBuffer)
    .resize(512, 512, { kernel: 'nearest' })
    .png()
    .toFile(path.resolve('public/logo.png'));

  // Favicon 64x64
  await sharp(transparentBuffer)
    .resize(64, 64, { kernel: 'nearest' })
    .png()
    .toFile(path.resolve('public/favicon-64.png'));

  // PWA 192x192 (Framed Minecraft Icon for home screen)
  await sharp(framedBuffer)
    .resize(192, 192, { kernel: 'nearest' })
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));

  // PWA 512x512
  await sharp(framedBuffer)
    .resize(512, 512, { kernel: 'nearest' })
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));

  // PWA Maskable 512x512
  await sharp(framedBuffer)
    .resize(512, 512, { kernel: 'nearest' })
    .png()
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));

  // Apple touch icon 180x180
  await sharp(framedBuffer)
    .resize(180, 180, { kernel: 'nearest' })
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));

  console.log('All PNGs successfully rendered with sharp!');
}

makePngs().catch(console.error);
