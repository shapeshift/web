import { ASSET_REFERENCE, AssetId, CHAIN_REFERENCE, osmosisAssetId } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  OsmosisSignTx,
  OsmosisTx,
  supportsOsmosis,
} from '@shapeshiftoss/hdwallet-core'
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
import { toPath } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.OsmosisMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.OsmosisMainnet
const CHAIN_VALIDATOR_PREFIX_MAPPING = {
  [KnownChainIds.OsmosisMainnet]: 'osmovaloper',
}

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.OsmosisMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Osmosis),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.assetId = osmosisAssetId
    this.parser = new unchained.osmosis.TransactionParser({ chainId: this.chainId })
  }

  getDisplayName() {
    return 'Osmosis'
  }

  getType(): KnownChainIds.OsmosisMainnet {
    return KnownChainIds.OsmosisMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, bip44Params = this.defaultBIP44Params, showOnDevice = false } = input
    const path = toPath(bip44Params)
    const addressNList = bip32ToAddressNList(path)

    try {
      if (supportsOsmosis(wallet)) {
        const osmosisAddress = await wallet.osmosisGetAddress({
          addressNList,
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

  async buildSendTransaction(
    tx: BuildSendTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
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
              denom: 'uosmo',
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
                  denom: 'uosmo',
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

      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildDelegateTransaction(
    tx: BuildDelegateTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = '',
      } = tx
      if (!validator) throw new Error('OsmosisChainAdapter: validator is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid validator address ${validator}`,
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo',
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
                denom: 'uosmo',
              },
              delegator_address: from,
              validator_address: validator,
            },
          },
        ],
        signatures: [],
        memo,
      }

      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildUndelegateTransaction(
    tx: BuildUndelegateTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = '',
      } = tx
      if (!validator) throw new Error('OsmosisChainAdapter: validator is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid validator address ${validator}`,
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo',
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
                denom: 'uosmo',
              },
              delegator_address: from,
              validator_address: validator,
            },
          },
        ],
        signatures: [],
        memo,
      }
      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildClaimRewardsTransaction(
    tx: BuildClaimRewardsTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = this.defaultBIP44Params,
        chainSpecific: { gas, fee },
        memo = '',
      } = tx
      if (!validator) throw new Error('OsmosisChainAdapter: validator is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid validator address ${validator}`,
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo',
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
      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence,
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildRedelegateTransaction(
    tx: BuildRedelegateTxInput<KnownChainIds.OsmosisMainnet>,
  ): Promise<{ txToSign: OsmosisSignTx }> {
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
      if (!toValidator) throw new Error('OsmosisChainAdapter: toValidator is required')
      if (!fromValidator) throw new Error('OsmosisChainAdapter: fromValidator is required')
      if (!value) throw new Error('OsmosisChainAdapter: value is required')
      const { prefix: toPrefix } = bech32.decode(toValidator)
      const { prefix: fromPrefix } = bech32.decode(fromValidator)
      const chain = this.getType()
      if (
        CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== toPrefix ||
        CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== fromPrefix
      )
        throw new Error(
          `OsmosisChainAdapter:buildDelegateTransaction invalid toValidator or fromValidator address ${toValidator} ${fromValidator}`,
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `OsmosisChainAdapter:buildRedelegateTransaction invalid delegator address ${from}`,
        )

      const account = await this.getAccount(from)

      const utx: OsmosisTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uosmo',
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
                denom: 'uosmo',
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

      const txToSign: OsmosisSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.OsmosisMainnet,
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
  }: Partial<GetFeeDataInput<KnownChainIds.OsmosisMainnet>>): Promise<
    FeeDataEstimate<KnownChainIds.OsmosisMainnet>
  > {
    // We currently don't have a way to query validators to get dynamic fees, so they are hard coded.
    // When we find a strategy to make this more dynamic, we can use 'sendMax' to define max amount.
    return {
      fast: { txFee: '5000', chainSpecific: { gasLimit: '300000' } },
      average: { txFee: '3500', chainSpecific: { gasLimit: '300000' } },
      slow: { txFee: '2500', chainSpecific: { gasLimit: '300000' } },
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<OsmosisSignTx>): Promise<string> {
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
