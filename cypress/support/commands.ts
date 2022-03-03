// @ts-check
///<reference path='../global.d.ts' />

import { addStreamCommands } from '@lensesio/cypress-websocket-testing'
import { WebSocketSubjectConfig } from 'rxjs/webSocket'

import { makeEthFoxRateResponse } from '../factories/0x/ethFoxRate'
import { makeEthUsdcRateResponse } from '../factories/0x/ethUsdcRate'
import { makeFoxEthSwapRateResponse } from '../factories/0x/foxEthSwapRate'
import { makeUsdcFoxSwapRateResponse } from '../factories/0x/usdcFoxRate'
import { makeBtcAccount } from '../factories/bitcoin/account'
import { makeChainlinkDataResponse } from '../factories/coingecko/chainlinkData'
import { makeChartDataResponse } from '../factories/coingecko/chartData'
import { makeEthAccount } from '../factories/ethereum/account'
import { makeEthTxHistory } from '../factories/ethereum/transactions'
import { getWalletDbInstance } from '../helpers'

const baseUrl = Cypress.config().baseUrl
const password = Cypress.env('testPassword')
const seed = Cypress.env('testSeed')
const publicKey = Cypress.env('testPublicKey')
const ethereumApi = Cypress.env('REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL')
const bitcoinApi = Cypress.env('REACT_APP_UNCHAINED_BITCOIN_HTTP_URL')
const wsUrl = Cypress.env('wsUrl')
const _0xApi = Cypress.env('0xApi')
const coinGeckoApi = Cypress.env('coinGeckoApi')
const foxContract = Cypress.env('foxContract')

const walletDb = getWalletDbInstance()
const ethTransactions = makeEthTxHistory()

type MessageType = 'connect' | 'subscribe' | 'end'
interface IMessage {
  method: MessageType
  data: any
}

const wsConfig: WebSocketSubjectConfig<IMessage> = {
  url: wsUrl
}

addStreamCommands()

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

Cypress.Commands.add(
  'addWallet',
  // @ts-ignore
  () => {
    // For programmatic login, we need to pass some parameters to the `connect-wallet` page.
    localStorage.setItem('cypressWalletSeed', seed)
    localStorage.setItem('cypressWalletPassword', password)
  }
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
    cy.visit('')
    cy.url().should('equal', `${baseUrl}dashboard`)
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
    makeEthUsdcRateResponse()
  ).as('getEthUsdcRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?sellToken=ETH&buyToken=${foxContract}*`,
    makeEthFoxRateResponse()
  ).as('getEthFoxRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?sellToken=${foxContract}&buyToken=ETH*`,
    makeFoxEthSwapRateResponse()
  ).as('getEthFoxRate')

  cy.intercept(
    'GET',
    `${_0xApi}swap/v1/price?buyToken=USDC&buyToken=${foxContract}*`,
    makeUsdcFoxSwapRateResponse()
  ).as('getEthFoxRate')
})

// @ts-ignore
Cypress.Commands.add('mockInternalRequests', () => {
  cy.intercept('GET', `${ethereumApi}/api/v1/account/${publicKey}`, makeEthAccount()).as(
    'getEthAccount'
  )
  cy.intercept('GET', `${bitcoinApi}/api/v1/account/${publicKey}`, makeBtcAccount()).as(
    'getBtcAccount'
  )
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

// @ts-ignore
Cypress.Commands.add(
  'mockWebSocketRequest',
  (method: string, topic: string, data: Object, response: any) => {
    const options = {
      takeWhileFn: (message: IMessage) => message?.method !== 'end',
      startUpMessage: {
        method: method,
        topic: topic,
        data: data
      }
    }

    cy.wrap(null, { timeout: 10000 }).then(() =>
      cy.streamRequest(wsConfig, options).then(results => {
        const connectionResult = results?.[0]

        // eslint-disable-next-line
        expect(connectionResult).to.not.be.undefined
        expect(connectionResult).to.have.property('method', 'connect')
        expect(connectionResult).to.have.property('data', 'connect success')

        expect(results?.length).to.eq(response.length + 2) // 'connection success' + response + 'end'

        const result = results?.[1]

        // eslint-disable-next-line
      expect(result).to.not.be.undefined
        expect(result).to.have.property('method', method)
        expect(result).to.have.property('topic', topic)
        expect(result).to.have.property('data')
        expect(result?.data).to.deep.eq(response?.[0])
      })
    )
  }
)

// @ts-ignore
Cypress.Commands.add('mockAllWebSocketRequests', () => {
  cy.mockWebSocketRequest('subscribe', 'txs', {}, ethTransactions)
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
