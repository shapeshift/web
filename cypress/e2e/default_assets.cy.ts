describe('Default assets', () => {
  it('are set on route change', () => {
    cy.visit('/')
    cy.getBySel('connect-demo-wallet-button').click()

    cy.getBySel('asset-input-selection-button').first().should('have.text', 'ETH')
    cy.getBySel('asset-input-selection-button').last().should('have.text', 'FOX')

    cy.get('[data-test="account-row-asset-name-DOGE"] > .chakra-text').click()
    cy.getBySel('asset-input-selection-button').first().should('have.text', 'ETH')
    cy.getBySel('asset-input-selection-button').last().should('have.text', 'DOGE')

    cy.get('[data-test="navigation-dashboard-button"]').click()
    cy.get('[data-test="account-row-asset-name-BTC"] > .chakra-text').click()
    cy.getBySel('asset-input-selection-button').first().should('have.text', 'ETH')
    cy.getBySel('asset-input-selection-button').last().should('have.text', 'BTC')
  })
})

export {}
