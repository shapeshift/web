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
    cy.get('[data-test="token-row-sell-token-button"] > .chakra-text').should('have.text', 'ETH')
    cy.get('[data-test="token-row-buy-token-button"]').should('have.text', 'FOX')
    cy.get('[data-test="swap-assets-button"] > svg > path').click()
    cy.get('[data-test="token-row-sell-token-button"] > .chakra-text').should('have.text', 'FOX')
    cy.get('[data-test="token-row-buy-token-button"] > .chakra-text').should('have.text', 'ETH')
    cy.getBySel('trade-form-token-input-row-sell').find('input').type('300')
    cy.getBySel('trade-form-preview-button').should('be.disabled')
    cy.getBySel('trade-form-token-input-row-sell').find('input').type('0')
  })
})
