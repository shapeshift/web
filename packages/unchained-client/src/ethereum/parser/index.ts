import { ASSET_REFERENCE, AssetId, ChainId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'

import { EthereumTx } from '../../generated/ethereum'
import { Status, Token, TransferType } from '../../types'
import { aggregateTransfer, findAsyncSequential } from '../../utils'
import { ParsedTx, SubParser, TxSpecific } from '../types'
import * as erc20 from './erc20'
import * as foxy from './foxy'
import * as thor from './thor'
import * as uniV2 from './uniV2'
import * as weth from './weth'
import * as yearn from './yearn'
import * as zrx from './zrx'

export interface TransactionParserArgs {
  chainId: ChainId
  rpcUrl: string
}

export class TransactionParser {
  chainId: ChainId
  assetId: AssetId

  private readonly thor: thor.Parser
  private readonly uniV2: uniV2.Parser
  private readonly zrx: zrx.Parser
  private readonly yearn: yearn.Parser
  private readonly foxy: foxy.Parser
  private readonly weth: weth.Parser
  private readonly erc20: erc20.Parser
  private readonly parsers: Array<SubParser>

  constructor(args: TransactionParserArgs) {
    this.chainId = args.chainId

    this.assetId = toAssetId({
      ...fromChainId(this.chainId),
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Ethereum
    })

    const provider = new ethers.providers.JsonRpcProvider(args.rpcUrl)

    this.thor = new thor.Parser({ chainId: this.chainId, rpcUrl: args.rpcUrl })
    this.uniV2 = new uniV2.Parser({ chainId: this.chainId, provider })
    this.zrx = new zrx.Parser()
    this.yearn = new yearn.Parser({ provider, chainId: this.chainId })
    this.foxy = new foxy.Parser()
    this.weth = new weth.Parser({ chainId: this.chainId, provider })
    this.erc20 = new erc20.Parser({ chainId: this.chainId, provider })

    // order here matters currently as weth and yearn have the same sigHash for deposit() and the weth parser is stricter resulting in faster processing times
    this.parsers = [this.zrx, this.thor, this.uniV2, this.weth, this.foxy, this.yearn, this.erc20]
  }

  async parse(tx: EthereumTx, address: string): Promise<ParsedTx> {
    address = ethers.utils.getAddress(address)

    // We expect only one Parser to return a result. If multiple do, we take the first and early exit.
    const contractParserResult = await findAsyncSequential<SubParser, TxSpecific>(
      this.parsers,
      async (parser) => await parser.parse(tx)
    )

    const parsedTx: ParsedTx = {
      address,
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: TransactionParser.getStatus(tx),
      trade: contractParserResult?.trade,
      transfers: contractParserResult?.transfers ?? [],
      txid: tx.txid,
      data: contractParserResult?.data
    }

    return this.getParsedTxWithTransfers(tx, parsedTx, address)
  }

  private static getStatus(tx: EthereumTx): Status {
    const status = tx.status

    if (status === -1 && tx.confirmations <= 0) return Status.Pending
    if (status === 1 && tx.confirmations > 0) return Status.Confirmed
    if (status === 0) return Status.Failed

    return Status.Unknown
  }

  private getParsedTxWithTransfers(tx: EthereumTx, parsedTx: ParsedTx, address: string) {
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
          sendValue.toString(10)
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
          receiveValue.toString(10)
        )
      }
    }

    tx.tokenTransfers?.forEach((transfer) => {
      // FTX Token (FTT) name and symbol was set backwards on the ERC20 contract
      if (transfer.contract === '0x50D1c9771902476076eCFc8B2A83Ad6b9355a4c9') {
        transfer.name = transfer.symbol
        transfer.symbol = transfer.name
      }

      const token: Token = {
        contract: transfer.contract,
        decimals: transfer.decimals,
        name: transfer.name,
        symbol: transfer.symbol
      }

      const transferArgs = [
        toAssetId({
          ...fromChainId(this.chainId),
          assetNamespace: 'erc20',
          assetReference: transfer.contract
        }),
        transfer.from,
        transfer.to,
        transfer.value,
        token
      ] as const

      // token send amount
      if (address === transfer.from) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Send,
          ...transferArgs
        )
      }

      // token receive amount
      if (address === transfer.to) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Receive,
          ...transferArgs
        )
      }
    })

    tx.internalTxs?.forEach((internalTx) => {
      const transferArgs = [
        toAssetId({
          ...fromChainId(this.chainId),
          assetNamespace: 'slip44',
          assetReference: ASSET_REFERENCE.Ethereum
        }),
        internalTx.from,
        internalTx.to,
        internalTx.value
      ] as const

      // internal eth send
      if (address === internalTx.from) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Send,
          ...transferArgs
        )
      }

      // internal eth receive
      if (address === internalTx.to) {
        parsedTx.transfers = aggregateTransfer(
          parsedTx.transfers,
          TransferType.Receive,
          ...transferArgs
        )
      }
    })

    return parsedTx
  }
}
