const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple icon SVG (blue circle with "LiS" text)
const createIconSvg = (size) => {
  const fontSize = Math.round(size * 0.35);
  const padding = Math.round(size * 0.1);
  
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#grad)"/>
      <text 
        x="50%" 
        y="55%" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >LiS</text>
    </svg>
  `;
};

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('Generating PWA icons...');
  
  for (const size of sizes) {
    const svg = createIconSvg(size);
    const outputPath = path.join(publicDir, `icon-${size}.png`);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ Generated icon-${size}.png`);
  }
  
  // Generate favicon.ico (using 32x32)
  const faviconSvg = createIconSvg(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('  ✓ Generated favicon.ico');
  
  // Generate apple-touch-icon (180x180)
  const appleSvg = createIconSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('  ✓ Generated apple-touch-icon.png');
  
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
