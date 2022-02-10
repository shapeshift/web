const baseUrl = Cypress.config().baseUrl
const linkContract = Cypress.env('linkContract')

beforeEach(() => {
  // Intercept all account requests relating to our test wallet
  cy.mockAllRequests()
})

describe('The Dashboard', () => {
  before(() => {
    // In addition to mocking requests in beforeEach, this also needs to be set up in before to support login
    cy.mockAllRequests()
    cy.login()
  })

  it('nav bar works', () => {
    cy.navigateToAccounts()
    cy.navigateToAssets()
    cy.navigateToDefi()
    cy.navigateToDashboard()
  })

  it('displays the expected account rows', () => {
    cy.getBySel('account-row').should('have.length', 7)

    // Check LINK - one asset is enough. Test all and our tests become brittle.
    // TODO - Mock API response and test account row name
    cy.getBySel('account-row-asset-crypto-LINK').should('have.text', '1,916.203151 LINK')
    // TODO - Mock API response and test account row price
    // TODO - Mock API response and test account row value
    // TODO - Mock API response and test account row allocation
  })

  it('supports trades', () => {
    cy.getBySel('token-row-sell').find('input').type('89')
    // Increase the timeout to reduce the risk of flaking during quote request
    cy.getBySel('trade-preview-button')
      .should('be.disabled')
      .should('have.text', 'Insufficient Funds')
    cy.getBySel('trade-rate-quote').should('have.text', '1 ETH = 7,673.93 FOX')
    cy.getBySel('swap-assets-button').click()
    cy.getBySel('trade-rate-quote').should('have.text', '1 FOX = 0.00012 ETH')
    cy.getBySel('trade-preview-button').should('be.disabled')
    cy.getBySel('token-row-sell-max-button').click()
    // This can't be clicked until max sell is calculated, and it can take some time to compute on slower hardware.
    cy.getBySel('trade-preview-button').should('be.not.disabled').click()
    // TODO - We are now at the approval screen - test the rest of the flow
  })

  it('supports send transaction setup', () => {
    cy.navigateToDashboard()
    cy.getBySel('account-row-asset-crypto-LINK').click()
    cy.url().should('equal', `${baseUrl}assets/ethereum/${linkContract}`)
    cy.getBySel('asset-action-send').click()
    cy.getBySel('send-address-input').type('0xabadbabe')
    cy.getBySel('send-address-next-button')
      .should('be.disabled')
      .should('have.text', 'Invalid Address')
    cy.getBySel('send-address-input').clear()
    cy.getBySel('send-address-input').type('0xAceBabe64807cb045505b268ef253D8fC2FeF5Bc')
    cy.getBySel('send-address-next-button')
      .should('not.be.disabled')
      .should('have.text', 'Next')
      .click()
    cy.getBySel('account-card-asset-name-label').should('have.text', 'Chainlink')
    cy.getBySel('account-card-fiat-label').should('exist')
    cy.getBySel('send-modal-next-button').should('be.disabled')
    cy.getBySel('send-modal-fiat-input').type('10')
    cy.getBySel('send-modal-next-button').should('have.text', 'Not enough ETH to cover gas')
    // TODO - Add more test data and finish this flow
    cy.backdropDismiss()
  })

  it('supports receive transaction setup', () => {
    cy.navigateToDashboard()
    cy.getBySel('account-row-asset-crypto-LINK').click()
    cy.url().should('equal', `${baseUrl}assets/ethereum/${linkContract}`)
    cy.getBySel('asset-action-receive').click()
    cy.getBySel('receive-qr-code').should('exist')
    cy.getBySel('receive-address-label').should('have.text', '0xfDCa...fCde')
    cy.backdropDismiss()
  })
})
