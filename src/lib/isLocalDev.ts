/**
 * Checks if the app is running in a local development environment.
 * Handles both plain localhost and Portless subdomains (*.localhost).
 */
export const isLocalDev = (): boolean => {
  const hostname = window.location.hostname
  return hostname === 'localhost' || hostname.endsWith('.localhost')
}
