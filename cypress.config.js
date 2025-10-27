const { defineConfig } = require('cypress');
const fs = require('fs');
const https = require('https');

try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not loaded, using environment variables directly');
}

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8000',
    env: {
      BLUESKY_HANDLE: process.env.BLUESKY_HANDLE,
      BLUESKY_APP_PASSWORD: process.env.BLUESKY_APP_PASSWORD
    },
    setupNodeEvents(on, config) {
      on('task', {
        uploadImageToBluesky({ imagePath, accessToken }) {
          return new Promise((resolve, reject) => {
            const imageBuffer = fs.readFileSync(imagePath);
            
            console.log(`Uploading image: ${imageBuffer.length} bytes`);
            
            const options = {
              hostname: 'bsky.social',
              path: '/xrpc/com.atproto.repo.uploadBlob',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'image/jpeg',
                'Content-Length': imageBuffer.length
              }
            };
            
            const req = https.request(options, (res) => {
              let data = '';
              
              res.on('data', (chunk) => {
                data += chunk;
              });
              
              res.on('end', () => {
                console.log('Upload response status:', res.statusCode);
                console.log('Upload response body:', data);
                
                try {
                  const body = JSON.parse(data);
                  resolve({
                    status: res.statusCode,
                    body: body
                  });
                } catch (e) {
                  reject(new Error(`Failed to parse response: ${data}`));
                }
              });
            });
            
            req.on('error', (error) => {
              console.error('Upload error:', error);
              reject(error);
            });
            
            req.write(imageBuffer);
            req.end();
          });
        }
      });

      return config;
    },
  },
});