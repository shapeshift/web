import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CosmosSignTx } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import { getStatus, getType, toRootDerivationPath } from '../utils'

export type CosmosChainTypes = ChainTypes.Cosmos | ChainTypes.Osmosis

export interface ChainAdapterArgs {
  chainId?: ChainId
  providers: {
    http: unchained.cosmos.V1Api | unchained.osmosis.V1Api
    ws: unchained.ws.Client<unchained.cosmos.Tx> | unchained.ws.Client<unchained.osmosis.Tx>
  }
  coinName: string
}

const CHAIN_TO_BECH32_PREFIX_MAPPING = {
  [ChainTypes.Cosmos]: 'cosmos',
  [ChainTypes.Osmosis]: 'osmo'
}

const transformValidator = (
  validator: unchained.cosmos.Validator
): chainAdapters.cosmos.Validator => ({
  address: validator.address,
  moniker: validator.moniker,
  tokens: validator.tokens,
  commission: validator.commission.rate,
  apr: validator.apr
})

export abstract class CosmosSdkBaseAdapter<T extends CosmosChainTypes> implements IChainAdapter<T> {
  protected readonly chainId: ChainId
  protected readonly assetId: AssetId // This is the AssetId for native token on the chain (ATOM/OSMO/etc)
  protected readonly supportedChainIds: ChainId[]
  protected readonly coinName: string
  protected readonly providers: {
    http: unchained.cosmos.V1Api | unchained.osmosis.V1Api
    ws: unchained.ws.Client<unchained.cosmos.Tx> | unchained.ws.Client<unchained.osmosis.Tx>
  }

  protected parser: unchained.cosmos.TransactionParser

  static defaultBIP44Params: BIP44Params

  protected constructor(args: ChainAdapterArgs) {
    if (args.chainId && this.supportedChainIds.includes(args.chainId)) {
      this.chainId = args.chainId
    }

    CosmosSdkBaseAdapter.defaultBIP44Params = (<typeof CosmosSdkBaseAdapter>(
      this.constructor
    )).defaultBIP44Params

    this.providers = args.providers
  }

  abstract getType(): T

  getChainId(): ChainId {
    return this.chainId
  }

  abstract getFeeAssetId(): AssetId

  async getAccount(pubkey: string): Promise<chainAdapters.Account<T>> {
    try {
      const { data } = await this.providers.http.getAccount({ pubkey })

      const delegations = data.delegations.map<chainAdapters.cosmos.Delegation>((delegation) => ({
        assetId: this.assetId,
        amount: delegation.balance.amount,
        validator: transformValidator(delegation.validator)
      }))

      const redelegations = data.redelegations.map<chainAdapters.cosmos.Redelegation>(
        (redelegation) => ({
          destinationValidator: transformValidator(redelegation.destinationValidator),
          sourceValidator: transformValidator(redelegation.sourceValidator),
          entries: redelegation.entries.map<chainAdapters.cosmos.RedelegationEntry>((entry) => ({
            assetId: this.assetId,
            completionTime: Number(entry.completionTime),
            amount: entry.balance
          }))
        })
      )

      const undelegations = data.unbondings.map<chainAdapters.cosmos.Undelegation>(
        (undelegation) => ({
          validator: transformValidator(undelegation.validator),
          entries: undelegation.entries.map<chainAdapters.cosmos.UndelegationEntry>((entry) => ({
            assetId: this.assetId,
            completionTime: Number(entry.completionTime),
            amount: entry.balance.amount
          }))
        })
      )

      const rewards = data.rewards.map<chainAdapters.cosmos.ValidatorReward>((validatorReward) => ({
        validator: transformValidator(validatorReward.validator),
        rewards: validatorReward.rewards.map<chainAdapters.cosmos.Reward>((reward) => ({
          assetId: this.assetId,
          amount: reward.amount
        }))
      }))

      return {
        balance: data.balance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          accountNumber: data.accountNumber.toString(),
          delegations,
          redelegations,
          undelegations,
          rewards,
          sequence: data.sequence.toString()
        },
        pubkey: data.pubkey
        /* TypeScript can't guarantee the correct type for the chainSpecific field because of the generic return type.
           It is preferable to define and type the return instead of applying the cast below, but that's left as an exercise
           for the reader. */
      } as chainAdapters.Account<T>
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params {
    return { ...CosmosSdkBaseAdapter.defaultBIP44Params, ...params }
  }

  async getTxHistory(
    input: chainAdapters.TxHistoryInput
  ): Promise<chainAdapters.TxHistoryResponse<T>> {
    try {
      const { data } = await this.providers.http.getTxHistory({
        pubkey: input.pubkey,
        pageSize: input.pageSize,
        cursor: input.cursor
      })

      const txs = await Promise.all(
        data.txs.map(async (tx) => {
          const parsedTx = await this.parser.parse(tx, input.pubkey)

          return {
            address: input.pubkey,
            blockHash: parsedTx.blockHash,
            blockHeight: parsedTx.blockHeight,
            blockTime: parsedTx.blockTime,
            chainId: parsedTx.chainId,
            chain: this.getType(),
            confirmations: parsedTx.confirmations,
            txid: parsedTx.txid,
            fee: parsedTx.fee,
            status: getStatus(parsedTx.status),
            tradeDetails: parsedTx.trade,
            transfers: parsedTx.transfers.map((transfer) => ({
              assetId: transfer.assetId,
              from: transfer.from,
              to: transfer.to,
              type: getType(transfer.type),
              value: transfer.totalValue
            })),
            data: parsedTx.data
          }
        })
      )

      return {
        cursor: data.cursor,
        pubkey: input.pubkey,
        transactions: txs
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  abstract buildSendTransaction(
    tx: chainAdapters.BuildSendTxInput<T>
  ): Promise<{ txToSign: chainAdapters.ChainTxType<T> }>

  abstract getAddress(input: chainAdapters.GetAddressInput): Promise<string>

  abstract getFeeData(
    input: Partial<chainAdapters.GetFeeDataInput<T>>
  ): Promise<chainAdapters.FeeDataEstimate<T>>

  abstract signTransaction(
    signTxInput: chainAdapters.SignTxInput<chainAdapters.ChainTxType<T>>
  ): Promise<string>

  async broadcastTransaction(hex: string): Promise<string> {
    try {
      const { data } = await this.providers.http.sendTx({ body: { rawTx: hex } })
      return data
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  abstract signAndBroadcastTransaction(
    signTxInput: chainAdapters.SignTxInput<CosmosSignTx>
  ): Promise<string>

  async validateAddress(address: string): Promise<chainAdapters.ValidAddressResult> {
    const chain = this.getType()
    try {
      const { prefix } = bech32.decode(address)

      if (CHAIN_TO_BECH32_PREFIX_MAPPING[chain] !== prefix) {
        throw new Error(`Invalid address ${address} for ChainType: ${chain}`)
      }

      return {
        valid: true,
        result: chainAdapters.ValidAddressResultType.Valid
      }
    } catch (err) {
      console.error(err)
      return { valid: false, result: chainAdapters.ValidAddressResultType.Invalid }
    }
  }

  async subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.Transaction<T>) => void,
    onError: (err: chainAdapters.SubscribeError) => void
  ): Promise<void> {
    const { wallet, bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params } = input

    const address = await this.getAddress({ wallet, bip44Params })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
      async (msg) => {
        const tx = await this.parser.parse(msg.data, msg.address)

        onMessage({
          address: tx.address,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.blockTime,
          chainId: tx.chainId,
          chain: this.getType(),
          confirmations: tx.confirmations,
          fee: tx.fee,
          status: getStatus(tx.status),
          tradeDetails: tx.trade,
          transfers: tx.transfers.map((transfer) => ({
            assetId: transfer.assetId,
            from: transfer.from,
            to: transfer.to,
            type: getType(transfer.type),
            value: transfer.totalValue
          })),
          txid: tx.txid
        })
      },
      (err) => onError({ message: err.message })
    )
  }

  unsubscribeTxs(input?: chainAdapters.SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params } = input
    const subscriptionId = toRootDerivationPath(bip44Params)

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }

  async getValidators(): Promise<Array<chainAdapters.cosmos.Validator>> {
    try {
      const { data } = await this.providers.http.getValidators()
      return data.validators.map<chainAdapters.cosmos.Validator>((validator) =>
        transformValidator(validator)
      )
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getValidator(address: string): Promise<chainAdapters.cosmos.Validator> {
    try {
      const { data: validator } = await this.providers.http.getValidator({ pubkey: address })
      return transformValidator(validator)
    } catch (err) {
      return ErrorHandler(err)
    }
  }
}
