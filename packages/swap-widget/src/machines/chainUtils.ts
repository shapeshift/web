type ChainType = 'evm' | 'utxo' | 'solana' | 'cosmos' | 'other'

const CHAIN_NAMESPACE_MAP: Record<string, ChainType> = {
  eip155: 'evm',
  bip122: 'utxo',
  cosmos: 'cosmos',
  solana: 'solana',
}

export const getChainTypeFromChainId = (chainId: string): ChainType => {
  const namespace = chainId.split(':')[0]
  return CHAIN_NAMESPACE_MAP[namespace] ?? 'other'
}
