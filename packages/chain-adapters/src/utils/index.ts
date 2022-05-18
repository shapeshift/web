import { AssetNamespace } from '@shapeshiftoss/caip'
import { chainAdapters } from '@shapeshiftoss/types'
import { Status, TransferType } from '@shapeshiftoss/unchained-client'

export * from './bip44'
export * from './utxoUtils'

export const getAssetNamespace = (type: string): AssetNamespace => {
  if (type === 'ERC20') return 'erc20'
  if (type === 'ERC721') return 'erc721'
  throw new Error(`Unknown asset namespace. type: ${type}`)
}

export const getStatus = (status: Status): chainAdapters.TxStatus => {
  if (status === Status.Pending) return chainAdapters.TxStatus.Pending
  if (status === Status.Confirmed) return chainAdapters.TxStatus.Confirmed
  if (status === Status.Failed) return chainAdapters.TxStatus.Failed

  return chainAdapters.TxStatus.Unknown
}

export const getType = (type: TransferType): chainAdapters.TxType => {
  if (type === TransferType.Send) return chainAdapters.TxType.Send
  if (type === TransferType.Receive) return chainAdapters.TxType.Receive

  return chainAdapters.TxType.Unknown
}
