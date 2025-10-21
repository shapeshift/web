/**
 * WalletConnect Deep Link Handler
 *
 * This is a minimal component that renders while the WalletConnect deep link
 * is being processed by the useWalletConnectDeepLink hook in WalletConnectV2Provider.
 *
 * The hook will:
 * 1. Extract the WalletConnect URI from the query parameters
 * 2. Initiate the pairing process
 * 3. Redirect to /trade
 *
 * This component should not render for long - it's just a placeholder during
 * the brief moment of processing.
 */

export const WalletConnectDeepLink = () => {
  // The actual deep link handling is done by the useWalletConnectDeepLink hook
  // in WalletConnectV2Provider. This component just needs to exist so the route
  // is valid and doesn't show a 404.
  return null
}
