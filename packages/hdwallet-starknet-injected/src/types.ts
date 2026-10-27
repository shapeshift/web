// Subset of the get-starknet wallet API, see https://github.com/starknet-io/types-js/blob/main/src/wallet-api

export type StarknetInjectedProviderId = 'argentX' | 'braavos' | 'bramble'

export type StarknetInjectedErrorCode =
  | 'PROVIDER_NOT_FOUND'
  | 'NO_ACCOUNT'
  | 'WRONG_NETWORK'
  | 'ACCOUNT_CHANGED'

export type StarknetWalletEvent = 'accountsChanged' | 'networkChanged'

export type StarknetWalletInvokeCall = {
  contract_address: string
  entry_point: string
  calldata?: string[]
}

export type StarknetWalletRequest =
  | { type: 'wallet_requestAccounts'; params?: { silent_mode?: boolean } }
  | { type: 'wallet_requestChainId' }
  | { type: 'wallet_switchStarknetChain'; params: { chainId: string } }
  | { type: 'wallet_addInvokeTransaction'; params: { calls: StarknetWalletInvokeCall[] } }

export type StarknetWalletRequestResult = {
  wallet_requestAccounts: string[]
  wallet_requestChainId: string
  wallet_switchStarknetChain: boolean
  wallet_addInvokeTransaction: { transaction_hash: string }
}

export type StarknetWindowObject = {
  id: string
  name: string
  version: string
  icon: string | { dark: string; light: string }
  request<T extends StarknetWalletRequest>(call: T): Promise<StarknetWalletRequestResult[T['type']]>
  on(event: StarknetWalletEvent, handler: (...args: unknown[]) => void): void
  off(event: StarknetWalletEvent, handler: (...args: unknown[]) => void): void
}
