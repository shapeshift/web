describe('First Web Test', () => {
    it('This is a Test and it does not do much!', () => {

        cy.visit('https://example.cypress.io')

        cy.contains('type').click()

        // Validate URL contains '/commands/actions'
        cy.url().should('include', '/commands/actions')

        // Get an input, type into it and verify that the value has been updated
        cy.get('.action-email')
            .type('fake@email.com')
            .should('have.value', 'fake@email.com')
    })
})
