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
    // A proxy to understand if the Dashboard has initialised
    cy.getBySel('account-row', { timeout: 60000 }).should('have.length.gt', 5)

    cy.navigateToAccounts()
    cy.navigateToAssets()
    cy.navigateToDefi()
    cy.navigateToDashboard()
  })

  it('displays the expected account rows', () => {
    cy.waitForAllGetRequests()
    cy.getBySel('account-row').should('have.length.gt', 5)

    // Check LINK - one asset is enough. Test all and our tests become brittle.
    // TODO - Mock API response and test account row name
    cy.getBySel('account-row-asset-crypto-LINK').contains('1,916.203151 LINK')
    // TODO - Mock API response and test account row price
    // TODO - Mock API response and test account row value
    // TODO - Mock API response and test account row allocation
  })

  it('supports trades', () => {
    cy.getBySel('account-row-asset-name-ETH').click()
    cy.getBySel('token-row-sell').find('input').type('89')
    cy.getBySel('trade-preview-button').should('be.disabled')
    // cy.getBySel('trade-rate-quote').contains('1 ETH = 7,673.93 FOX') // TODO - mock response and test here
    cy.getBySel('swap-assets-button').click()
    // cy.getBySel('trade-rate-quote').contains('1 FOX = 0.00011 ETH') // TODO - mock response and test here
    cy.getBySel('trade-preview-button').should('be.disabled')

    // Clicking 'swap-assets-button' will cause XHR requests, lets wait for
    // those requests to complete since the 'trade-preview-button' will have
    // the text "Loading..." (displays a spinner)
    cy.waitForAllGetRequests()

    cy.getBySel('token-row-sell-max-button').click()
    cy.waitForAllGetRequests()
    // TODO@0xApotheosis - this timeout won't be necessary once external request bounty complete
    cy.get('[data-test=trade-preview-button]').contains('Insufficient Funds', { timeout: 60000 })
    // TODO - We are now at the approval screen - test the rest of the flow
  })

  // Flakey - fix and unskip
  it.skip('supports send transaction setup', () => {
    cy.navigateToDashboard()
    cy.getBySel('account-row-asset-crypto-LINK').click()
    cy.url().should('equal', `${baseUrl}assets/${linkContract}`)
    cy.getBySel('asset-action-send').click()
    cy.getBySel('send-address-input').type('0xabadbabe')
    cy.getBySel('send-address-next-button').should('be.disabled').contains('Invalid Address')
    cy.getBySel('send-address-input').clear()
    cy.getBySel('send-address-input').type('0xAceBabe64807cb045505b268ef253D8fC2FeF5Bc').click()
    cy.getBySel('send-address-next-button').should('not.be.disabled').contains('Next').click()
    cy.getBySel('account-card-asset-name-label').contains('Chainlink')
    cy.getBySel('account-card-crypto-label').should('exist')
    cy.getBySel('send-modal-next-button').should('be.disabled')
    cy.getBySel('send-modal-crypto-input').type('10')
    cy.getBySel('send-modal-next-button').contains('Not enough ETH to cover gas')
    // TODO - Add more test data and finish this flow
    cy.backdropDismiss()
  })

  // Flakey - fix and unskip
  it.skip('supports receive transaction setup', () => {
    cy.navigateToDashboard()
    cy.getBySel('account-row-asset-crypto-LINK').click()
    cy.url().should('equal', `${baseUrl}assets/${linkContract}`)
    cy.getBySel('asset-action-receive').click()
    cy.getBySel('receive-qr-code').should('exist')
    cy.getBySel('receive-address-label').contains('0xfDCa...fCde')
    cy.backdropDismiss()
  })
})
