/* eslint-disable no-undef */
/*
    End 2 End testing
 */

const ASSET = 'BTC'
const TITLE = ' Test ' + ASSET + ' transfer'
const NO_BROADCAST = true

let TEST_SEED = Cypress.env('TEST_SEED')
let TEST_SEED_LABEL = Cypress.env('TEST_SEED_LABEL')
if (!TEST_SEED) throw Error('TEST ENV INVALID! required: TEST_SEED')
if (!TEST_SEED_LABEL) throw Error('TEST ENV INVALID! required: TEST_SEED_LABEL')

import {sleep} from 'wait-promise';


describe(TITLE, () => {
  it('Should init app successfully', () => {
    cy.visit('http://localhost:3000/')
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
    cy.get('#field-4').type(TEST_SEED)
    cy.get('form > .chakra-button').click()

    //name wallet TEST
    cy.get('#name').type(TEST_SEED_LABEL)
    cy.get('#password').type('12345678')

    //click next
    cy.get('.css-bycebw').click()

    //TODO measure time till load
  })

  //open bitcoin asset
  it('open bitcoin asset', () => {
    cy.get('.css-1x419jz > .chakra-stack > [aria-label="Assets"]').click()
    cy.get('[style="position: absolute; left: 0px; top: 0px; height: 60px; width: 100%;"]').click()
  })

  //start transfer
  it('open bitcoin asset', async () => {
    //wait
    cy.get('.chakra-heading').should('have.text', 'Bitcoin')
    // await sleep(3000)
    cy.get('input').trigger('wheel')
    cy.get('.chakra-button__group > :nth-child(1) > .chakra-button').click()
  })
  //
  // //insert address
  // it('insert address', () => {})

  if (!NO_BROADCAST) {
    //TODO broadcast
    //verify url given
    //confirm on block explorer
  }
})
