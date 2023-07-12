import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, osmosisAssetId } from '@shapeshiftoss/caip'
import type { OsmosisSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ErrorHandler } from '../../error/ErrorHandler'
import type {
  BuildClaimRewardsTxInput,
  BuildDelegateTxInput,
  BuildLPAddTxInput,
  BuildLPRemoveTxInput,
  BuildRedelegateTxInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  BuildUndelegateTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignTxInput,
} from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bn, calcFee, toAddressNList } from '../../utils'
import type { ChainAdapterArgs } from '../CosmosSdkBaseAdapter'
import { assertIsValidatorAddress, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'
import type { Message, ValidatorAction } from '../types'

export const MIN_FEE = '2500'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.OsmosisMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.OsmosisMainnet

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.OsmosisMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Osmosis),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: osmosisAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      denom: 'uosmo',
      parser: new unchained.osmosis.TransactionParser({
        assetId: osmosisAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Osmosis
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Osmosis,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.OsmosisMainnet {
    return KnownChainIds.OsmosisMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { accountNumber, wallet, showOnDevice = false } = input

    try {
      if (supportsOsmosis(wallet)) {
        const bip44Params = this.getBIP44Params({ accountNumber })
        const osmosisAddress = await wallet.osmosisGetAddress({
          addressNList: toAddressNList(bip44Params),
          showDisplay: showOnDevice,
        })
        if (!osmosisAddress) {
          throw new Error('Unable to generate Osmosis address.')
        }
        return osmosisAddress
      } else {
        throw new Error('Wallet does not support Osmosis.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }

  async signTransaction(signTxInput: SignTxInput<OsmosisSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      if (supportsOsmosis(wallet)) {
        const signedTx = await wallet.osmosisSignTx(txToSign)

        if (!signedTx) throw new Error('Error signing tx')

        return signedTx.serialized
      } else {
        throw new Error('Wallet does not support Osmosis.')
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const { sendMax, to, value, from, chainSpecific } = input
      const { denom, fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      const account = await this.getAccount(from)
      const amount = this.getAmount({ account, value, fee, sendMax })

      const msg: Message = {
        type: 'cosmos-sdk/MsgSend',
        value: {
          amount: [{ amount, denom: denom ?? this.denom }],
          from_address: from,
          to_address: to,
        },
      }

      return this.buildTransaction({ ...input, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(
    input: BuildSendTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    const { accountNumber, wallet } = input
    const from = await this.getAddress({ accountNumber, wallet })
    return this.buildSendApiTransaction({ ...input, from })
  }

  async buildDelegateTransaction(
    tx: BuildDelegateTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const { accountNumber, chainSpecific, sendMax, validator, value, wallet } = tx
      const { fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      assertIsValidatorAddress(validator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)
      const validatorAction: ValidatorAction = { address: validator, type: 'delegate' }
      const amount = this.getAmount({ account, value, fee, sendMax, validatorAction })

      const msg: Message = {
        type: 'cosmos-sdk/MsgDelegate',
        value: {
          amount: { amount, denom: this.denom },
          delegator_address: from,
          validator_address: validator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildUndelegateTransaction(
    tx: BuildUndelegateTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const { accountNumber, chainSpecific, sendMax, validator, value, wallet } = tx
      const { fee } = chainSpecific

      if (!fee) throw new Error('fee is required')

      assertIsValidatorAddress(validator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)
      const validatorAction: ValidatorAction = { address: validator, type: 'undelegate' }
      const amount = this.getAmount({ account, value, fee, sendMax, validatorAction })

      const msg: Message = {
        type: 'cosmos-sdk/MsgUndelegate',
        value: {
          amount: { amount, denom: this.denom },
          delegator_address: from,
          validator_address: validator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildRedelegateTransaction(
    tx: BuildRedelegateTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
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

      const msg: Message = {
        type: 'cosmos-sdk/MsgBeginRedelegate',
        value: {
          amount: { amount, denom: this.denom },
          delegator_address: from,
          validator_src_address: fromValidator,
          validator_dst_address: toValidator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildClaimRewardsTransaction(
    tx: BuildClaimRewardsTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const { accountNumber, validator, wallet } = tx

      assertIsValidatorAddress(validator, this.getType())

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)

      const msg: Message = {
        type: 'cosmos-sdk/MsgWithdrawDelegationReward',
        value: {
          delegator_address: from,
          validator_address: validator,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildLPAddTransaction(
    tx: BuildLPAddTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const { accountNumber, wallet, poolId, shareOutAmount, tokenInMaxs } = tx

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)

      const msg: Message = {
        type: 'osmosis/gamm/join-pool',
        value: {
          sender: from,
          pool_id: poolId,
          share_out_amount: shareOutAmount,
          token_in_maxs: tokenInMaxs,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildLPRemoveTransaction(
    tx: BuildLPRemoveTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const { wallet, accountNumber, poolId, shareInAmount, tokenOutMins } = tx

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)

      const msg: Message = {
        type: 'osmosis/gamm/exit-pool',
        value: {
          sender: from,
          pool_id: poolId,
          share_in_amount: shareInAmount,
          token_out_mins: tokenOutMins,
        },
      }

      return this.buildTransaction({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  // eslint-disable-next-line require-await
  async getFeeData(
    _: Partial<GetFeeDataInput<KnownChainIds.OsmosisMainnet>>,
  ): Promise<FeeDataEstimate<KnownChainIds.OsmosisMainnet>> {
    const gasLimit = '300000'
    const scalars = { fast: bn(2), average: bn(1.5), slow: bn(1) }

    // We currently don't have a way to query validators to get dynamic fees, so they are hard coded.
    // When we find a strategy to make this more dynamic, we can use 'sendMax' to define max amount.
    return {
      fast: { txFee: calcFee(MIN_FEE, 'fast', scalars), chainSpecific: { gasLimit } },
      average: { txFee: calcFee(MIN_FEE, 'average', scalars), chainSpecific: { gasLimit } },
      slow: { txFee: calcFee(MIN_FEE, 'slow', scalars), chainSpecific: { gasLimit } },
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<OsmosisSignTx>): Promise<string> {
    const { wallet } = signTxInput
    try {
      if (supportsOsmosis(wallet)) {
        const signedTx = await this.signTransaction(signTxInput)
        return this.providers.http.sendTx({ body: { rawTx: signedTx } })
      } else {
        throw new Error('Wallet does not support Osmosis.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }
}
