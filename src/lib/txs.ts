import { CAIP2, caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

// TODO(0xdef1cafe): remove this when we have caips from unchained :)
export const caip2FromTx = ({ chain, network }: Tx): CAIP2 => caip2.toCAIP2({ chain, network })
export const caip19FromTx = (tx: Tx): CAIP19 => {
  const { chain, network, asset: tokenId } = tx
  const ethereumCAIP2 = caip2.toCAIP2({
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET
  })
  const assetCAIP2 = caip2FromTx(tx)
  const contractType =
    assetCAIP2 === ethereumCAIP2 && tokenId.startsWith('0x') ? ContractTypes.ERC20 : undefined

  const extra = contractType ? { contractType, tokenId: tokenId.toLowerCase() } : undefined
  const assetCAIP19 = caip19.toCAIP19({ chain, network, ...extra })
  return assetCAIP19
}
