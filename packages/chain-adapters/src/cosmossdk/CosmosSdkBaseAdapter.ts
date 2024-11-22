import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId, generateAssetIdFromCosmosSdkDenom } from '@shapeshiftoss/caip'
import type { BIP44Params, CosmosSdkChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'
import PQueue from 'p-queue'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTx,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../types'
import { CONTRACT_INTERACTION, ValidAddressResultType } from '../types'
import { toAddressNList, toRootDerivationPath } from '../utils'
import { bnOrZero } from '../utils/bignumber'
import { assertAddressNotSanctioned } from '../utils/validateAddress'
import type { cosmos, thorchain } from './'
import type {
  BuildTransactionInput,
  CosmosSDKToken,
  Delegation,
  Redelegation,
  RedelegationEntry,
  Reward,
  Undelegation,
  UndelegationEntry,
  Validator,
  ValidatorAction,
  ValidatorReward,
} from './types'

const CHAIN_ID_TO_BECH32_ADDR_PREFIX = {
  [KnownChainIds.CosmosMainnet]: 'cosmos',
  [KnownChainIds.ThorchainMainnet]: 'thor',
}

const CHAIN_ID_TO_BECH32_VAL_PREFIX = {
  [KnownChainIds.CosmosMainnet]: 'cosmosvaloper',
  [KnownChainIds.ThorchainMainnet]: 'thorv',
}

export const assertIsValidatorAddress = (validator: string, chainId: CosmosSdkChainId) => {
  if (CHAIN_ID_TO_BECH32_VAL_PREFIX[chainId] !== bech32.decode(validator).prefix) {
    throw new Error(`invalid validator address: ${validator}`)
  }
}

const transformValidator = (validator: unchained.cosmossdk.types.Validator): Validator => ({
  address: validator.address,
  moniker: validator.moniker,
  tokens: validator.tokens,
  commission: validator.commission.rate,
  apr: validator.apr,
})

export const cosmosSdkChainIds = [
  KnownChainIds.CosmosMainnet,
  KnownChainIds.ThorchainMainnet,
] as const

export type CosmosSdkChainAdapter = cosmos.ChainAdapter | thorchain.ChainAdapter

export enum Denoms {
  rune = 'rune',
  uatom = 'uatom',
}

type Denom = `${Denoms}`

export interface ChainAdapterArgs<T = unchained.cosmossdk.Api> {
  chainId?: CosmosSdkChainId
  coinName: string
  providers: {
    http: T
    ws: unchained.ws.Client<unchained.cosmossdk.Tx>
  }
}

export interface CosmosSdkBaseAdapterArgs extends ChainAdapterArgs {
  assetId: AssetId
  chainId: CosmosSdkChainId
  defaultBIP44Params: BIP44Params
  denom: Denom
  parser: unchained.cosmossdk.BaseTransactionParser<unchained.cosmossdk.Tx>
  supportedChainIds: ChainId[]
}

export abstract class CosmosSdkBaseAdapter<T extends CosmosSdkChainId> implements IChainAdapter<T> {
  protected readonly chainId: CosmosSdkChainId
  protected readonly coinName: string
  protected readonly defaultBIP44Params: BIP44Params
  protected readonly supportedChainIds: ChainId[]
  protected readonly providers: {
    http: unchained.cosmossdk.Api
    ws: unchained.ws.Client<unchained.cosmossdk.Tx>
  }

  protected assetId: AssetId
  protected denom: string
  protected parser: unchained.cosmossdk.BaseTransactionParser<unchained.cosmossdk.Tx>

  protected constructor(args: CosmosSdkBaseAdapterArgs) {
    this.assetId = args.assetId
    this.chainId = args.chainId
    this.coinName = args.coinName
    this.defaultBIP44Params = args.defaultBIP44Params
    this.denom = args.denom
    this.parser = args.parser
    this.providers = args.providers
    this.supportedChainIds = args.supportedChainIds

    if (!this.supportedChainIds.includes(this.chainId)) {
      throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`)
    }
  }

  abstract getType(): T
  abstract getFeeAssetId(): AssetId
  abstract getName(): string
  abstract getDisplayName(): string
  abstract buildSendApiTransaction(tx: BuildSendApiTxInput<T>): Promise<{ txToSign: SignTx<T> }>
  abstract buildSendTransaction(tx: BuildSendTxInput<T>): Promise<{ txToSign: SignTx<T> }>
  abstract getAddress(input: GetAddressInput): Promise<string>
  abstract getFeeData(input: Partial<GetFeeDataInput<T>>): Promise<FeeDataEstimate<T>>
  abstract signTransaction(signTxInput: SignTxInput<SignTx<T>>): Promise<string>
  abstract signAndBroadcastTransaction(input: SignAndBroadcastTransactionInput<T>): Promise<string>

  getChainId(): ChainId {
    return this.chainId
  }

  getBIP44Params({ accountNumber }: GetBIP44ParamsInput): BIP44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return { ...this.defaultBIP44Params, accountNumber }
  }

  async getAccount(pubkey: string): Promise<Account<T>> {
    try {
      const account = await (async () => {
        if (this.providers.http instanceof unchained.thorchain.V1Api) {
          const data = await this.providers.http.getAccount({ pubkey })
          return { ...data, delegations: [], redelegations: [], undelegations: [], rewards: [] }
        }

        const data = await this.providers.http.getAccount({ pubkey })

        const delegations = data.delegations.map<Delegation>(delegation => ({
          assetId: this.assetId,
          amount: delegation.balance.amount,
          validator: transformValidator(delegation.validator),
        }))

        const redelegations = data.redelegations.map<Redelegation>(redelegation => ({
          destinationValidator: transformValidator(redelegation.destinationValidator),
          sourceValidator: transformValidator(redelegation.sourceValidator),
          entries: redelegation.entries.map<RedelegationEntry>(entry => ({
            assetId: this.assetId,
            completionTime: Number(entry.completionTime),
            amount: entry.balance,
          })),
        }))

        const undelegations = data.unbondings.map<Undelegation>(undelegation => ({
          validator: transformValidator(undelegation.validator),
          entries: undelegation.entries.map<UndelegationEntry>(entry => ({
            assetId: this.assetId,
            completionTime: Number(entry.completionTime),
            amount: entry.balance.amount,
          })),
        }))

        const rewards = data.rewards.map<ValidatorReward>(validatorReward => ({
          validator: transformValidator(validatorReward.validator),
          rewards: validatorReward.rewards
            // We only support same-denom rewards for now
            .filter(reward => reward.denom === this.denom)
            .map<Reward>(reward => ({
              assetId: this.assetId,
              amount: reward.amount,
            })),
        }))

        const assets = data.assets.map<CosmosSDKToken>(asset => ({
          amount: asset.amount,
          assetId: generateAssetIdFromCosmosSdkDenom(asset.denom, this.getFeeAssetId()),
        }))

        return { ...data, delegations, redelegations, undelegations, rewards, assets }
      })()

      return {
        balance: account.balance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          accountNumber: account.accountNumber.toString(),
          assets: account.assets,
          sequence: account.sequence.toString(),
          delegations: account.delegations,
          redelegations: account.redelegations,
          undelegations: account.undelegations,
          rewards: account.rewards,
        },
        pubkey: account.pubkey,
      } as Account<T>
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    try {
      const requestQueue = input.requestQueue ?? new PQueue()

      const data = await requestQueue.add(() =>
        this.providers.http.getTxHistory({
          pubkey: input.pubkey,
          pageSize: input.pageSize,
          cursor: input.cursor,
        }),
      )

      const txs = await Promise.all(
        data.txs.map(tx => requestQueue.add(() => this.parseTx(tx, input.pubkey))),
      )

      return {
        cursor: data.cursor,
        pubkey: input.pubkey,
        transactions: txs,
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  protected getAmount({
    account,
    value,
    fee,
    sendMax,
    validatorAction,
  }: {
    account: Account<T>
    value: string
    fee: string
    sendMax?: boolean
    validatorAction?: ValidatorAction
  }) {
    if (!sendMax) return value

    const availableBalance = (() => {
      switch (validatorAction?.type) {
        case 'undelegate':
        case 'redelegate':
          return bnOrZero(
            account.chainSpecific.delegations.find(
              delegation => delegation.validator.address === validatorAction.address,
            )?.amount,
          )
        default:
          return bnOrZero(account.balance)
      }
    })().minus(fee)

    if (!availableBalance.isFinite() || availableBalance.lte(0)) {
      throw new Error(`not enough balance to send: ${availableBalance.toString()}`)
    }

    return availableBalance.toString()
  }

  protected buildTransaction<U extends CosmosSdkChainId>(
    input: BuildTransactionInput<CosmosSdkChainId>,
  ): { txToSign: SignTx<U> } {
    const { account, accountNumber, msg, memo = '', chainSpecific } = input
    const { gas, fee } = chainSpecific

    const bip44Params = this.getBIP44Params({ accountNumber })

    const unsignedTx = {
      fee: { amount: [{ amount: bnOrZero(fee).toString(), denom: this.denom }], gas },
      msg: [msg],
      signatures: [],
      memo,
    }

    const txToSign = {
      addressNList: toAddressNList(bip44Params),
      tx: unsignedTx,
      chain_id: fromChainId(this.getType()).chainReference,
      account_number: account.chainSpecific.accountNumber,
      sequence: account.chainSpecific.sequence,
    } as unknown as SignTx<U>

    return { txToSign }
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

      const txHash = await this.providers.http.sendTx({ body: { rawTx: hex } })

      return txHash
    } catch (err) {
      if ((err as Error).name === 'ResponseError') {
        const response = await ((err as any).response as Response).json()

        const match = response.message.match(/description:\s*([^,]+)$/)

        return ErrorHandler(JSON.stringify(response), {
          translation: 'chainAdapters.errors.broadcastTransactionWithMessage',
          options: { message: match && match[1] ? match[1].trim() : response.message },
        })
      }

      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  // eslint-disable-next-line require-await
  async validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      const chain = this.getType()
      const { prefix } = bech32.decode(address)

      if (CHAIN_ID_TO_BECH32_ADDR_PREFIX[chain] !== prefix) {
        throw new Error(`invalid address ${address} for ${this.getDisplayName()}`)
      }

      return {
        valid: true,
        result: ValidAddressResultType.Valid,
      }
    } catch (err) {
      return { valid: false, result: ValidAddressResultType.Invalid }
    }
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const { pubKey, accountNumber, wallet } = input

    const bip44Params = this.getBIP44Params({ accountNumber })
    const address = await this.getAddress({ accountNumber, wallet, pubKey })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
      async msg => onMessage(await this.parseTx(msg.data, msg.address)),
      err => onError({ message: err.message }),
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { accountNumber } = input
    const bip44Params = this.getBIP44Params({ accountNumber })
    const subscriptionId = toRootDerivationPath(bip44Params)

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }

  async getValidator(address: string): Promise<Validator | undefined> {
    try {
      if (this.providers.http instanceof unchained.thorchain.V1Api) return

      const validator = await this.providers.http.getValidator({ pubkey: address })
      return transformValidator(validator)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getValidator',
      })
    }
  }

  protected async parseTx(tx: unchained.cosmossdk.Tx, pubkey: string): Promise<Transaction> {
    const { address: _, ...parsedTx } = await this.parser.parse(tx, pubkey)

    return {
      ...parsedTx,
      pubkey,
      transfers: parsedTx.transfers.map(transfer => ({
        assetId: transfer.assetId,
        from: [transfer.from],
        to: [transfer.to],
        type: transfer.type,
        value: transfer.totalValue,
      })),
    }
  }
}
