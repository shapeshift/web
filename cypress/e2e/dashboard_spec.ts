import { autoRecord } from '../plugins/autorecord'

describe('The Dashboard', () => {
  autoRecord()

  before(() => {
    cy.visit('')
  })

  it('Can access demo wallet', function () {
    cy.getBySel('connect-wallet-button').should('be.visible').should('be.enabled')
    cy.getBySel('connect-demo-wallet-button').click()
  })

  it('Trade widget works as expected', function () {
    cy.getBySel('token-row-sell-token-button').should('have.text', 'ETH')
    cy.getBySel('token-row-buy-token-button').should('have.text', 'FOX')
    cy.getBySel('swap-assets-button').click()
    cy.getBySel('token-row-sell-token-button').should('have.text', 'FOX')
    cy.getBySel('token-row-buy-token-button').should('have.text', 'ETH')
    cy.getBySel('trade-form-token-input-row-sell').find('input').type('300')
    cy.getBySel('trade-form-preview-button').should('be.disabled')
    cy.getBySel('trade-form-token-input-row-sell').find('input').type('0')
  })
})
