describe('Basic Page Load Test', () => {

  it('Page load and navigation butttons work', function() {
    cy.visit('http://localhost:8000/?page=1')
    cy.get('h1').should('be.visible');
    cy.get('h3.subtitle').should('be.visible');
    cy.get('#lightgallery a:nth-child(1) img').should('be.visible');
    cy.get('#prev-btn').should('be.disabled');
    cy.get('#next-btn').should('be.enabled');
    cy.get('h3:nth-child(9)').should('be.visible');
    cy.get('#next-btn').click();
    cy.get('#lightgallery a:nth-child(1) img').should('be.visible');
    cy.get('#prev-btn').should('be.enabled');
    cy.get('#next-btn').should('be.enabled');
    
  });
})