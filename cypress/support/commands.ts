// @ts-check
///<reference path="../global.d.ts" />

import { getWalletDbInstance } from '../helpers'

const walletDb = getWalletDbInstance()

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

// @ts-ignore
Cypress.Commands.add('clearIndexedDB', async () => {
  await walletDb.clear()
})
