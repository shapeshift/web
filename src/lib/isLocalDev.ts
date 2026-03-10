/**
 * Checks if the app is running in a local development environment.
 * Handles both plain localhost and Portless subdomains (*.localhost).
 */
export const isLocalDev = (): boolean => {
  const h = window.location.hostname
  return h === 'localhost' || h.endsWith('.localhost')
}
