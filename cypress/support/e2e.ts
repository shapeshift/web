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
  // TODO: Work out why Cypress requests are failing
  // Ignore this exception, it occurs because Cypress doesn't get a response form lcd/thorchain/pools
  if (err.message.includes('[thorchainInitialize]: initialize failed to set supportedAssetIds'))
    return false
  // This can happen when an upstream node is down. Don't fail our CI because of it.
  if (err.message.includes('timeout while trying to connect')) return false
  // non-deterministic error coming from hdwallet re the demo wallet
  if (
    err.message.includes('Isolation.Engines.Dummy - Invalid operation: private key not available')
  )
    return false
})
