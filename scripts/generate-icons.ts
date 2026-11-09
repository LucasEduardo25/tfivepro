import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ICONS_DIR = path.resolve('public/icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 1. Standard Dark Icon SVG (512x512) - TFIVE PRO Official
const createDarkSvg = (size: number, isMaskable = false) => {
  // If maskable, scale content to 70% to stay strictly inside Android 80% safe zone
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0F0F12"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>
  
  <!-- Subtle inner border for premium dark finish -->
  ${!isMaskable ? `<rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="32" stroke="#27272a" stroke-width="2" fill="none"/>` : ''}

  <!-- Main Logo Group (T-FIVE with red accents & PRO/25) -->
  <g transform="translate(${cx}, ${cy}) scale(${scale}) translate(-256, -256)" filter="url(#glow)">
    
    <!-- Top athletic brand mark -->
    <g font-family="system-ui, -apple-system, 'Impact', 'Montserrat', 'Inter', sans-serif" font-weight="900" font-style="normal" text-anchor="middle">
      
      <!-- Main Brand Name: T - FIVE -->
      <g transform="translate(256, 245)">
        <!-- "T" -->
        <text x="-165" y="0" fill="#FFFFFF" font-size="94" font-weight="950" letter-spacing="-1">T</text>
        
        <!-- Red Hyphen "-" -->
        <rect x="-122" y="-36" width="22" height="15" rx="2" fill="#D90429" />

        <!-- "FIVE" -->
        <text x="25" y="0" fill="#FFFFFF" font-size="94" font-weight="950" letter-spacing="4">FIVE</text>

        <!-- Red Hyphen "-" -->
        <rect x="156" y="-36" width="20" height="15" rx="2" fill="#D90429" />

        <!-- "25" Athletic Badge Accent -->
        <text x="202" y="0" fill="#D90429" font-size="74" font-weight="950" letter-spacing="0">25</text>
      </g>

      <!-- PRO Subtitle Badge -->
      <g transform="translate(256, 310)">
        <rect x="-60" y="-20" width="120" height="30" rx="6" fill="#D90429" />
        <text x="0" y="2" fill="#FFFFFF" font-size="19" font-weight="900" letter-spacing="5" text-anchor="middle">PRO</text>
      </g>

      <!-- Bottom Tagline / Micro Accent -->
      <text x="256" y="360" fill="#71717A" font-size="12" font-weight="800" letter-spacing="6">PERSONAL TRAINER</text>
    </g>

  </g>
</svg>
`;
};

// 2. Light Version (512x512)
const createLightSvg = (size: number) => {
  const scale = 0.88;
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#FFFFFF"/>
  <rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="32" stroke="#E4E4E7" stroke-width="2" fill="none"/>

  <g transform="translate(${cx}, ${cy}) scale(${scale}) translate(-256, -256)">
    <g font-family="system-ui, -apple-system, 'Impact', 'Montserrat', 'Inter', sans-serif" font-weight="900" font-style="normal" text-anchor="middle">
      
      <!-- Main Brand Name: T - FIVE - 25 -->
      <g transform="translate(256, 245)">
        <text x="-165" y="0" fill="#09090B" font-size="94" font-weight="950" letter-spacing="-1">T</text>
        <rect x="-122" y="-36" width="22" height="15" rx="2" fill="#D90429" />
        <text x="25" y="0" fill="#09090B" font-size="94" font-weight="950" letter-spacing="4">FIVE</text>
        <rect x="156" y="-36" width="20" height="15" rx="2" fill="#D90429" />
        <text x="202" y="0" fill="#D90429" font-size="74" font-weight="950" letter-spacing="0">25</text>
      </g>

      <!-- PRO Subtitle Badge -->
      <g transform="translate(256, 310)">
        <rect x="-60" y="-20" width="120" height="30" rx="6" fill="#D90429" />
        <text x="0" y="2" fill="#FFFFFF" font-size="19" font-weight="900" letter-spacing="5" text-anchor="middle">PRO</text>
      </g>

      <text x="256" y="360" fill="#71717A" font-size="12" font-weight="800" letter-spacing="6">PERSONAL TRAINER</text>
    </g>
  </g>
</svg>
`;
};

// 3. Compact / Favicon SVG (High legibility at tiny 16px / 32px / 48px)
const createFaviconSvg = () => {
  return `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="#050505"/>
  <rect x="2" y="2" width="60" height="60" rx="12" stroke="#27272A" stroke-width="1.5" fill="none"/>
  
  <g font-family="system-ui, -apple-system, 'Impact', sans-serif" font-weight="950" text-anchor="middle">
    <!-- T - 5 High-impact compact lockup -->
    <text x="20" y="38" fill="#FFFFFF" font-size="28" letter-spacing="-1">T</text>
    <rect x="28" y="27" width="7" height="5" rx="1" fill="#D90429" />
    <text x="47" y="38" fill="#D90429" font-size="28" letter-spacing="0">5</text>
    
    <!-- Micro PRO bottom bar -->
    <rect x="16" y="44" width="32" height="7" rx="2" fill="#D90429" />
    <text x="32" y="50" fill="#FFFFFF" font-size="6" font-weight="900" letter-spacing="1.5">PRO</text>
  </g>
</svg>
`;
};

async function generateAllAssets() {
  console.log('Generating TFIVE PRO visual identity assets...');

  const darkSvg512 = createDarkSvg(512, false);
  const maskableSvg512 = createDarkSvg(512, true);
  const lightSvg512 = createLightSvg(512);
  const faviconSvg = createFaviconSvg();

  // Write SVGs
  fs.writeFileSync(path.resolve('public/favicon.svg'), faviconSvg.trim());
  fs.writeFileSync(path.resolve('public/icons/tfive-512.svg'), darkSvg512.trim());
  fs.writeFileSync(path.resolve('public/icons/tfive-maskable-512.svg'), maskableSvg512.trim());
  fs.writeFileSync(path.resolve('public/icons/tfive-light-512.svg'), lightSvg512.trim());
  fs.writeFileSync(path.resolve('public/icons/icon-192.svg'), createDarkSvg(192, false).trim());
  fs.writeFileSync(path.resolve('public/icons/icon-512.svg'), darkSvg512.trim());
  fs.writeFileSync(path.resolve('public/icons/icon-maskable-512.svg'), maskableSvg512.trim());

  // Render PNGs using Sharp
  // 1. 512x512 Dark PWA Icon
  await sharp(Buffer.from(darkSvg512))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/tfive-512.png'));

  await sharp(Buffer.from(darkSvg512))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/icon-512.png'));

  // 2. 512x512 Maskable PWA Icon (safe zone)
  await sharp(Buffer.from(maskableSvg512))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/tfive-maskable-512.png'));

  await sharp(Buffer.from(maskableSvg512))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/icon-maskable-512.png'));

  // 3. 192x192 Dark PWA Icon
  await sharp(Buffer.from(createDarkSvg(192, false)))
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/icons/tfive-192.png'));

  await sharp(Buffer.from(createDarkSvg(192, false)))
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/icons/icon-192.png'));

  // 4. 180x180 Apple Touch Icon
  await sharp(Buffer.from(createDarkSvg(180, false)))
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/icons/apple-touch-icon.png'));

  await sharp(Buffer.from(createDarkSvg(180, false)))
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));

  // 5. 512x512 Light Icon
  await sharp(Buffer.from(lightSvg512))
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icons/tfive-light-512.png'));

  // 6. Favicon PNG (32x32 & 48x48)
  await sharp(Buffer.from(faviconSvg))
    .resize(48, 48)
    .png()
    .toFile(path.resolve('public/favicon.png'));

  console.log('All TFIVE PRO icon assets created successfully in /public/icons!');
}

generateAllAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
