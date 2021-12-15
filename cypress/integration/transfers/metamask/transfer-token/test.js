/*
    End 2 End testing
 */

describe('Pair a MetaMask wallet', () => {
  it('Should init app successfully', () => {
    let result = cy.visit('http://localhost:3000/')
    //init
    cy.get('.chakra-button').should('have.text', 'Connect Wallet')
    cy.get('.chakra-button').click()
  })

  it('Select native wallet', () => {
    cy.get('.chakra-stack > :nth-child(1)').should('have.text', 'ShapeShift')
    cy.get('.chakra-stack > :nth-child(1)').click()
  })

  it('load test seed', () => {
    cy.get('.chakra-stack > :nth-child(4)').should('have.text', 'Import a wallet')
    cy.get('.chakra-stack > :nth-child(4)').click()

    //seed
    let TEST_SEED = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'
    cy.get('#field-4').type(TEST_SEED)
    cy.get('form > .chakra-button').click()

    //name wallet TEST
    cy.get('#name').type("ABUSE_SEED")
    cy.get('#password').type("12345678")

    //click next
    cy.get('.css-bycebw').click()

    //TODO measure time till load
  })
})
