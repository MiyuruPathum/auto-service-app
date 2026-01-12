/**
 * Download React and Babel production builds for offline use
 * Run with: node scripts/download-libs.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const libs = [
    {
        url: 'https://unpkg.com/react@18/umd/react.development.js',
        dest: 'src/renderer/lib/react.development.js'
    },
    {
        url: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
        dest: 'src/renderer/lib/react-dom.development.js'
    },
    {
        url: 'https://unpkg.com/@babel/standalone/babel.min.js',
        dest: 'src/renderer/lib/babel.min.js'
    },
    {
        url: 'https://cdn.tailwindcss.com/3.4.1',
        dest: 'src/renderer/lib/tailwind.min.js'
    }
];

const download = (url, dest, redirectCount = 0) => {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            return reject(new Error('Too many redirects'));
        }
        
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                let redirectUrl = response.headers.location;
                // Handle relative redirects
                if (redirectUrl.startsWith('/')) {
                    const urlObj = new URL(url);
                    redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
                }
                return download(redirectUrl, dest, redirectCount + 1).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                return reject(new Error(`HTTP ${response.statusCode}`));
            }
            
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

async function main() {
    console.log('📦 Downloading React libraries for offline use...\n');
    
    for (const lib of libs) {
        const destPath = path.join(process.cwd(), lib.dest);
        
        // Check if already exists
        if (fs.existsSync(destPath)) {
            console.log(`✓ ${path.basename(lib.dest)} already exists`);
            continue;
        }
        
        try {
            console.log(`↓ Downloading ${path.basename(lib.dest)}...`);
            await download(lib.url, destPath);
            console.log(`✓ Saved to ${lib.dest}`);
        } catch (err) {
            console.error(`✗ Failed to download ${lib.url}: ${err.message}`);
        }
    }
    
    console.log('\n✅ Library download complete! App now works offline.');
}

main();
