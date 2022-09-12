import { ASSET_REFERENCE, AssetId, CHAIN_REFERENCE, thorchainAssetId } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  supportsThorchain,
  ThorchainSignTx,
  ThorchainTx,
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ErrorHandler } from '../../error/ErrorHandler'
import {
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignTxInput,
} from '../../types'
import { toPath } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ThorchainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ThorchainMainnet

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.ThorchainMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Thorchain),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.assetId = thorchainAssetId
    this.parser = new unchained.thorchain.TransactionParser({ chainId: this.chainId })
  }

  getDisplayName() {
    return 'Thorchain'
  }

  getType(): KnownChainIds.ThorchainMainnet {
    return KnownChainIds.ThorchainMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, bip44Params = this.defaultBIP44Params, showOnDevice = false } = input
    const path = toPath(bip44Params)
    const addressNList = bip32ToAddressNList(path)

    try {
      if (supportsThorchain(wallet)) {
        const address = await wallet.thorchainGetAddress({
          addressNList,
          showDisplay: showOnDevice,
        })
        if (!address) {
          throw new Error('Unable to generate Thorchain address.')
        }
        return address
      } else {
        throw new Error('Wallet does not support Thorchain.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }

  async signTransaction(signTxInput: SignTxInput<ThorchainSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      if (supportsThorchain(wallet)) {
        const signedTx = await wallet.thorchainSignTx(txToSign)

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
    tx: BuildSendTxInput<KnownChainIds.ThorchainMainnet>,
  ): Promise<{ txToSign: ThorchainSignTx }> {
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

      if (!to) throw new Error('ThorchainChainAdapter: to is required')
      if (!value) throw new Error('ThorchainChainAdapter: value is required')

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)
      const from = await this.getAddress({ bip44Params, wallet })

      const account = await this.getAccount(from)

      if (sendMax) {
        try {
          const val = bnOrZero(account.balance).minus(gas)
          if (val.isFinite() || val.lte(0)) {
            throw new Error(
              `ThorchainChainAdapter: transaction value is invalid: ${val.toString()}`,
            )
          }
          tx.value = val.toString()
        } catch (error) {
          return ErrorHandler(error)
        }
      }

      const utx: ThorchainTx = {
        fee: {
          amount: [
            {
              amount: bnOrZero(fee).toString(),
              denom: 'rune',
            },
          ],
          gas,
        },
        msg: [
          {
            type: 'thorchain/MsgSend',
            value: {
              amount: [
                {
                  amount: bnOrZero(value).toString(),
                  denom: 'rune',
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

      const txToSign: ThorchainSignTx = {
        addressNList,
        tx: utx,
        chain_id: CHAIN_REFERENCE.ThorchainMainnet,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendMax,
  }: Partial<GetFeeDataInput<KnownChainIds.ThorchainMainnet>>): Promise<
    FeeDataEstimate<KnownChainIds.ThorchainMainnet>
  > {
    // static fee as defined by: https://daemon.thorchain.shapeshift.com/thorchain/constants
    return {
      fast: { txFee: '2000000', chainSpecific: { gasLimit: '500000000' } },
      average: { txFee: '2000000', chainSpecific: { gasLimit: '500000000' } },
      slow: { txFee: '2000000', chainSpecific: { gasLimit: '500000000' } },
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<ThorchainSignTx>): Promise<string> {
    const { wallet } = signTxInput
    try {
      if (supportsThorchain(wallet)) {
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
