import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, hyperEvmAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { MULTICALL3_CONTRACT } from '@shapeshiftoss/contracts'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { Contract, getAddress, Interface, JsonRpcProvider } from 'ethers'
import PQueue from 'p-queue'
import { erc20Abi, multicall3Abi, parseEventLogs } from 'viem'

import { ErrorHandler } from '../../error/ErrorHandler'
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
} from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION } from '../../types'
import { bnOrZero } from '../../utils/bignumber'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.HyperEvmMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.HyperEvmMainnet

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)']

const BATCH_SIZE = 500 // Process 500 tokens per multicall to avoid gas/RPC limits

export type TokenInfo = {
  assetId: AssetId
  contractAddress: string
  symbol: string
  name: string
  precision: number
}

export type ChainAdapterArgs = {
  rpcUrl: string
  knownTokens?: TokenInfo[]
}

export const isHyperEvmChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.HyperEvmMainnet
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.HyperEvmMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.HyperEvm),
    accountNumber: 0,
  }

  protected provider: JsonRpcProvider
  protected multicall: Contract
  protected erc20Interface: Interface
  protected knownTokens: TokenInfo[]
  private requestQueue: PQueue

  constructor(args: ChainAdapterArgs) {
    // Create a dummy parser - we won't use it since we don't support tx history
    const dummyParser = {
      parse: () => {
        throw new Error('Transaction parsing is not supported for HyperEVM')
      },
    } as any

    super({
      assetId: hyperEvmAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: dummyParser,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      providers: {} as any, // We don't use unchained providers
      rpcUrl: args.rpcUrl,
    })

    this.provider = new JsonRpcProvider(args.rpcUrl, undefined, {
      staticNetwork: true,
    })

    this.multicall = new Contract(MULTICALL3_CONTRACT, multicall3Abi, this.provider)
    this.erc20Interface = new Interface(ERC20_ABI)
    this.knownTokens = args.knownTokens ?? []
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 50,
      concurrency: 1,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.HyperEvm
  }

  getName() {
    return 'HyperEVM'
  }

  getType(): KnownChainIds.HyperEvmMainnet {
    return KnownChainIds.HyperEvmMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.HyperEvmMainnet>> {
    try {
      const [balance, nonce] = await Promise.all([
        this.requestQueue.add(() => this.provider.getBalance(pubkey)),
        this.requestQueue.add(() => this.provider.getTransactionCount(pubkey)),
      ])

      // Get known tokens from asset service for HyperEVM
      const knownTokens = await this.getKnownHyperEvmTokens()

      let tokens: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

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
      }
    } catch (err) {
      throw new Error(`Failed to get account: ${err}`)
    }
  }

  private getKnownHyperEvmTokens(): Promise<TokenInfo[]> {
    // Returns the list of known HyperEVM tokens passed in the constructor
    // These are fetched from the asset service by the plugin
    return Promise.resolve(this.knownTokens)
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

      // Process tokens in batches to avoid RPC limits
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE)
        const batchResults = await this.multicallBatch(pubkey, batch)
        results.push(...batchResults)
      }

      return results
    } catch (error) {
      console.warn('[HyperEVM] Multicall failed, falling back to individual calls:', error)
      // Fallback to individual calls if multicall fails
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
    // Build multicall calls array
    const calls = tokens.map(token => ({
      target: token.contractAddress,
      allowFailure: true, // Don't revert entire batch if one token fails
      callData: this.erc20Interface.encodeFunctionData('balanceOf', [pubkey]),
    }))

    // Execute multicall
    const results = await this.requestQueue.add(() => this.multicall.aggregate3(calls))

    // Decode results
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

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.HyperEvmMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.HyperEvmMainnet>> {
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
      }
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

      const txResponse = await this.provider.broadcastTransaction(hex)
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

  async parseTx(tx: unknown, pubkey: string): Promise<Transaction> {
    const txHash = tx as string

    try {
      const [transaction, receipt] = await Promise.all([
        this.requestQueue.add(() => this.provider.getTransaction(txHash)),
        this.requestQueue.add(() => this.provider.getTransactionReceipt(txHash)),
      ])

      if (!transaction || !receipt) {
        throw new Error(`Transaction not found: ${txHash}`)
      }

      const transferLogs = parseEventLogs({
        abi: erc20Abi,
        logs: receipt.logs as any,
        eventName: 'Transfer',
      })

      const tokenTransfers: evm.TokenTransfer[] = transferLogs
        .map(log => {
          const tokenInfo = this.knownTokens.find(
            t => getAddress(t.contractAddress) === getAddress(log.address),
          )

          if (!tokenInfo) return null

          return {
            contract: getAddress(log.address),
            decimals: tokenInfo.precision,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            type: 'ERC20' as const,
            from: getAddress(log.args.from ?? '0x0'),
            to: getAddress(log.args.to ?? '0x0'),
            value: log.args.value?.toString() ?? '0',
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null)

      let timestamp = 0
      if (transaction.blockNumber) {
        const blockNumber = transaction.blockNumber
        const block = await this.requestQueue.add(() => this.provider.getBlock(blockNumber))
        timestamp = block?.timestamp ?? 0
      }

      const confirmationsCount =
        typeof receipt.confirmations === 'function'
          ? await receipt.confirmations()
          : receipt.confirmations ?? 0

      const gasPrice = transaction.gasPrice ?? transaction.maxFeePerGas ?? 0n

      const unchainedTx: evm.Tx = {
        txid: transaction.hash,
        blockHash: transaction.blockHash ?? '',
        blockHeight: transaction.blockNumber ?? 0,
        timestamp,
        confirmations: confirmationsCount,
        status: receipt.status === 1 ? 1 : 0,
        from: getAddress(transaction.from),
        to: getAddress(transaction.to ?? ''),
        value: transaction.value.toString(),
        fee: (BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(),
        gasLimit: transaction.gasLimit.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: gasPrice.toString(),
        inputData: transaction.data,
        tokenTransfers,
        internalTxs: [],
      }

      return this.parse(unchainedTx, pubkey)
    } catch (error) {
      throw new Error(`Failed to parse transaction: ${error}`)
    }
  }

  private parse(tx: evm.Tx, pubkey: string): Transaction {
    const address = getAddress(pubkey)

    const parsedTx: Transaction = {
      blockHash: tx.blockHash,
      blockHeight: tx.blockHeight,
      blockTime: tx.timestamp,
      chainId: this.chainId,
      confirmations: tx.confirmations,
      status: tx.status === 1 ? TxStatus.Confirmed : TxStatus.Failed,
      transfers: [],
      txid: tx.txid,
      pubkey,
    }

    if (address === tx.from) {
      const sendValue = BigInt(tx.value)
      if (sendValue > 0) {
        parsedTx.transfers.push({
          assetId: this.assetId,
          from: [tx.from],
          to: [tx.to],
          type: TransferType.Send,
          value: tx.value,
        })
      }

      const fees = BigInt(tx.fee)
      if (fees > 0) {
        parsedTx.fee = { assetId: this.assetId, value: tx.fee }
      }
    }

    if (address === tx.to) {
      const receiveValue = BigInt(tx.value)
      if (receiveValue > 0) {
        parsedTx.transfers.push({
          assetId: this.assetId,
          from: [tx.from],
          to: [tx.to],
          type: TransferType.Receive,
          value: tx.value,
        })
      }
    }

    tx.tokenTransfers?.forEach(transfer => {
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

      if (address === transfer.from) {
        parsedTx.transfers.push({
          assetId,
          from: [transfer.from],
          to: [transfer.to],
          type: TransferType.Send,
          value: transfer.value,
          token,
        })
      }

      if (address === transfer.to) {
        parsedTx.transfers.push({
          assetId,
          from: [transfer.from],
          to: [transfer.to],
          type: TransferType.Receive,
          value: transfer.value,
          token,
        })
      }
    })

    return parsedTx
  }
}
