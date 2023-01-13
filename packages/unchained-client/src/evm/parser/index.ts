import { ASSET_REFERENCE, AssetId, ChainId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'

import { Token, TransferType, TxStatus } from '../../types'
import { aggregateTransfer, findAsyncSequential } from '../../utils'
import * as erc20 from './erc20'
import { ParsedTx, SubParser, Tx, TxSpecific } from './types'

export * from './types'
export * from './utils'

export interface TransactionParserArgs {
  chainId: ChainId
  rpcUrl: string
}

export class BaseTransactionParser<T extends Tx> {
  chainId: ChainId
  assetId: AssetId

  protected readonly provider: ethers.providers.JsonRpcProvider

  private parsers: SubParser<T>[] = []

  constructor(args: TransactionParserArgs) {
    this.chainId = args.chainId
    this.provider = new ethers.providers.JsonRpcProvider(args.rpcUrl)

    this.registerParser(new erc20.Parser({ chainId: this.chainId, provider: this.provider }))
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
    parsers.forEach((parser) => this.registerParser(parser))
  }

  async parse(tx: T, address: string): Promise<ParsedTx> {
    address = ethers.utils.getAddress(address)

    // We expect only one Parser to return a result. If multiple do, we take the first and early exit.
    const contractParserResult = await findAsyncSequential<SubParser<T>, TxSpecific>(
      this.parsers,
      async (parser) => await parser.parse(tx),
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
    const status = tx.status

    if (status === -1 && tx.confirmations <= 0) return TxStatus.Pending
    if (status === 1 && tx.confirmations > 0) return TxStatus.Confirmed
    if (status === 0) return TxStatus.Failed

    return TxStatus.Unknown
  }

  private getParsedTxWithTransfers(tx: T, parsedTx: ParsedTx, address: string) {
    if (address === tx.from) {
      // send amount
      const sendValue = new BigNumber(tx.value)
      if (sendValue.gt(0)) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Send,
          this.assetId,
          tx.from,
          tx.to,
          sendValue.toString(10),
        )
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
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Receive,
          this.assetId,
          tx.from,
          tx.to,
          receiveValue.toString(10),
        )
      }
    }

    tx.tokenTransfers?.forEach((transfer) => {
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

        return toAssetId({
          chainId: this.chainId,
          assetNamespace: 'erc20',
          assetReference: transfer.contract,
        })
      })()

      const transferArgs = [assetId, transfer.from, transfer.to, transfer.value, token] as const

      // token send amount
      if (address === transfer.from) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Send,
          ...transferArgs,
        )
      }

      // token receive amount
      if (address === transfer.to) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Receive,
          ...transferArgs,
        )
      }
    })

    tx.internalTxs?.forEach((internalTx) => {
      const transferArgs = [this.assetId, internalTx.from, internalTx.to, internalTx.value] as const

      // internal eth send
      if (address === internalTx.from) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Send,
          ...transferArgs,
        )
      }

      // internal eth receive
      if (address === internalTx.to) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Receive,
          ...transferArgs,
        )
      }
    })

    return parsedTx
  }
}
