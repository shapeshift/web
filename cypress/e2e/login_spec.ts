import { translations } from 'assets/translations'

import { autoRecord } from '../plugins/autorecord'

const baseUrl = Cypress.config().baseUrl
const seed = Cypress.env('testSeed')
const password = Cypress.env('testPassword')

describe('The Dashboard', () => {
  autoRecord()
  before(() => {
    cy.clearIndexedDB()
  })

  beforeEach(() => {
    // Intercept all account requests relating to our test wallet
    cy.mockAllRequests()
  })

  it('supports log in via an imported Native wallet', () => {
    cy.visit('')

    // Open WalletProvider.SelectModal
    cy.getBySel('connect-wallet-button').click()

    // Accept Pendo
    cy.getBySel('consent-optin-continue-button').click()

    cy.getBySel('connect-wallet-native-button').click()
    cy.getBySel('wallet-native-import-button').click()

    // Test 'empty` seed validation
    cy.getBySel('wallet-native-seed-submit-button').click()
    cy.getBySel('wallet-native-seed-validation-message').contains(
      translations.en.walletProvider.shapeShift.import.secretRecoveryPhraseRequired,
    )

    // Test 'too-short` seed validation
    cy.getBySel('wallet-native-seed-input').click().type('too-short')
    cy.getBySel('wallet-native-seed-submit-button').click()
    cy.getBySel('wallet-native-seed-validation-message').contains(
      translations.en.walletProvider.shapeShift.import.secretRecoveryPhraseTooShort,
    )
    cy.getBySel('wallet-native-seed-input').clear()

    // Test 'invalid bip39 mnemonic` seed validation
    cy.getBySel('wallet-native-seed-input').type(
      'this-is-long-enough-but-is-not-a-valid-seed-phrase',
    )
    cy.getBySel('wallet-native-seed-submit-button').click()
    cy.getBySel('wallet-native-seed-validation-message').contains(
      translations.en.walletProvider.shapeShift.import.secretRecoveryPhraseError,
    )

    // Load wallet from seed and password
    cy.getBySel('wallet-native-seed-input').clear()
    cy.getBySel('wallet-native-seed-input').type(seed)
    cy.getBySel('wallet-native-seed-submit-button').click()
    cy.getBySel('wallet-native-set-name-input').type('cypress-test')
    cy.getBySel('wallet-native-password-input').type(password)
    cy.getBySel('wallet-native-confirmPassword-input').type(password)
    cy.getBySel('wallet-native-password-submit-button').click()

    cy.url().should('equal', `${baseUrl}dashboard`)
  })

  it('supports login via locally stored Native wallet', () => {
    // Use this to clear the "localWallet" data and show the splash screen
    cy.clearLocalStorage()
    // This will use the wallet created in `supports log in via an imported Native wallet`
    cy.visit('')
    cy.getBySel('connect-wallet-button').click()
    cy.getBySel('consent-optin-continue-button').click()
    cy.getBySel('connect-wallet-native-button').click()
    cy.getBySel('wallet-native-load-button').click()
    cy.getBySel('native-saved-wallet').should('have.length', 1)
    cy.getBySel('native-saved-wallet-name').contains('cypress-test')
    cy.getBySel('native-saved-wallet-button').click()
    cy.getBySel('wallet-password-input').should('be.visible').type(password)
    cy.getBySel('wallet-password-submit-button').click()
    cy.url().should('equal', `${baseUrl}dashboard`)
  })

  it('cannot login natively when no local Native wallets', () => {
    cy.clearLocalStorage()
    cy.clearIndexedDB().then(() => {
      cy.visit('')
      cy.getBySel('connect-wallet-button').click()
      cy.getBySel('consent-optin-continue-button').click()
      cy.getBySel('connect-wallet-native-button').click()
      cy.getBySel('wallet-native-load-button').should('be.disabled')
    })
  })
})
