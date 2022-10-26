/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    getBySel(dataTestAttribute: string, args?: any): Chainable<Element>
    findBySel(dataTestAttribute: string, args?: any): Chainable<Element>
    getBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>
    clearIndexedDB(): Chainable<Element>
  }
}
