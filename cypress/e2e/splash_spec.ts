// import { KeyManager } from 'context/WalletProvider/config'
//
// const baseUrl = Cypress.config().baseUrl
//
// describe('ShapeShift home page', () => {
//   it('loads correctly', () => {
//     cy.visit('')
//     cy.url().should('equal', `${baseUrl}connect-wallet?returnUrl=/dashboard`)
//
//     // Open WalletProvider.SelectModal
//     cy.getBySel('connect-wallet-button').click()
//
//     // All expected wallet types rendered
//     Object.values(KeyManager).forEach(value => {
//       cy.getBySel(`wallet-${value}-button`)
//     })
//   })
// })

export {}
