export type StarknetInjectedProviderId = 'argentX' | 'braavos' | 'bramble'

export type StarknetInjectedErrorCode =
  | 'PROVIDER_NOT_FOUND'
  | 'NO_ACCOUNT'
  | 'WRONG_NETWORK'
  | 'ACCOUNT_CHANGED'

// connect: the user clicked connect, restore: page load, refresh: the extension changed account
export type StarknetInjectedPairMode = 'connect' | 'restore' | 'refresh'
