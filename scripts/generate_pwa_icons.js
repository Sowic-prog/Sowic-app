
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_IMAGE = 'public/logo.jpg';
const OUTPUT_DIR = 'public';

const SIZES = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }, // Optional for iOS
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 }
];

async function generateIcons() {
    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error(`Source image not found: ${SOURCE_IMAGE}`);
        process.exit(1);
    }

    console.log('Generating PWA icons...');

    for (const { name, size } of SIZES) {
        const outputPath = path.join(OUTPUT_DIR, name);
        try {
            await sharp(SOURCE_IMAGE)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent padding if aspect ratio differs
                })
                .png() // Force PNG
                .toFile(outputPath);
            console.log(`Created ${name}`);
        } catch (error) {
            console.error(`Error creating ${name}:`, error);
        }
    }

    // Also create a maskable icon (often requires padding, simplistically represented here)
    // For a real maskable icon, you want significant safe area.
    // We'll just generate another 512 one as maskable for now.
    try {
        await sharp(SOURCE_IMAGE)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for maskable
            })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'pwa-maskable-512x512.png'));
        console.log('Created pwa-maskable-512x512.png');
    } catch (error) {
        console.error('Error creating maskable icon:', error);
    }
}

generateIcons();
