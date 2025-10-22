describe('Pagination', () => {

  it('Navigates pages via button and dropdown menu', function() {
    cy.visit('http://localhost:8000/?page=1')
    cy.get('[data-cy="prev-button"]').should('be.disabled');
    cy.get('[data-cy="next-button"]').should('be.enabled');
    cy.get('[data-cy="page-select"]').should('be.enabled');
    cy.get('[data-cy="next-button"]').click();
    cy.get('[data-cy="prev-button"]').should('be.enabled');
    cy.get('[data-cy="page-select"]').select('3');
    
  });
})