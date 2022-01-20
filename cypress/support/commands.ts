// @ts-check
///<reference path="../global.d.ts" />

// ***********************************************
// https://on.cypress.io/custom-commands
// ***********************************************

// @ts-ignore - FIXME
Cypress.Commands.add('getBySel', (selector, ...args) => {
  return cy.get(`[data-test=${selector}]`, ...args)
})

// @ts-ignore - FIXME
Cypress.Commands.add('getBySelLike', (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args)
})
