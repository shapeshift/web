/* eslint-disable no-undef */
/*
    End 2 End testing
 */

describe('Pair a MetaMask wallet', () => {
  it('Should init app successfully', () => {
    cy.visit('http://localhost:3000/')
    //init
    cy.get('.chakra-button').should('have.text', 'Connect Wallet')
    cy.get('.chakra-button').click()
  })

  it('Select metamask wallet', () => {
    cy.get('.chakra-stack > :nth-child(3)').click()
    cy.get('.chakra-stack > :nth-child(3)').click()
    cy.get('.chakra-stack > :nth-child(3)').click()
  })

})
