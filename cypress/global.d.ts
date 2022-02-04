/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    getBySel(dataTestAttribute: string, args?: any): Chainable<Element>
    findBySel(dataTestAttribute: string, args?: any): Chainable<Element>
    getBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>
    addWallet(wallet: { key: string; value: Object<string, unknown> }): Chainable<Element>
    clearIndexedDB(): Chainable<Element>
    login(): Chainable<Element>
    mockExternalRequests(): Chainable<Element>
    mockInternalRequests(): Chainable<Element>
    mockAllRequests(): Chainable<Element>
    navigateToDashboard(): Chainable<Element>
    navigateToAccounts(): Chainable<Element>
    navigateToAssets(): Chainable<Element>
    navigateToDefi(): Chainable<Element>
    backdropDismiss(): Chainable<Element>
  }
}
