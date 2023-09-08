import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'

import type { Token, TxStatus } from '../../types'
import { TransferType } from '../../types'
import type { AggregateTransferArgs } from '../../utils'
import { aggregateTransfer, findAsyncSequential } from '../../utils'
import type { Api } from '..'
import type { ParsedTx, SubParser, Tx, TxSpecific } from './types'
import { getTxStatus } from './utils'

export * from './types'
export * from './utils'

export interface TransactionParserArgs {
  chainId: ChainId
  assetId: AssetId
  api: Api
  rpcUrl: string
}

export class BaseTransactionParser<T extends Tx> {
  chainId: ChainId
  assetId: AssetId

  protected readonly api: Api
  protected readonly provider: ethers.providers.JsonRpcBatchProvider

  private parsers: SubParser<T>[] = []

  constructor(args: TransactionParserArgs) {
    this.chainId = args.chainId
    this.assetId = args.assetId
    this.api = args.api
    this.provider = new ethers.providers.JsonRpcBatchProvider(args.rpcUrl)
  }

  /**
   * Register custom transaction sub parser to extract contract specific data
   *
   * _parsers should be registered from most generic first to most specific last_
   */
  registerParser(parser: SubParser<T>): void {
    this.parsers.unshift(parser)
  }

  protected registerParsers(parsers: SubParser<T>[]): void {
    parsers.forEach(parser => this.registerParser(parser))
  }

  async parse(tx: T, address: string): Promise<ParsedTx> {
    address = ethers.utils.getAddress(address)

    // We expect only one Parser to return a result. If multiple do, we take the first and early exit.
    const contractParserResult = await findAsyncSequential<SubParser<T>, TxSpecific>(
      this.parsers,
      async parser => await parser.parse(tx, address),
    )

    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: this.getStatus(tx),
      trade: contractParserResult?.trade,
      transfers: contractParserResult?.transfers ?? [],
      txid: tx.txid,
      data: contractParserResult?.data,
    }

    return this.getParsedTxWithTransfers(tx, parsedTx, address)
  }

  private getStatus(tx: T): TxStatus {
    return getTxStatus(tx)
  }

  private getParsedTxWithTransfers(tx: T, parsedTx: ParsedTx, address: string) {
    if (address === tx.from) {
      // send amount
      const sendValue = new BigNumber(tx.value)
      if (sendValue.gt(0)) {
        parsedTx.transfers = aggregateTransfer({
          assetId: this.assetId,
          from: tx.from,
          to: tx.to,
          transfers: parsedTx.transfers,
          type: TransferType.Send,
          value: sendValue.toString(10),
        })
      }

      // network fee
      const fees = new BigNumber(tx.fee)
      if (fees.gt(0)) {
        parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) }
      }
    }

    if (address === tx.to) {
      // receive amount
      const receiveValue = new BigNumber(tx.value)
      if (receiveValue.gt(0)) {
        parsedTx.transfers = aggregateTransfer({
          assetId: this.assetId,
          from: tx.from,
          to: tx.to,
          transfers: parsedTx.transfers,
          type: TransferType.Receive,
          value: receiveValue.toString(10),
        })
      }
    }

    tx.tokenTransfers?.forEach(transfer => {
      // FTX Token (FTT) name and symbol was set backwards on the ERC20 contract (Ethereum Mainnet)
      if (
        this.chainId === ethChainId &&
        transfer.contract === '0x50D1c9771902476076eCFc8B2A83Ad6b9355a4c9'
      ) {
        transfer.name = transfer.symbol
        transfer.symbol = transfer.name
      }

      const token: Token = {
        contract: transfer.contract,
        decimals: transfer.decimals,
        name: transfer.name,
        symbol: transfer.symbol,
      }

      const assetId = (() => {
        // alias ether token on optimism to native asset as they are the same
        if (transfer.contract === '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000') {
          return toAssetId({
            chainId: this.chainId,
            assetNamespace: 'slip44',
            assetReference: ASSET_REFERENCE.Optimism,
          })
        }

        // alias matic token on matic to native asset as they are the same
        if (transfer.contract === '0x0000000000000000000000000000000000001010') {
          return toAssetId({
            chainId: this.chainId,
            assetNamespace: 'slip44',
            assetReference: ASSET_REFERENCE.Polygon,
          })
        }

        const assetNamespace = (() => {
          switch (transfer.type) {
            case 'ERC20':
              return ASSET_NAMESPACE.erc20
            case 'ERC721':
              return ASSET_NAMESPACE.erc721
            case 'ERC1155':
              return ASSET_NAMESPACE.erc1155
            case 'BEP20':
              return ASSET_NAMESPACE.bep20
            case 'BEP721':
              return ASSET_NAMESPACE.bep721
            case 'BEP1155':
              return ASSET_NAMESPACE.bep1155
            default:
              return
          }
        })()

        if (!assetNamespace) return

        return toAssetId({
          chainId: this.chainId,
          assetNamespace,
          assetReference: transfer.id ? `${transfer.contract}/${transfer.id}` : transfer.contract,
        })
      })()

      if (!assetId) return

      const makeTokenTransferArgs = (type: TransferType): AggregateTransferArgs => ({
        assetId,
        from: transfer.from,
        id: transfer.id,
        to: transfer.to,
        token,
        transfers: parsedTx.transfers,
        type,
        value: transfer.value,
      })

      // token send amount
      if (address === transfer.from) {
        parsedTx.transfers = aggregateTransfer(makeTokenTransferArgs(TransferType.Send))
      }

      // token receive amount
      if (address === transfer.to) {
        parsedTx.transfers = aggregateTransfer(makeTokenTransferArgs(TransferType.Receive))
      }
    })

    tx.internalTxs?.forEach(internalTx => {
      const makeInternalTransferArgs = (type: TransferType): AggregateTransferArgs => ({
        assetId: this.assetId,
        from: internalTx.from,
        to: internalTx.to,
        transfers: parsedTx.transfers,
        type,
        value: internalTx.value,
      })

      // internal eth send
      if (address === internalTx.from) {
        parsedTx.transfers = aggregateTransfer(makeInternalTransferArgs(TransferType.Send))
      }

      // internal eth receive
      if (address === internalTx.to) {
        parsedTx.transfers = aggregateTransfer(makeInternalTransferArgs(TransferType.Receive))
      }
    })

    return parsedTx
  }
}
