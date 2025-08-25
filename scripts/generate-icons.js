const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  
  // Border
  ctx.strokeStyle = '#E6E6E6';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  
  // Center circle with "BO" text
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  
  // Circle background
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // "BO" text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BO', centerX, centerY);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

// Ensure assets directory exists
const assetsDir = path.join(__dirname, '..', 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate icons
generateIcon(192, path.join(assetsDir, 'icon-192.png'));
generateIcon(512, path.join(assetsDir, 'icon-512.png'));

console.log('PWA icons generated successfully!');