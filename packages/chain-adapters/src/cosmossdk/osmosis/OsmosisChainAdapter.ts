import { ASSET_REFERENCE, AssetId, CHAIN_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  OsmosisSignTx,
  OsmosisTx,
  supportsOsmosis
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'

import { ErrorHandler } from '../../error/ErrorHandler'
import { toPath } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'

export class ChainAdapter extends CosmosSdkBaseAdapter<ChainTypes.Osmosis> {
  protected readonly supportedChainIds = ['cosmos:osmosis-1']
  protected readonly chainId = this.supportedChainIds[0]
  protected readonly assetId: AssetId
  protected readonly CHAIN_VALIDATOR_PREFIX_MAPPING = {
    [ChainTypes.Osmosis]: 'osmovaloper'
  }

  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: 118,
    accountNumber: 0
  }

  constructor(args: ChainAdapterArgs) {
    super(args)

    const chainId = this.chainId

    this.assetId = toAssetId({
      chainId,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Osmosis
    })

    // TODO this will need to change to the osmosis tx parser once we support osmosis specic things (trading, lping)
    this.parser = new unchained.cosmos.TransactionParser({
      chainId: this.chainId,
      assetId: this.getFeeAssetId()
    })
  }

  getFeeAssetId(): AssetId {
    return 'cosmos:osmosis-1/slip44:118'
  }
  getType(): ChainTypes.Osmosis {
    return ChainTypes.Osmosis
  }

  async getAddress(input: chainAdapters.GetAddressInput): Promise<string> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = input
    const path = toPath(bip44Params)
    const addressNList = bip32ToAddressNList(path)

    try {
      if (supportsOsmosis(wallet)) {
        const osmosisAddress = await wallet.osmosisGetAddress({
          addressNList,
          showDisplay: Boolean(input.showOnDevice)
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

  async signTransaction(signTxInput: chainAdapters.SignTxInput<OsmosisSignTx>): Promise<string> {
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

  async buildSendTransaction(
    tx: chainAdapters.BuildSendTxInput<ChainTypes.Osmosis>
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        to,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        sendMax = false,
        value,
        memo = ''
      } = tx

      if (!to) throw new Error('OsmosisChainAdapter: to is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })

      const account = await this.getAccount(from)

      if (sendMax) {
        try {
          const val = bnOrZero(account.balance).minus(gas)
          if (val.isFinite() || val.lte(0)) {
            throw new Error(`OsmosisChainAdapter: transaction value is invalid: ${val.toString()}`)
          }
          tx.value = val.toString()
        } catch (error) {
          return ErrorHandler(error)
        }
      }

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo'
            }
          ],
          gas
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgSend',
            value: {
              amount: [
                {
                  amount: bnOrZero(value).toString(),
                  denom: 'uosmo'
                }
              ],
              from_address: from,
              to_address: to
            }
          }
        ],
        signatures: [],
        memo
      }

      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildDelegateTransaction(
    tx: chainAdapters.BuildDelegateTxInput<ChainTypes.Osmosis>
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = ''
      } = tx
      if (!validator) throw new Error('OsmosisChainAdapter: validator is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid validator address ${validator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo'
            }
          ],
          gas
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgDelegate',
            value: {
              amount: {
                amount: bnOrZero(value).toString(),
                denom: 'uosmo'
              },
              delegator_address: from,
              validator_address: validator
            }
          }
        ],
        signatures: [],
        memo
      }

      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildUndelegateTransaction(
    tx: chainAdapters.BuildUndelegateTxInput<ChainTypes.Osmosis>
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = ''
      } = tx
      if (!validator) throw new Error('OsmosisChainAdapter: validator is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid validator address ${validator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo'
            }
          ],
          gas
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgUndelegate',
            value: {
              amount: {
                amount: bnOrZero(value).toString(),
                denom: 'uosmo'
              },
              delegator_address: from,
              validator_address: validator
            }
          }
        ],
        signatures: [],
        memo
      }
      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildClaimRewardsTransaction(
    tx: chainAdapters.BuildClaimRewardsTxInput<ChainTypes.Osmosis>
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        memo = ''
      } = tx
      if (!validator) throw new Error('OsmosisChainAdapter: validator is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid validator address ${validator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo'
            }
          ],
          gas
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgWithdrawDelegationReward',
            value: {
              delegator_address: from,
              validator_address: validator
            }
          }
        ],
        signatures: [],
        memo
      }
      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildRedelegateTransaction(
    tx: chainAdapters.BuildRedelegateTxInput<ChainTypes.Osmosis>
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = '',
        fromValidator,
        toValidator
      } = tx
      if (!toValidator) throw new Error('OsmosisChainAdapter: toValidator is required')
      if (!fromValidator) throw new Error('OsmosisChainAdapter: fromValidator is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')
      const { prefix: toPrefix } = bech32.decode(toValidator)
      const { prefix: fromPrefix } = bech32.decode(fromValidator)
      const chain = this.getType()
      if (
        this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== toPrefix ||
        this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== fromPrefix
      )
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid toValidator or fromValidator address ${toValidator} ${fromValidator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildRedelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo'
            }
          ],
          gas
        },
        msg: [
          {
            type: 'cosmos-sdk/MsgBeginRedelegate',
            value: {
              amount: {
                amount: bnOrZero(value).toString(),
                denom: 'uosmo'
              },
              delegator_address: from,
              validator_src_address: fromValidator,
              validator_dst_address: toValidator
            }
          }
        ],
        signatures: [],
        memo
      }

      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  // @ts-ignore - keep type signature with unimplemented state
  async getFeeData({
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars -- Disable no-unused-vars lint rule for unimplemented variable */
    sendMax
  }: Partial<chainAdapters.GetFeeDataInput<ChainTypes.Osmosis>>): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes.Osmosis>
  > {
    // We currently don't have a way to query validators to get dynamic fees, so they are hard coded.
    // When we find a strategy to make this more dynamic, we can use 'sendMax' to define max amount.
    return {
      [chainAdapters.FeeDataKey.Fast]: {
        txFee: '5000',
        chainSpecific: { gasLimit: '250000' }
      },
      [chainAdapters.FeeDataKey.Average]: {
        txFee: '3500',
        chainSpecific: { gasLimit: '250000' }
      },
      [chainAdapters.FeeDataKey.Slow]: {
        txFee: '2500',
        chainSpecific: { gasLimit: '250000' }
      }
    }
  }

  async signAndBroadcastTransaction(
    signTxInput: chainAdapters.SignTxInput<OsmosisSignTx>
  ): Promise<string> {
    const { wallet } = signTxInput
    try {
      if (supportsOsmosis(wallet)) {
        const signedTx = await this.signTransaction(signTxInput)
        const { data } = await this.providers.http.sendTx({ body: { rawTx: signedTx } })
        return data
      } else {
        throw new Error('Wallet does not support Osmosis.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }
}
