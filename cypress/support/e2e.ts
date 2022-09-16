import './commands'

Cypress.on('uncaught:exception', err => {
  // Returning false here prevents Cypress from failing the test

  // We are getting rugged by responses from Yearn, which is breaking Cypress. Ignore these exceptions.
  if (err.message.includes('hex data is odd-length')) return false
  // Ignore exceptions from failed network requests
  if (err.message.includes('Failed to fetch')) return false
  // Ignore this exception thrown from Ethers.js
  if (err.message.includes('call revert exception')) return false
  // Ignore this exception
  if (err.message.includes('Error: underlying network changed')) return false
})
