export const isWalletConnectV1Uri = (uri: string) => uri.split('@')?.[1]?.[0] === '1'
export const isWalletConnectV2Uri = (uri: string) => uri.split('@')?.[1]?.[0] === '2'

export const isValidWalletConnectUri = (uri: string) =>
  isWalletConnectV1Uri(uri) || isWalletConnectV2Uri(uri)
