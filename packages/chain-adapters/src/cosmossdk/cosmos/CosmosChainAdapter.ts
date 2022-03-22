import { caip2 } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  CosmosSignTx,
  CosmosTx,
  supportsCosmos
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapter as IChainAdapter } from '../../api'
import { ErrorHandler } from '../../error/ErrorHandler'
import { bnOrZero, toPath } from '../../utils'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'

export class ChainAdapter
  extends CosmosSdkBaseAdapter<ChainTypes.Cosmos>
  implements IChainAdapter<ChainTypes.Cosmos>
{
  protected readonly supportedChainIds = ['cosmos:cosmoshub-4', 'cosmos:vega-testnet']
  protected readonly chainId = this.supportedChainIds[0]
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: 118,
    accountNumber: 0
  }

  constructor(args: ChainAdapterArgs) {
    super(args)

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
        tx.value = bnOrZero(account.balance).minus(gas).toString()
      }

      const utx: CosmosTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'uatom'
            }
          ],
          gas: gas
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
