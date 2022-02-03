beforeEach(() => {
  // Cypress already automatically clears localStorage, cookies, sessions, etc. before each test
  // We do, however, need to clear indexedDB during login to clear any saved wallet data
  // cy.login()
})

describe('The Dashboard', () => {
  before(() => {
    // Cypress already automatically clears localStorage, cookies, sessions, etc. before each test
    // We do, however, need to clear indexedDB during login to clear any saved wallet data
    cy.login()

    // Intercept all account requests relating to our test wallet
    cy.mockAllRequests()
  })

  it('displays the expected account rows', () => {
    cy.getBySel('account-row').should('have.length', 7)

    // Check LINK - one asset is enough. Test all and our tests become brittle.
    // TODO - Mock API response and test account row name
    cy.getBySel('account-row-asset-crypto-LINK').should('have.text', '1,916.203151 LINK')
    // TODO - Mock API response and test account row price
    // TODO - Mock API response and test account row value
    // TODO - Mock API response and test account row allocation

    // TODO - Open account and check transactions and values
  })

  // it('displays the correct total balance', () => {
  //   // mock token price response
  //   // Check in different fiat currencies
  // })
  //
  // it('displays the expected graph and intervals', () => {
  //
  // })
  //
  // it('displays data in titles for expected data-points', () => {
  //
  // })
  //
  it('supports trades', () => {
    cy.getBySel('token-row-sell').within(() => {
      cy.get('input').type('89')
    })
    // Increase the timeout to mitigate the risk of flaking during quote request
    cy.getBySel('trade-preview-button', { timeout: 8000 })
      .should('be.disabled')
      .should('have.text', 'Insufficient Funds')
    cy.getBySel('trade-rate-quote').should('have.text', '1 ETH = 7,673.93 FOX')
  })
  //
  // it('supports send transaction setup', () => {
  //
  // })
  //
  // it('supports receive transaction setup', () => {
  //
  // })
})
