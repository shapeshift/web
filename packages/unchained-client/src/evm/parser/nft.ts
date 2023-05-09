import type { ChainId } from '@shapeshiftoss/caip'
import type { ethers } from 'ethers'

import type { BaseTxMetadata } from '../../types'
import type { Api } from '..'
import type { SubParser, Tx, TxSpecific } from './types'

interface Media {
  url: string
  type?: 'image' | 'video'
}

export interface TxMetadata extends BaseTxMetadata {
  parser: 'nft'
  mediaById: Record<string, Media>
}

interface ParserArgs {
  chainId: ChainId
  api: Api
  provider: ethers.providers.JsonRpcBatchProvider
}

const supportedTokenTypes = ['ERC721', 'ERC1155', 'BEP721', 'BEP1155']

export class Parser<T extends Tx> implements SubParser<T> {
  provider: ethers.providers.JsonRpcBatchProvider

  readonly chainId: ChainId
  readonly api: Api

  constructor(args: ParserArgs) {
    this.chainId = args.chainId
    this.api = args.api
    this.provider = args.provider
  }

  async parse(tx: T): Promise<TxSpecific | undefined> {
    if (!tx.tokenTransfers?.length) return
    if (!tx.tokenTransfers.some(transfer => supportedTokenTypes.includes(transfer.type))) return

    const data: TxMetadata = {
      parser: 'nft',
      mediaById: {},
    }

    for (const transfer of tx.tokenTransfers) {
      if (!supportedTokenTypes.includes(transfer.type)) return
      if (!transfer.id) return

      const type = (() => {
        switch (transfer.type) {
          case 'ERC721':
          case 'BEP721':
            return 'erc721'
          case 'ERC1155':
          case 'BEP1155':
            return 'erc1155'
          default:
            throw new Error(`unsupported token type: ${transfer.type}`)
        }
      })()

      try {
        const metadata = await this.api.getTokenMetadata({
          contract: transfer.contract,
          id: transfer.id,
          type,
        })

        data.mediaById[transfer.id] = metadata.media
      } catch (err) {}
    }

    return { data }
  }
}
