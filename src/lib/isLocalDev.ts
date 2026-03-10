/**
 * Checks if the app is running in a local development environment.
 * Handles both plain localhost (localhost:3000) and Portless subdomains (shapeshiftweb.localhost).
 */
export const isLocalDev = (): boolean => {
  const h = window.location.hostname
  return h === 'localhost' || h.endsWith('.localhost')
}
