// @ts-check
///<reference path="../global.d.ts" />

import { makeBtcAccount } from '../../cypress/factories/bitcoin/account'
import { makeEthAccount } from '../../cypress/factories/ethereum/account'
import { wallet } from '../../cypress/fixtures/wallet'
import { getWalletDbInstance } from '../../cypress/helpers'
import { makeEthFoxRateResponse } from '../factories/0x/ethFoxRate'
import { makeEthUsdcRateResponse } from '../factories/0x/ethUsdcRate'
import { makeChainlinkDataResponse } from '../factories/coingecko/chainlinkData'
import { makeChartDataResponse } from '../factories/coingecko/chartData'

const baseUrl = Cypress.config().baseUrl
const password = Cypress.env('testPassword')
const publicKey = Cypress.env('testPublicKey')
const ethereumApi = Cypress.env('REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL')
const bitcoinApi = Cypress.env('REACT_APP_UNCHAINED_BITCOIN_HTTP_URL')
const _0xApi = Cypress.env('0xApi')
const coinGeckoApi = Cypress.env('coinGeckoApi')
const foxContract = Cypress.env('foxContract')

const ethAccount = makeEthAccount()
const btcAccount = makeBtcAccount()
const ethUsdcSwapRate = makeEthUsdcRateResponse()
const ethFoxSwapRate = makeEthFoxRateResponse()

const walletDb = getWalletDbInstance()

// @ts-ignore
Cypress.Commands.add('getBySel', (selector: string, ...args: any) => {
  return cy.get(`[data-test=${selector}]`, ...args)
})

// @ts-ignore
Cypress.Commands.add(
  'findBySel',
  {
    prevSubject: true
  },
  (subject, selector) => {
    // @ts-ignore
    return subject.find(`[data-test=${selector}]`)
  }
)

// @ts-ignore
Cypress.Commands.add('getBySelLike', (selector: string, ...args: any) => {
  return cy.get(`[data-test*=${selector}]`, ...args)
})

// @ts-ignore
Cypress.Commands.add(
  'addWallet',
  // @ts-ignore
  async (wallet: { key: string; value: Object<string, unknown> }) => {
    await walletDb.setItem(wallet.key, wallet.value)
  }
)

// @ts-ignore
Cypress.Commands.add('clearIndexedDB', async () => {
  await walletDb.clear()
})

// TODO - Replace with programmatic login
// @ts-ignore
Cypress.Commands.add('login', () => {
  // Cypress already automatically clears localStorage, cookies, sessions, etc. before each test
  // We do, however, need to clear indexedDB during login to clear any saved wallet data
  cy.clearIndexedDB().then(() => {
    cy.addWallet(wallet).then(() => {
      cy.visit('')
      cy.getBySel('connect-wallet-button').click()
      cy.getBySel('wallet-native-button').click()
      cy.getBySel('wallet-native-load-button').click()
      cy.getBySel('native-saved-wallet-button').click()
      cy.getBySel('wallet-password-input').type(password)
      cy.getBySel('wallet-password-submit-button').click()
      cy.url({ timeout: 8000 }).should('equal', `${baseUrl}dashboard`)
    })
  })
})

// @ts-ignore
Cypress.Commands.add('mockExternalRequests', () => {
  // CoinGecko
  cy.intercept('GET', `${coinGeckoApi}coins/ethereum/market_chart/*`, makeChartDataResponse).as(
    'getChartData'
  )

  cy.intercept(
    'GET',
    `${coinGeckoApi}coins/ethereum/contract/0x514910771af9ca656af840dff83e8264ecf986ca`,
    makeChainlinkDataResponse()
  ).as('getChainlinkData')

  // 0x
  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?buyToken=USDC&buyAmount=1000000&sellToken=ETH`,
    ethUsdcSwapRate
  ).as('getEthUsdcRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?sellToken=ETH&buyToken=${foxContract}*`,
    ethFoxSwapRate
  ).as('getEthFoxRate')
})

// @ts-ignore
Cypress.Commands.add('mockInternalRequests', () => {
  cy.intercept('GET', `${ethereumApi}/api/v1/account/${publicKey}`, ethAccount).as('getEthAccount')
  cy.intercept('GET', `${bitcoinApi}/api/v1/account/${publicKey}`, btcAccount).as('getBtcAccount')
  cy.intercept('GET', `${ethereumApi}/api/v1/gas/estimate*`, '21000').as('getGasEstimate')
  cy.intercept('GET', `${ethereumApi}/api/v1/gas/fees`, {
    gasPrice: '51962967843',
    maxFeePerGas: '104315056556',
    maxPriorityFeePerGas: '2500000000'
  }).as('getRecommendedGas')
})

// @ts-ignore
Cypress.Commands.add('mockAllRequests', () => {
  cy.mockExternalRequests()
  cy.mockInternalRequests()
})

Cypress.Commands.add('backdropDismiss', () => {
  cy.get('.chakra-modal__content-container').click('topRight')
})

// @ts-ignore
Cypress.Commands.add('navigateToDashboard', () => {
  cy.getBySel('full-width-header')
    .findBySel('navbar-dashboard-button')
    .click()
    .url()
    .should('equal', `${baseUrl}dashboard`)
})

// @ts-ignore
Cypress.Commands.add('navigateToAccounts', () => {
  cy.getBySel('full-width-header')
    .findBySel('navbar-accounts-button')
    .click()
    .url()
    .should('equal', `${baseUrl}accounts`)
})

// @ts-ignore
Cypress.Commands.add('navigateToDefi', () => {
  cy.getBySel('full-width-header')
    .findBySel('navbar-defi-button')
    .click()
    .url()
    .should('equal', `${baseUrl}defi`)
})

// @ts-ignore
Cypress.Commands.add('navigateToAssets', () => {
  cy.getBySel('full-width-header')
    .findBySel('navbar-assets-button')
    .click()
    .url()
    .should('equal', `${baseUrl}assets`)
})
