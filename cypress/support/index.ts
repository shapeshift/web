import './commands'
Cypress.on('window:before:load', win => {
  // @ts-ignore
  win.fetch = null
})
