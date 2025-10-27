describe('Basic site navigation', () => {

  it('Site navigation is functional', function() {
    cy.visit('http://localhost:8000/')
    cy.get('[data-cy="website-title"]').should('be.visible');
    cy.get('[data-cy="website-subtitle"] a[href="https://www.robotimpurity.com"]').should('be.visible');
    cy.get('[data-cy="website-subtitle"] a[href="mailto:robotimpurity@gmail.com"]').should('be.visible');
    cy.get('[data-cy="sort-select"]').should('be.visible');
    
    // Select date-asc and verify sorting works
    cy.get('[data-cy="sort-select"]').select('date-asc');
    cy.get('[data-cy="gallery-grid"] a').then(($items) => {
      const dates = [];
      
      // Extract all dates from the grid
      $items.each((idx, item) => {
        const subHtml = item.getAttribute('data-sub-html');
        const dateMatch = subHtml.match(/Posted on ([\d-]+)/);
        if (dateMatch && dateMatch[1]) {
          const dateString = dateMatch[1].trim();
          dates.push(new Date(dateString).getTime());
        }
      });
      
      cy.log('Dates found (asc):', dates.map(d => new Date(d).toISOString().split('T')[0]));
      
      // Find first pair of different dates and verify order
      let foundDifferentDates = false;
      for (let i = 0; i < dates.length - 1; i++) {
        if (dates[i] !== dates[i + 1]) {
          expect(dates[i]).to.be.at.most(dates[i + 1], 
            `Date at index ${i} should be <= date at index ${i + 1}`);
          foundDifferentDates = true;
          cy.log(`Verified ascending order: ${new Date(dates[i]).toISOString().split('T')[0]} <= ${new Date(dates[i + 1]).toISOString().split('T')[0]}`);
          break;
        }
      }
      
      // If we didn't find different dates, at least verify all dates are equal
      if (!foundDifferentDates) {
        cy.log('All visible images share the same date');
        expect(dates.every(d => d === dates[0])).to.be.true;
      }
    });
    
    // Select likes-desc and verify sorting works
    cy.get('[data-cy="sort-select"]').select('likes-desc');
    cy.get('[data-cy="gallery-grid"] a').then(($items) => {
      const likes = [];
      
      // Extract all like counts from the grid
      $items.each((idx, item) => {
        const subHtml = item.getAttribute('data-sub-html');
        const likeMatch = subHtml.match(/❤️\s*(\d+)/);
        if (likeMatch && likeMatch[1]) {
          likes.push(parseInt(likeMatch[1], 10));
        }
      });
      
      cy.log('Likes found (desc):', likes);
      
      // Find first pair with different like counts and verify order
      let foundDifferentLikes = false;
      for (let i = 0; i < likes.length - 1; i++) {
        if (likes[i] !== likes[i + 1]) {
          expect(likes[i]).to.be.at.least(likes[i + 1], 
            `Likes at index ${i} should be >= likes at index ${i + 1}`);
          foundDifferentLikes = true;
          cy.log(`Verified descending likes: ${likes[i]} >= ${likes[i + 1]}`);
          break;
        }
      }
      
      // If we didn't find different like counts, verify all are equal
      if (!foundDifferentLikes) {
        cy.log('All visible images have the same number of likes');
        expect(likes.every(l => l === likes[0])).to.be.true;
      }
    });
    
    // Select likes-asc and verify sorting works
    cy.get('[data-cy="sort-select"]').select('likes-asc');
    cy.get('[data-cy="gallery-grid"] a').then(($items) => {
      const likes = [];
      
      // Extract all like counts from the grid
      $items.each((idx, item) => {
        const subHtml = item.getAttribute('data-sub-html');
        const likeMatch = subHtml.match(/❤️\s*(\d+)/);
        if (likeMatch && likeMatch[1]) {
          likes.push(parseInt(likeMatch[1], 10));
        }
      });
      
      cy.log('Likes found (asc):', likes);
      
      // Find first pair with different like counts and verify order
      let foundDifferentLikes = false;
      for (let i = 0; i < likes.length - 1; i++) {
        if (likes[i] !== likes[i + 1]) {
          expect(likes[i]).to.be.at.most(likes[i + 1], 
            `Likes at index ${i} should be <= likes at index ${i + 1}`);
          foundDifferentLikes = true;
          cy.log(`Verified ascending likes: ${likes[i]} <= ${likes[i + 1]}`);
          break;
        }
      }
      
      // If we didn't find different like counts, verify all are equal
      if (!foundDifferentLikes) {
        cy.log('All visible images have the same number of likes');
        expect(likes.every(l => l === likes[0])).to.be.true;
      }
    });
    
// Select reposts-desc and verify sorting works
cy.get('[data-cy="sort-select"]').select('reposts-desc');
cy.get('[data-cy="gallery-grid"] a').then(($items) => {
  const reposts = [];
  
  // Extract all repost counts from the grid
  $items.each((idx, item) => {
    const subHtml = item.getAttribute('data-sub-html');
    const repostMatch = subHtml.match(/🔄\s*(\d+)/);
    if (repostMatch && repostMatch[1]) {
      reposts.push(parseInt(repostMatch[1], 10));
    }
  });
  
  cy.log('Reposts found (desc):', reposts);
  
  // Find first pair with different repost counts and verify order
  let foundDifferentReposts = false;
  for (let i = 0; i < reposts.length - 1; i++) {
    if (reposts[i] !== reposts[i + 1]) {
      expect(reposts[i]).to.be.at.least(reposts[i + 1], 
        `Reposts at index ${i} should be >= reposts at index ${i + 1}`);
      foundDifferentReposts = true;
      cy.log(`Verified descending reposts: ${reposts[i]} >= ${reposts[i + 1]}`);
      break;
    }
  }
  
  // If we didn't find different repost counts, verify all are equal
  if (!foundDifferentReposts) {
    cy.log('All visible images have the same number of reposts');
    expect(reposts.every(r => r === reposts[0])).to.be.true;
  }
});

// Select replies-desc and verify sorting works
cy.get('[data-cy="sort-select"]').select('replies-desc');
cy.get('[data-cy="gallery-grid"] a').then(($items) => {
  const replies = [];
  
  // Extract all reply counts from the grid
  $items.each((idx, item) => {
    const subHtml = item.getAttribute('data-sub-html');
    const replyMatch = subHtml.match(/💬\s*(\d+)/);
    if (replyMatch && replyMatch[1]) {
      replies.push(parseInt(replyMatch[1], 10));
    }
  });
  
  cy.log('Replies found (desc):', replies);
  
  // Find first pair with different reply counts and verify order
  let foundDifferentReplies = false;
  for (let i = 0; i < replies.length - 1; i++) {
    if (replies[i] !== replies[i + 1]) {
      expect(replies[i]).to.be.at.least(replies[i + 1], 
        `Replies at index ${i} should be >= replies at index ${i + 1}`);
      foundDifferentReplies = true;
      cy.log(`Verified descending replies: ${replies[i]} >= ${replies[i + 1]}`);
      break;
    }
  }
  
  // If we didn't find different reply counts, verify all are equal
  if (!foundDifferentReplies) {
    cy.log('All visible images have the same number of replies');
    expect(replies.every(r => r === replies[0])).to.be.true;
  }
});
    
    // Select date-desc and verify sorting works
    cy.get('[data-cy="sort-select"]').select('date-desc');
    cy.get('[data-cy="gallery-grid"] a').then(($items) => {
      const dates = [];
      
      // Extract all dates from the grid
      $items.each((idx, item) => {
        const subHtml = item.getAttribute('data-sub-html');
        const dateMatch = subHtml.match(/Posted on ([\d-]+)/);
        if (dateMatch && dateMatch[1]) {
          const dateString = dateMatch[1].trim();
          dates.push(new Date(dateString).getTime());
        }
      });
      
      cy.log('Dates found (desc):', dates.map(d => new Date(d).toISOString().split('T')[0]));
      
      // Find first pair of different dates and verify order
      let foundDifferentDates = false;
      for (let i = 0; i < dates.length - 1; i++) {
        if (dates[i] !== dates[i + 1]) {
          expect(dates[i]).to.be.at.least(dates[i + 1], 
            `Date at index ${i} should be >= date at index ${i + 1}`);
          foundDifferentDates = true;
          cy.log(`Verified descending order: ${new Date(dates[i]).toISOString().split('T')[0]} >= ${new Date(dates[i + 1]).toISOString().split('T')[0]}`);
          break;
        }
      }
      
      // If we didn't find different dates, at least verify all dates are equal
      if (!foundDifferentDates) {
        cy.log('All visible images share the same date');
        expect(dates.every(d => d === dates[0])).to.be.true;
      }
    });
    
    cy.get('[data-cy="prev-button"]').should('be.disabled');
    cy.get('[data-cy="next-button"]').should('be.enabled');
    cy.get('[data-cy="next-button"]').click();
    cy.get('[data-cy="page-select"]').should('be.visible');
    cy.get('[data-cy="page-select"]').select('5');
    cy.get('[data-cy="prev-button"]').should('be.enabled');
    
  });
})