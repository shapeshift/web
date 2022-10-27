describe('empty spec', () => {
  it('passes', () => {
    cy.visit('https://example.cypress.io')
  })

  /* ==== Test Created with Cypress Studio ==== */
  it('sets default assets on route change', function () {
    /* ==== Generated with Cypress Studio ==== */
    cy.visit('/')
    cy.get('[data-test="connect-demo-wallet-button"] > .chakra-text').click()
    cy.get(':nth-child(1) > .css-fl0hl5 > .chakra-button').should('have.text', 'ETH')
    cy.get(':nth-child(3) > .css-fl0hl5 > .chakra-button').should('have.text', 'FOX')
    cy.get('[data-test="account-row-asset-name-DOGE"] > .chakra-text').click()
    cy.get(':nth-child(1) > .css-fl0hl5 > .chakra-button').should('have.text', 'ETH')
    cy.get(':nth-child(3) > .css-fl0hl5 > .chakra-button').should('have.text', 'DOGE')
    cy.get('[data-test="navigation-dashboard-button"] > .css-1o50bbg').click()
    cy.get('.chakra-input__group > .chakra-input').clear('u')
    cy.get('.chakra-input__group > .chakra-input').type('usdc')
    cy.get(
      '[style="position: absolute; left: 0px; top: 0px; height: 60px; width: 100%;"] > .css-13brihr > .css-1v0cd8t',
    ).click()
    cy.get(':nth-child(1) > .css-fl0hl5 > .chakra-button').should('have.text', 'ETH')
    cy.get(':nth-child(3) > .css-fl0hl5 > .chakra-button').should('have.text', 'USDC')
    /* ==== End Cypress Studio ==== */
  })
})
