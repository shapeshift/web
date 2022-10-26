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
})
