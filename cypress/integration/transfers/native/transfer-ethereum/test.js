/*
    End 2 End testing
 */

let BLOCKCHAIN = 'ethereum'
let ASSET = 'ETH'


//TODO flag off env var
//if local
// let TARGET = 'http://localhost:3000/'
//if stage
// let TARGET = 'http://localhost:3000/'
//if prod
let TARGET = 'https://app.shapeshift.com/'

describe('Pair a MetaMask wallet', () => {
  it('Should init app successfully', () => {
    let result = cy.visit(TARGET)
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
    cy.get('#field-2').type(TEST_SEED)
    //dev
    // cy.get('#field-4').type(TEST_SEED)
    cy.get('form > .chakra-button').click()

    //name wallet TEST
    cy.get('#name').type("ABUSE_SEED")
    cy.get('#password').type("12345678")

    //click next
    cy.get('.css-bycebw').click()

    //TODO measure time till load
  })

  //read balance
  it('verify balance in asset dashboard', () => {
    cy.get('.css-141avy > :nth-child(2) > .css-o2rjbg > .chakra-stack').contains(ASSET)
  })

  //open asset tab
  it('open assets tab', () => {
    cy.get('[aria-label="Assets"]').click()

    //search ETH :rabble: why some much trash assets
    cy.get('.chakra-input').type(ASSET)

    //expect first box to be correct ETH
    cy.get('[style="position: absolute; left: 0px; top: 0px; height: 60px; width: 100%;"]').click()

  })

  //click send
  it('open assets tab', () => {

  })

})
