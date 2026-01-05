import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, hyperEvmChainId, toAssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { MULTICALL3_CONTRACT, viemClientByChainId } from '@shapeshiftoss/contracts'
import type { EvmChainId, RootBip44Params } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { Contract, Interface, JsonRpcProvider } from 'ethers'
import PQueue from 'p-queue'
import type { Hex } from 'viem'
import { erc20Abi, getAddress, isAddressEqual, multicall3Abi, parseEventLogs } from 'viem'

import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  FeeDataEstimate,
  GetFeeDataInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
} from '../types'
import { CONTRACT_INTERACTION } from '../types'
import { bn, bnOrZero } from '../utils/bignumber'
import { assertAddressNotSanctioned } from '../utils/validateAddress'
import { EvmBaseAdapter } from './EvmBaseAdapter'
import type { GasFeeDataEstimate } from './types'

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)']
const BATCH_SIZE = 500

export type TokenInfo = {
  assetId: AssetId
  contractAddress: string
  symbol: string
  name: string
  precision: number
}

export type SecondClassEvmAdapterArgs<T extends EvmChainId> = {
  assetId: AssetId
  chainId: T
  rootBip44Params: RootBip44Params
  supportedChainIds: ChainId[]
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export abstract class SecondClassEvmAdapter<T extends EvmChainId> extends EvmBaseAdapter<T> {
  protected provider: JsonRpcProvider
  protected multicall: Contract
  protected erc20Interface: Interface
  protected getKnownTokens: () => TokenInfo[]
  private requestQueue: PQueue

  constructor(args: SecondClassEvmAdapterArgs<T>) {
    const dummyParser = {
      parse: () => {
        throw new Error('Transaction parsing is not supported for second-class chains')
      },
    } as any

    super({
      assetId: args.assetId,
      chainId: args.chainId,
      rootBip44Params: args.rootBip44Params,
      parser: dummyParser,
      supportedChainIds: args.supportedChainIds,
      providers: {} as any,
      rpcUrl: args.rpcUrl,
    })

    this.provider = new JsonRpcProvider(args.rpcUrl, undefined, {
      staticNetwork: true,
    })

    this.multicall = new Contract(MULTICALL3_CONTRACT, multicall3Abi, this.provider)
    this.erc20Interface = new Interface(ERC20_ABI)
    this.getKnownTokens = args.getKnownTokens
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 50,
      concurrency: 1,
    })
  }

  async getAccount(pubkey: string): Promise<Account<T>> {
    try {
      const [balance, nonce] = await Promise.all([
        this.requestQueue.add(() => this.provider.getBalance(pubkey)),
        this.requestQueue.add(() => this.provider.getTransactionCount(pubkey)),
      ])

      let tokens: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

      const knownTokens = this.getKnownTokens()
      if (knownTokens.length > 0) {
        tokens = await this.getTokenBalancesMulticall(pubkey, knownTokens)
      }

      return {
        balance: balance.toString(),
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          nonce,
          tokens: tokens.filter(t => t.balance !== '0'),
        },
        pubkey,
      } as Account<T>
    } catch (err) {
      throw new Error(`Failed to get account: ${err}`)
    }
  }

  private async getTokenBalancesMulticall(
    pubkey: string,
    tokens: TokenInfo[],
  ): Promise<
    {
      assetId: AssetId
      balance: string
      symbol: string
      name: string
      precision: number
    }[]
  > {
    try {
      const results: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE)
        const batchResults = await this.multicallBatch(pubkey, batch)
        results.push(...batchResults)
      }

      return results
    } catch (error) {
      console.warn(`[${this.getName()}] Multicall failed, falling back to individual calls:`, error)
      return this.getTokenBalancesIndividual(pubkey, tokens)
    }
  }

  private async multicallBatch(
    pubkey: string,
    tokens: TokenInfo[],
  ): Promise<
    {
      assetId: AssetId
      balance: string
      symbol: string
      name: string
      precision: number
    }[]
  > {
    const calls = tokens.map(token => ({
      target: token.contractAddress,
      allowFailure: true,
      callData: this.erc20Interface.encodeFunctionData('balanceOf', [pubkey]),
    }))

    const results = await this.requestQueue.add(() => this.multicall.aggregate3(calls))

    return tokens
      .map((token, i) => {
        const { success, returnData } = results[i]

        if (!success || returnData === '0x') {
          return null
        }

        try {
          const [balance] = this.erc20Interface.decodeFunctionResult('balanceOf', returnData)

          return {
            assetId: token.assetId,
            balance: balance.toString(),
            symbol: token.symbol,
            name: token.name,
            precision: token.precision,
          }
        } catch {
          return null
        }
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
  }

  private async getTokenBalancesIndividual(
    pubkey: string,
    tokens: TokenInfo[],
  ): Promise<
    {
      assetId: AssetId
      balance: string
      symbol: string
      name: string
      precision: number
    }[]
  > {
    const results = await Promise.all(
      tokens.map(async token => {
        try {
          const contract = new Contract(token.contractAddress, ERC20_ABI, this.provider)

          const balance = await this.requestQueue.add(() => contract.balanceOf(pubkey))

          return {
            assetId: token.assetId,
            balance: balance.toString(),
            symbol: token.symbol,
            name: token.name,
            precision: token.precision,
          }
        } catch {
          return null
        }
      }),
    )

    return results.filter((result): result is NonNullable<typeof result> => result !== null)
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    try {
      const feeData = await this.requestQueue.add(() => this.provider.getFeeData())

      const gasPrice = feeData.gasPrice?.toString() ?? '0'
      const maxFeePerGas = feeData.maxFeePerGas?.toString()
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString()

      const fees = {
        gasPrice,
        ...(maxFeePerGas && maxPriorityFeePerGas ? { maxFeePerGas, maxPriorityFeePerGas } : {}),
      }

      return {
        fast: fees,
        average: fees,
        slow: fees,
      }
    } catch (err) {
      throw new Error(`Failed to get gas fee data: ${err}`)
    }
  }

  async getFeeData(input: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>> {
    try {
      const estimateGasBody = this.buildEstimateGasBody(input)

      const gasLimit = await this.requestQueue.add(() =>
        this.provider.estimateGas({
          from: estimateGasBody.from,
          to: estimateGasBody.to,
          value: estimateGasBody.value ? BigInt(estimateGasBody.value) : undefined,
          data: estimateGasBody.data,
        }),
      )

      const { fast, average, slow } = await this.getGasFeeData()

      const gasLimitString = gasLimit.toString()

      return {
        fast: {
          txFee: bnOrZero(fast.maxFeePerGas ?? fast.gasPrice)
            .times(gasLimitString)
            .toFixed(0),
          chainSpecific: { gasLimit: gasLimitString, ...fast },
        },
        average: {
          txFee: bnOrZero(average.maxFeePerGas ?? average.gasPrice)
            .times(gasLimitString)
            .toFixed(0),
          chainSpecific: { gasLimit: gasLimitString, ...average },
        },
        slow: {
          txFee: bnOrZero(slow.maxFeePerGas ?? slow.gasPrice)
            .times(gasLimitString)
            .toFixed(0),
          chainSpecific: { gasLimit: gasLimitString, ...slow },
        },
      } as FeeDataEstimate<T>
    } catch (err) {
      throw new Error(`Failed to get fee data: ${err}`)
    }
  }

  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const txResponse = await this.requestQueue.add(() => this.provider.broadcastTransaction(hex))
      return txResponse.hash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  unsubscribeTxs(_input?: SubscribeTxsInput): void {
    return
  }

  subscribeTxs(
    _input: SubscribeTxsInput,
    _onMessage: (msg: Transaction) => void,
    _onError: (err: SubscribeError) => void,
  ): Promise<void> {
    return Promise.resolve()
  }

  getTxHistory(_input: TxHistoryInput): Promise<TxHistoryResponse> {
    return Promise.resolve({
      cursor: '',
      pubkey: _input.pubkey,
      transactions: [],
      txIds: [],
    })
  }

  private async fetchInternalTransactions(
    txHash: string,
  ): Promise<{ from: string; to: string; value: string }[]> {
    if (this.chainId === hyperEvmChainId) {
      return []
    }

    try {
      const trace = await this.requestQueue.add(() =>
        this.provider.send('debug_traceTransaction', [txHash, { tracer: 'callTracer' }]),
      )

      const internalTxs: { from: string; to: string; value: string }[] = []

      const extractCalls = (call: any) => {
        if (call.value && call.value !== '0x0' && call.value !== '0x') {
          internalTxs.push({
            from: call.from,
            to: call.to,
            value: BigInt(call.value).toString(),
          })
        }

        if (call.calls && Array.isArray(call.calls)) {
          for (const subcall of call.calls) {
            extractCalls(subcall)
          }
        }
      }

      if (trace) {
        extractCalls(trace)
      }

      return internalTxs
    } catch (error) {
      return []
    }
  }

  async parseTx(txHash: unknown, pubkey: string): Promise<Transaction> {
    const hash = txHash as Hex
    const viemClient = viemClientByChainId[this.chainId]

    if (!viemClient) {
      throw new Error(`No viem client found for chainId: ${this.chainId}`)
    }

    try {
      const [transaction, receipt, internalTxs] = await Promise.all([
        viemClient.getTransaction({ hash }),
        viemClient.getTransactionReceipt({ hash }),
        this.fetchInternalTransactions(hash),
      ])

      if (!transaction || !receipt) {
        throw new Error(`Transaction not found: ${hash}`)
      }

      const block = receipt.blockHash
        ? await viemClient.getBlock({ blockHash: receipt.blockHash }).catch(() => null)
        : null

      const transferLogs = parseEventLogs({
        abi: erc20Abi,
        logs: receipt.logs,
        eventName: 'Transfer',
      })

      const knownTokens = this.getKnownTokens()
      const tokenTransfers: evm.TokenTransfer[] = transferLogs
        .map(log => {
          const tokenInfo = knownTokens.find(
            t => getAddress(t.contractAddress) === getAddress(log.address),
          )

          if (!tokenInfo) return null

          return {
            contract: getAddress(log.address),
            decimals: tokenInfo.precision,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            type: 'ERC20' as const,
            from: getAddress(log.args.from),
            to: getAddress(log.args.to),
            value: log.args.value.toString(),
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null)

      const timestamp = block?.timestamp ? Number(block.timestamp) : 0
      const blockNumber = receipt.blockNumber ? Number(receipt.blockNumber) : 0
      const currentBlockNumber = await viemClient.getBlockNumber()
      const confirmationsCount = blockNumber > 0 ? Number(currentBlockNumber) - blockNumber + 1 : 0
      const status = receipt.status === 'success' ? 1 : 0
      const fee = bnOrZero(receipt.gasUsed.toString())
        .times(receipt.effectiveGasPrice.toString())
        .toFixed(0)

      const parsedTx: evm.Tx = {
        txid: transaction.hash,
        blockHash: receipt.blockHash ?? '',
        blockHeight: blockNumber,
        timestamp,
        confirmations: confirmationsCount,
        status,
        from: getAddress(transaction.from),
        to: getAddress(transaction.to ?? '0x0'),
        value: transaction.value.toString(),
        fee,
        gasLimit: transaction.gas.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice.toString(),
        inputData: transaction.input,
        tokenTransfers,
        internalTxs: internalTxs.length > 0 ? internalTxs : undefined,
      }

      return this.parse(parsedTx, pubkey)
    } catch (error) {
      throw new Error(`Failed to parse transaction: ${error}`)
    }
  }

  private parse(tx: evm.Tx, pubkey: string): Transaction {
    const address = getAddress(pubkey)
    const txFrom = getAddress(tx.from)
    const txTo = getAddress(tx.to)
    const isSend = isAddressEqual(address, txFrom)
    const isReceive = isAddressEqual(address, txTo)
    const status = tx.status === 1 ? TxStatus.Confirmed : TxStatus.Failed

    const nativeTransfers = []
    if (isSend && bn(tx.value).gt(0)) {
      nativeTransfers.push({
        assetId: this.assetId,
        from: [tx.from],
        to: [tx.to],
        type: TransferType.Send,
        value: tx.value,
      })
    }

    if (isReceive && bn(tx.value).gt(0)) {
      nativeTransfers.push({
        assetId: this.assetId,
        from: [tx.from],
        to: [tx.to],
        type: TransferType.Receive,
        value: tx.value,
      })
    }

    if (tx.internalTxs) {
      for (const internalTx of tx.internalTxs) {
        if (bn(internalTx.value).lte(0)) continue

        const internalFrom = getAddress(internalTx.from)
        const internalTo = getAddress(internalTx.to)

        // Skip internal transactions that duplicate the native transaction
        if (
          isAddressEqual(internalFrom, txFrom) &&
          isAddressEqual(internalTo, txTo) &&
          internalTx.value === tx.value
        )
          continue

        if (isAddressEqual(address, internalFrom)) {
          nativeTransfers.push({
            assetId: this.assetId,
            from: [internalTx.from],
            to: [internalTx.to],
            type: TransferType.Send,
            value: internalTx.value,
          })
        }

        if (isAddressEqual(address, internalTo)) {
          nativeTransfers.push({
            assetId: this.assetId,
            from: [internalTx.from],
            to: [internalTx.to],
            type: TransferType.Receive,
            value: internalTx.value,
          })
        }
      }
    }

    const tokenTransfers =
      tx.tokenTransfers?.flatMap(transfer => {
        const transferFrom = getAddress(transfer.from)
        const transferTo = getAddress(transfer.to)
        const assetId = toAssetId({
          chainId: this.chainId,
          assetNamespace: ASSET_NAMESPACE.erc20,
          assetReference: transfer.contract,
        })

        const token = {
          contract: transfer.contract,
          decimals: transfer.decimals,
          name: transfer.name,
          symbol: transfer.symbol,
        }

        const transfers = []

        if (isAddressEqual(address, transferFrom)) {
          transfers.push({
            assetId,
            from: [transfer.from],
            to: [transfer.to],
            type: TransferType.Send,
            value: transfer.value,
            token,
          })
        }

        if (isAddressEqual(address, transferTo)) {
          transfers.push({
            assetId,
            from: [transfer.from],
            to: [transfer.to],
            type: TransferType.Receive,
            value: transfer.value,
            token,
          })
        }

        return transfers
      }) ?? []

    return {
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status,
      transfers: [...nativeTransfers, ...tokenTransfers],
      txid: tx.txid,
      pubkey,
      ...(isSend && { fee: { assetId: this.assetId, value: tx.fee } }),
    }
  }
}
