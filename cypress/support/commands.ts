// @ts-check
///<reference path="../global.d.ts" />

import { makeEthFoxRateResponse } from '../factories/0x/ethFoxRate'
import { makeEthUsdcRateResponse } from '../factories/0x/ethUsdcRate'
import { makeFoxEthSwapRateResponse } from '../factories/0x/foxEthSwapRate'
import { makeUsdcFoxSwapRateResponse } from '../factories/0x/usdcFoxRate'
import { makeBtcAccount } from '../factories/bitcoin/account'
import { makeChainlinkDataResponse } from '../factories/coingecko/chainlinkData'
import { makeChartDataResponse } from '../factories/coingecko/chartData'
import { makeEthAccount } from '../factories/ethereum/account'
import { getWalletDbInstance } from '../helpers'

const baseUrl = Cypress.config().baseUrl
const password = Cypress.env('testPassword')
const seed = Cypress.env('testSeed')
const publicKey = Cypress.env('testPublicKey')
const ethereumApi = Cypress.env('REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL')
const bitcoinApi = Cypress.env('REACT_APP_UNCHAINED_BITCOIN_HTTP_URL')
const _0xApi = Cypress.env('0xApi')
const coinGeckoApi = Cypress.env('coinGeckoApi')
const foxContract = Cypress.env('foxContract')

const walletDb = getWalletDbInstance()

// @ts-ignore
class FakeDate extends Date {
  constructor(date: Date) {
    super(date)
    if (date) {
      return new Date(date)
    }
    // The date you want
    return new Date(Date.UTC(2022, 4, 1))
  }
}

// @ts-ignore
Cypress.Commands.add('getBySel', (selector: string, ...args: any) => {
  return cy.get(`[data-test=${selector}]`, ...args)
})

// @ts-ignore
Cypress.Commands.add(
  'findBySel',
  {
    prevSubject: true,
  },
  (subject, selector) => {
    // @ts-ignore
    return subject.find(`[data-test=${selector}]`)
  },
)

// @ts-ignore
Cypress.Commands.add('getBySelLike', (selector: string, ...args: any) => {
  return cy.get(`[data-test*=${selector}]`, ...args)
})

Cypress.Commands.add(
  'addWallet',
  // @ts-ignore
  () => {
    // For programmatic login, we need to pass some parameters to the `connect-wallet` page.
    localStorage.setItem('cypressWalletSeed', seed)
    localStorage.setItem('cypressWalletPassword', password)
  },
)

// @ts-ignore
Cypress.Commands.add('clearIndexedDB', async () => {
  await walletDb.clear()
})

// @ts-ignore
Cypress.Commands.add('login', () => {
  // Cypress already automatically clears localStorage, cookies, sessions, etc. before each test
  // We do, however, need to clear indexedDB during login to clear any saved wallet data
  cy.clearIndexedDB()
  cy.addWallet().then(() => {
    cy.visit('', {
      onLoad(win) {
        // in order to record and stub requests with timestamps in query we need to use fixed date
        // `cy.clock` does this, except when you call `cy.visit` from `before`
        // so you need to overwrite it manually
        // @ts-ignore - this is a gross hack to override the Date object constructor. Don't do this at home.
        win.Date = FakeDate
      },
    })
    cy.url().should('equal', `${baseUrl}dashboard`)
  })
})

// @ts-ignore
Cypress.Commands.add('mockExternalRequests', () => {
  // CoinGecko
  cy.intercept('GET', `${coinGeckoApi}coins/ethereum/market_chart/*`, makeChartDataResponse).as(
    'getChartData',
  )

  cy.intercept(
    'GET',
    `${coinGeckoApi}coins/ethereum/contract/0x514910771af9ca656af840dff83e8264ecf986ca`,
    makeChainlinkDataResponse(),
  ).as('getChainlinkData')

  // 0x
  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?buyToken=USDC&buyAmount=1000000&sellToken=ETH`,
    makeEthUsdcRateResponse(),
  ).as('getEthUsdcRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?sellToken=ETH&buyToken=${foxContract}*`,
    makeEthFoxRateResponse(),
  ).as('getEthFoxRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?sellToken=${foxContract}&buyToken=ETH*`,
    makeFoxEthSwapRateResponse(),
  ).as('getEthFoxRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?buyToken=USDC&buyToken=${foxContract}*`,
    makeUsdcFoxSwapRateResponse(),
  ).as('getEthFoxRate')
})

// @ts-ignore
Cypress.Commands.add('mockInternalRequests', () => {
  cy.intercept(
    'GET',
    `${ethereumApi}/api/v1/account/${publicKey.toLowerCase()}`,
    makeEthAccount(),
  ).as('getEthAccount')
  cy.intercept('GET', `${bitcoinApi}/api/v1/account/${publicKey}`, makeBtcAccount()).as(
    'getBtcAccount',
  )
  cy.intercept('GET', `${ethereumApi}/api/v1/gas/estimate*`, '21000').as('getGasEstimate')
  cy.intercept('GET', `${ethereumApi}/api/v1/gas/fees`, {
    gasPrice: '51962967843',
    maxFeePerGas: '104315056556',
    maxPriorityFeePerGas: '2500000000',
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
Cypress.Commands.add('waitForAllGetRequests', () => {
  cy.intercept({ method: 'GET' }).as('getRequests')
  cy.wait(['@getRequests'])
})

// @ts-ignore
Cypress.Commands.add('navigateToDashboard', () => {
  cy.getBySel('full-width-header').findBySel('navigation-dashboard-button').click()

  cy.url().should('equal', `${baseUrl}dashboard`)
})

// @ts-ignore
Cypress.Commands.add('navigateToAccounts', () => {
  cy.getBySel('full-width-header').findBySel('navigation-accounts-button').click()

  cy.url().should('equal', `${baseUrl}accounts`)
})

// @ts-ignore
Cypress.Commands.add('navigateToDefi', () => {
  cy.getBySel('full-width-header').findBySel('navigation-defi-button').click()

  cy.url().should('equal', `${baseUrl}defi`)
})

// @ts-ignore
Cypress.Commands.add('navigateToAssets', () => {
  cy.getBySel('full-width-header').findBySel('navigation-assets-button').click()

  cy.url().should('equal', `${baseUrl}assets`)
})
