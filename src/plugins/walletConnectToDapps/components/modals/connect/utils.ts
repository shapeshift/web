export const isWalletConnectV2Uri = (uri: string) => uri.split('@')?.[1]?.[0] === '2'
