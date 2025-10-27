/// <reference types="cypress" />

describe('Bluesky image post test', () => {
  const baseUrl = 'https://bsky.social/xrpc';
  const imagePath = 'cypress/fixtures/test-image.jpg';
  const testText = `Cypress test image ${Date.now()} #photography`;

  let accessToken;
  let handle;
  let did;
  let postUri;

  it('logs into Bluesky, uploads image, posts it, verifies on photo grid, and deletes it', () => {
    handle = Cypress.env('BLUESKY_HANDLE');
    const password = Cypress.env('BLUESKY_APP_PASSWORD');

    expect(handle, 'BLUESKY_HANDLE').to.be.a('string').and.not.be.empty;
    expect(password, 'BLUESKY_APP_PASSWORD').to.be.a('string').and.not.be.empty;

    // --- Step 1: Log in to Bluesky ---
    cy.request({
      method: 'POST',
      url: `${baseUrl}/com.atproto.server.createSession`,
      body: { identifier: handle, password }
    }).then((loginRes) => {
      expect(loginRes.status).to.eq(200);
      accessToken = loginRes.body.accessJwt;
      did = loginRes.body.did;
      expect(accessToken).to.exist;
      cy.log('✅ Logged into Bluesky');
      cy.log('DID:', did);

      // --- Step 2: Upload image via Node task ---
      cy.task('uploadImageToBluesky', {
        imagePath,
        accessToken
      }).then((uploadRes) => {
        cy.log('Upload response:', JSON.stringify(uploadRes));
        expect(uploadRes.status).to.eq(200);
        expect(uploadRes.body.blob).to.have.property('ref');
        cy.log('✅ Uploaded image to Bluesky');
        
        const imageBlob = uploadRes.body.blob;

        // --- Step 3: Create a post with the uploaded image ---
        cy.request({
          method: 'POST',
          url: `${baseUrl}/com.atproto.repo.createRecord`,
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            repo: did,
            collection: 'app.bsky.feed.post',
            record: {
              $type: 'app.bsky.feed.post',
              text: testText,
              createdAt: new Date().toISOString(),
              embed: {
                $type: 'app.bsky.embed.images',
                images: [
                  {
                    alt: 'Test image upload from Cypress',
                    image: imageBlob
                  }
                ]
              }
            }
          }
        }).then((postRes) => {
          expect(postRes.status).to.eq(200);
          postUri = postRes.body.uri;
          cy.log(`✅ Post created: ${postUri}`);

          // --- Step 4: Wait for Bluesky to process the image ---
          cy.wait(5000);

          // --- Step 5: Rebuild the photo grid site ---
          cy.log('Rebuilding site with python main.py...');
          cy.exec('python main.py', { timeout: 180000 }).then((result) => {
            cy.log('Build completed');
            if (result.stderr) {
              cy.log('Build errors:', result.stderr);
            }
            cy.log('✅ Site rebuilt successfully');
          });

          // --- Step 6: Wait for server to pick up changes ---
          cy.wait(3000);

          // --- Step 7: Visit photo grid and verify image appears ---
          cy.visit('http://localhost:8000/');
          
          cy.get('[data-cy="gallery-grid"]').should('be.visible');
          cy.get('[data-cy="gallery-grid"] img').should('have.length.at.least', 1);
          
          // Verify the new image appears in the first position
          cy.get('[data-cy="first-grid-item"]')
            .should('be.visible')
            .invoke('attr', 'data-sub-html')
            .should('include', testText);
          
          cy.log('✅ Verified image appears in first position on photo grid');
          
          cy.get('[data-cy="first-grid-item"] img')
            .should('be.visible')
            .and('have.attr', 'src');

          // --- Step 8: Clean up (delete the post) ---
          if (!postUri) {
            cy.log('⚠️ No post URI found — skipping deletion.');
            return;
          }

          const rkey = postUri.split('/').pop();
          cy.log(`Deleting post with rkey: ${rkey}`);

          cy.request({
            method: 'POST',
            url: `${baseUrl}/com.atproto.repo.deleteRecord`,
            headers: { Authorization: `Bearer ${accessToken}` },
            body: {
              repo: did,
              collection: 'app.bsky.feed.post',
              rkey: rkey
            }
          }).then((deleteRes) => {
            expect(deleteRes.status).to.eq(200);
            cy.log(`🧹 Deleted test post: ${rkey}`);
          });
        });
      });
    });
  });
});