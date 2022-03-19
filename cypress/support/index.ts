import './commands'

// enable to use `XHR` instead of `fetch` in the test
// https://github.com/cypress-io/cypress/issues/95#issuecomment-281273126
Cypress.on('window:before:load', win => {
  // @ts-ignore
  win.fetch = null
})
