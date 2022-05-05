import { AssetNamespace, AssetReference, caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  CosmosSignTx,
  CosmosTx,
  supportsCosmos
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'

import { ErrorHandler } from '../../error/ErrorHandler'
import { bnOrZero, toPath } from '../../utils'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'

export class ChainAdapter extends CosmosSdkBaseAdapter<ChainTypes.Cosmos> {
  protected readonly supportedChainIds = ['cosmos:cosmoshub-4', 'cosmos:vega-testnet']
  protected readonly chainId = this.supportedChainIds[0]
  protected readonly assetId: CAIP19
  protected readonly CHAIN_VALIDATOR_PREFIX_MAPPING = {
    [ChainTypes.Cosmos]: 'cosmosvaloper'
  }

  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: 118,
    accountNumber: 0
  }

  constructor(args: ChainAdapterArgs) {
    super(args)

    const { chain, network } = caip2.fromCAIP2(this.chainId)

    this.assetId = caip19.toCAIP19({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Cosmos
    })

    this.parser = new unchained.cosmos.TransactionParser({ chainId: this.chainId })
  }

  getType(): ChainTypes.Cosmos {
    return ChainTypes.Cosmos
  }

  async getAddress(input: chainAdapters.GetAddressInput): Promise<string> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = input
    const path = toPath(bip44Params)
    const addressNList = bip32ToAddressNList(path)

    try {
      if (supportsCosmos(wallet)) {
        const cosmosAddress = await wallet.cosmosGetAddress({
          addressNList,
          showDisplay: Boolean(input.showOnDevice)
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

  async signTransaction(signTxInput: chainAdapters.SignTxInput<CosmosSignTx>): Promise<string> {
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
    tx: chainAdapters.BuildSendTxInput<ChainTypes.Cosmos>
  ): Promise<{ txToSign: CosmosSignTx }> {
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

      if (!to) throw new Error('CosmosChainAdapter: to is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })

      const account = await this.getAccount(from)

      if (sendMax) {
        try {
          const val = bnOrZero(account.balance).minus(gas)
          if (val.isFinite() || val.lte(0)) {
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
              denom: 'uatom'
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
                  denom: 'uatom'
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

      const txToSign: CosmosSignTx = {
        addressNList,
        tx: utx,
        chain_id: caip2.ChainReference.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildDelegateTransaction(
    tx: chainAdapters.BuildDelegateTxInput<ChainTypes.Cosmos>
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = ''
      } = tx
      if (!validator) throw new Error('CosmosChainAdapter: validator is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid validator address ${validator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom'
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
                denom: 'uatom'
              },
              delegator_address: from,
              validator_address: validator
            }
          }
        ],
        signatures: [],
        memo
      }

      const txToSign: CosmosSignTx = {
        addressNList,
        tx: utx,
        chain_id: caip2.ChainReference.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildUndelegateTransaction(
    tx: chainAdapters.BuildUndelegateTxInput<ChainTypes.Cosmos>
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        value,
        memo = ''
      } = tx
      if (!validator) throw new Error('CosmosChainAdapter: validator is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid validator address ${validator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom'
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
                denom: 'uatom'
              },
              delegator_address: from,
              validator_address: validator
            }
          }
        ],
        signatures: [],
        memo
      }
      const txToSign: CosmosSignTx = {
        addressNList,
        tx: utx,
        chain_id: caip2.ChainReference.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildClaimRewardsTransaction(
    tx: chainAdapters.BuildClaimRewardsTxInput<ChainTypes.Cosmos>
  ): Promise<{ txToSign: CosmosSignTx }> {
    try {
      const {
        validator,
        wallet,
        bip44Params = CosmosSdkBaseAdapter.defaultBIP44Params,
        chainSpecific: { gas, fee },
        memo = ''
      } = tx
      if (!validator) throw new Error('CosmosChainAdapter: validator is required')
      const { prefix } = bech32.decode(validator)
      const chain = this.getType()
      if (this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== prefix)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid validator address ${validator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom'
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
      const txToSign: CosmosSignTx = {
        addressNList,
        tx: utx,
        chain_id: caip2.ChainReference.CosmosHubMainnet,
        account_number: account.chainSpecific.accountNumber,
        sequence: account.chainSpecific.sequence
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildRedelegateTransaction(
    tx: chainAdapters.BuildRedelegateTxInput<ChainTypes.Cosmos>
  ): Promise<{ txToSign: CosmosSignTx }> {
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
      if (!toValidator) throw new Error('CosmosChainAdapter: toValidator is required')
      if (!fromValidator) throw new Error('CosmosChainAdapter: fromValidator is required')
      if (!value) throw new Error('CosmosChainAdapter: value is required')
      const { prefix: toPrefix } = bech32.decode(toValidator)
      const { prefix: fromPrefix } = bech32.decode(fromValidator)
      const chain = this.getType()
      if (
        this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== toPrefix ||
        this.CHAIN_VALIDATOR_PREFIX_MAPPING[chain] !== fromPrefix
      )
        throw new Error(
          `CosmosChainAdapter:buildDelegateTransaction invalid toValidator or fromValidator address ${toValidator} ${fromValidator}`
        )

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })
      const { valid } = await super.validateAddress(from)
      if (!valid)
        throw new Error(
          `CosmosChainAdapter:buildRedelegateTransaction invalid delegator address ${from}`
        )

      const account = await this.getAccount(from)

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom'
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
                denom: 'uatom'
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

      const txToSign: CosmosSignTx = {
        addressNList,
        tx: utx,
        chain_id: caip2.ChainReference.CosmosHubMainnet,
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
  }: Partial<chainAdapters.GetFeeDataInput<ChainTypes.Cosmos>>): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes.Cosmos>
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
    signTxInput: chainAdapters.SignTxInput<CosmosSignTx>
  ): Promise<string> {
    const { wallet } = signTxInput
    try {
      if (supportsCosmos(wallet)) {
        const signedTx = await this.signTransaction(signTxInput)
        const { data } = await this.providers.http.sendTx({ body: { rawTx: signedTx } })
        return data
      } else {
        throw new Error('Wallet does not support Cosmos.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }
}
