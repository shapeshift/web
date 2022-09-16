import { ASSET_REFERENCE, AssetId, CHAIN_REFERENCE, cosmosAssetId } from '@shapeshiftoss/caip'
import { CosmosSignTx, CosmosTx, supportsCosmos } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'

import { ErrorHandler } from '../../error/ErrorHandler'
import {
  BuildClaimRewardsTxInput,
  BuildDelegateTxInput,
  BuildRedelegateTxInput,
  BuildSendTxInput,
  BuildUndelegateTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignTxInput,
} from '../../types'
import { toAddressNList } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.CosmosMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.CosmosMainnet
const CHAIN_VALIDATOR_PREFIX_MAPPING = {
  [KnownChainIds.CosmosMainnet]: 'cosmosvaloper',
}

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.CosmosMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Cosmos),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.assetId = cosmosAssetId
    this.parser = new unchained.cosmos.TransactionParser({ chainId: this.chainId })
  }

  getDisplayName() {
    return 'Cosmos'
  }

  getType(): KnownChainIds.CosmosMainnet {
    return KnownChainIds.CosmosMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params, showOnDevice = false } = input

    try {
      if (supportsCosmos(wallet)) {
        const cosmosAddress = await wallet.cosmosGetAddress({
          addressNList: toAddressNList(bip44Params),
          showDisplay: showOnDevice,
        })
        if (!cosmosAddress) {
          throw new Error('Unable to generate Cosmos address.')
        }
        return cosmosAddress
      } else {
        throw new Error('Wallet does not support Cosmos.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }

  async signTransaction(signTxInput: SignTxInput<CosmosSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      if (supportsCosmos(wallet)) {
        const signedTx = await wallet.cosmosSignTx(txToSign)

        if (!signedTx) throw new Error('Error signing tx')

        return signedTx.serialized
      } else {
        throw new Error('Wallet does not support Cosmos.')
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(
    tx: BuildSendTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        to,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        sendMax = false,
        value,
        memo = '',
      } = tx

      if (!to) throw new Error('CosmosChainAdapter: to is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')

      const from = await this.getAddress({ bip44Params, wallet })

      const account = await this.getAccount(from)

      if (sendMax) {
        try {
          const val = bnOrZero(account.balance).minus(fee)
          if (!val.isFinite() || val.lte(0)) {
            throw new Error(`CosmosChainAdapter: transaction value is invalid: ${val.toString()}`)
          }
          tx.value = val.toString()
        } catch (error) {
          return ErrorHandler(error)
        }
      }

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom',
            },
          ],
          gas,
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgSend',
            value: {
              amount: [
                {
                  amount: bnOrZero(value).toString(),
                  denom: 'uatom',
                },
              ],
              from_address: from,
              to_address: to,
            },
          },
        ],
        signatures: [],
        memo,
      }

      const txToSign: CosmosSignTx = {
        addressNList: toAddressNList(bip44Params),
        tx: utx,
        chain_id: CHAIN_REFERENCE.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildDelegateTransaction(
    tx: BuildDelegateTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = '',
      } = tx
      if (!validator) throw new Error('CosmosChainAdapter: validator is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid validator address ${validator}`,
        )

      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom',
            },
          ],
          gas,
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgDelegate',
            value: {
              amount: {
                amount: bnOrZero(value).toString(),
                denom: 'uatom',
              },
              delegator_address: from,
              validator_address: validator,
            },
          },
        ],
        signatures: [],
        memo,
      }

      const txToSign: CosmosSignTx = {
        addressNList: toAddressNList(bip44Params),
        tx: utx,
        chain_id: CHAIN_REFERENCE.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildUndelegateTransaction(
    tx: BuildUndelegateTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = '',
      } = tx
      if (!validator) throw new Error('CosmosChainAdapter: validator is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid validator address ${validator}`,
        )

      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom',
            },
          ],
          gas,
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgUndelegate',
            value: {
              amount: {
                amount: bnOrZero(value).toString(),
                denom: 'uatom',
              },
              delegator_address: from,
              validator_address: validator,
            },
          },
        ],
        signatures: [],
        memo,
      }
      const txToSign: CosmosSignTx = {
        addressNList: toAddressNList(bip44Params),
        tx: utx,
        chain_id: CHAIN_REFERENCE.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildClaimRewardsTransaction(
    tx: BuildClaimRewardsTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        memo = '',
      } = tx
      if (!validator) throw new Error('CosmosChainAdapter: validator is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid validator address ${validator}`,
        )

      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom',
            },
          ],
          gas,
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgWithdrawDelegationReward',
            value: {
              delegator_address: from,
              validator_address: validator,
            },
          },
        ],
        signatures: [],
        memo,
      }
      const txToSign: CosmosSignTx = {
        addressNList: toAddressNList(bip44Params),
        tx: utx,
        chain_id: CHAIN_REFERENCE.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildRedelegateTransaction(
    tx: BuildRedelegateTxInput<KnownChainIds.CosmosMainnet>,
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = '',
        fromValidator,
        toValidator,
      } = tx
      if (!toValidator) throw new Error('CosmosChainAdapter: toValidator is required')
      if (!fromValidator) throw new Error('CosmosChainAdapter: fromValidator is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')
      const { prefix: toPrefix } = bech32.decode(toValidator)
      const { prefix: fromPrefix } = bech32.decode(fromValidator)
      const chain = this.getType()
      if (
        CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== toPrefix ||
        CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== fromPrefix
      )
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid toValidator or fromValidator address ${toValidator} ${fromValidator}`,
        )

      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildRedelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom',
            },
          ],
          gas,
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgBeginRedelegate',
            value: {
              amount: {
                amount: bnOrZero(value).toString(),
                denom: 'uatom',
              },
              delegator_address: from,
              validator_src_address: fromValidator,
              validator_dst_address: toValidator,
            },
          },
        ],
        signatures: [],
        memo,
      }

      const txToSign: CosmosSignTx = {
        addressNList: toAddressNList(bip44Params),
        tx: utx,
        chain_id: CHAIN_REFERENCE.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  // @ts-ignore - keep type signature with unimplemented state
  async getFeeData({
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- Disable no-unused-vars lint rule for unimplemented variable */
    sendMax,
  }: Partial<GetFeeDataInput<KnownChainIds.CosmosMainnet>>): Promise<
    FeeDataEstimate<KnownChainIds.CosmosMainnet>
  > {
    // We currently don't have a way to query validators to get dynamic fees, so they are hard coded.
    // When we find a strategy to make this more dynamic, we can use 'sendMax' to define max amount.
    return {
      fast: { txFee: '5000', chainSpecific: { gasLimit: '250000' } },
      average: { txFee: '3500', chainSpecific: { gasLimit: '250000' } },
      slow: { txFee: '2500', chainSpecific: { gasLimit: '250000' } },
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<CosmosSignTx>): Promise<string> {
    const { wallet } = signTxInput
    try {
      if (supportsCosmos(wallet)) {
        const signedTx = await this.signTransaction(signTxInput)
        return this.providers.http.sendTx({ body: { rawTx: signedTx } })
      } else {
        throw new Error('Wallet does not support Cosmos.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }
}
