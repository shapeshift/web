import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, cosmosAssetId } from '@shapeshiftoss/caip'
import type { CosmosSignTx, CosmosWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsCosmos } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterError, ErrorHandler } from '../../error/ErrorHandler'
import type {
  BuildClaimRewardsTxInput,
  BuildDelegateTxInput,
  BuildRedelegateTxInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  BuildUndelegateTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTxInput,
} from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION } from '../../types'
import { bnOrZero, toAddressNList, verifyLedgerAppOpen } from '../../utils'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../CosmosSdkBaseAdapter'
import { assertIsValidatorAddress, CosmosSdkBaseAdapter, Denoms } from '../CosmosSdkBaseAdapter'
import type {
  CosmosSdkMsgBeginRedelegate,
  CosmosSdkMsgDelegate,
  CosmosSdkMsgSend,
  CosmosSdkMsgUndelegate,
  CosmosSdkMsgWithdrawDelegationReward,
  ValidatorAction,
} from '../types'
import { CosmosSdkMessageType } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.CosmosMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.CosmosMainnet

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.cosmos.V1Api> {
  midgardUrl: string
}

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.CosmosMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Cosmos),
    accountNumber: 0,
  }

  private readonly api: unchained.cosmos.V1Api

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: cosmosAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      denom: 'uatom',
      parser: new unchained.cosmos.TransactionParser({
        assetId: cosmosAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        midgardUrl: args.midgardUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.api = args.providers.http
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is CosmosWallet {
    if (!supportsCosmos(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Cosmos
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Cosmos)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.CosmosMainnet {
    return KnownChainIds.CosmosMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const bip44Params = this.getBIP44Params({ accountNumber })
      const address = await wallet.cosmosGetAddress({
        addressNList: toAddressNList(bip44Params),
        showDisplay: showOnDevice,
      })

      if (!address) throw new Error('error getting address from wallet')

      return address
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAddress',
      })
    }
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const { sendMax, to, value, from, chainSpecific } = input
      const { fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      const account = await this.getAccount(from)
      const amount = this.getAmount({ account, value, fee, sendMax })

      const msg: CosmosSdkMsgSend = {
        type: CosmosSdkMessageType.MsgSend,
        value: {
          amount: [{ amount, denom: this.denom }],
          from_address: from,
          to_address: to,
        },
      }

      return this.buildTransaction({ ...input, account, msg })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(
    input: BuildSendTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const { accountNumber, wallet } = input

      const from = await this.getAddress({ accountNumber, wallet })
      const tx = await this.buildSendApiTransaction({ ...input, from })

      return tx
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildDelegateTransaction(
    tx: BuildDelegateTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const { accountNumber, chainSpecific, sendMax, validator, value, wallet } = tx
      const { fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      assertIsValidatorAddress(validator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)
      const validatorAction: ValidatorAction = { address: validator, type: 'delegate' }
      const amount = this.getAmount({ account, value, fee, sendMax, validatorAction })

      const msg: CosmosSdkMsgDelegate = {
        type: CosmosSdkMessageType.MsgDelegate,
        value: {
          amount: { amount, denom: this.denom },
          delegator_address: from,
          validator_address: validator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildUndelegateTransaction(
    tx: BuildUndelegateTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const { accountNumber, chainSpecific, sendMax, validator, value, wallet } = tx
      const { fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      assertIsValidatorAddress(validator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)
      const validatorAction: ValidatorAction = { address: validator, type: 'undelegate' }
      const amount = this.getAmount({ account, value, fee, sendMax, validatorAction })

      const msg: CosmosSdkMsgUndelegate = {
        type: CosmosSdkMessageType.MsgUndelegate,
        value: {
          amount: { amount, denom: this.denom },
          delegator_address: from,
          validator_address: validator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildRedelegateTransaction(
    tx: BuildRedelegateTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const { accountNumber, chainSpecific, fromValidator, sendMax, toValidator, value, wallet } =
        tx
      const { fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      assertIsValidatorAddress(toValidator, this.getType())
      assertIsValidatorAddress(fromValidator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)
      const validatorAction: ValidatorAction = { address: fromValidator, type: 'redelegate' }
      const amount = this.getAmount({ account, value, fee, sendMax, validatorAction })

      const msg: CosmosSdkMsgBeginRedelegate = {
        type: CosmosSdkMessageType.MsgBeginRedelegate,
        value: {
          amount: { amount, denom: this.denom },
          delegator_address: from,
          validator_src_address: fromValidator,
          validator_dst_address: toValidator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildClaimRewardsTransaction(
    tx: BuildClaimRewardsTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const { accountNumber, validator, wallet } = tx

      assertIsValidatorAddress(validator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)

      const msg: CosmosSdkMsgWithdrawDelegationReward = {
        type: CosmosSdkMessageType.MsgWithdrawDelegationReward,
        value: {
          delegator_address: from,
          validator_address: validator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async signTransaction(signTxInput: SignTxInput<CosmosSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.cosmosSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async getFeeData(
    _: Partial<GetFeeDataInput<KnownChainIds.CosmosMainnet>>,
  ): Promise<FeeDataEstimate<KnownChainIds.CosmosMainnet>> {
    try {
      const gasLimit = '2000000'
      const fees = await this.api.fees()
      const txFee = bnOrZero(fees[Denoms.uatom]).times(gasLimit).toFixed(0)

      return {
        fast: { txFee, chainSpecific: { gasLimit } },
        average: { txFee, chainSpecific: { gasLimit } },
        slow: { txFee, chainSpecific: { gasLimit } },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.CosmosMainnet>): Promise<string> {
    try {
      const { wallet } = signTxInput

      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      this.assertSupportsChain(wallet)

      const hex = await this.signTransaction(signTxInput)
      const txHash = await this.broadcastTransaction({ senderAddress, receiverAddress, hex })

      return txHash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }
}
