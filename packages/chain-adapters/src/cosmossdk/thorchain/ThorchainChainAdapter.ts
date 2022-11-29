import { ASSET_REFERENCE, AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { supportsThorchain, ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ErrorHandler } from '../../error/ErrorHandler'
import {
  BuildDepositTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignTxInput,
} from '../../types'
import { toAddressNList } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'
import { ChainAdapterName, Message } from '../types'

// https://dev.thorchain.org/thorchain-dev/interface-guide/fees#thorchain-native-rune
// static automatic outbound fee as defined by: https://thornode.ninerealms.com/thorchain/constants
const OUTBOUND_FEE = '2000000'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ThorchainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ThorchainMainnet

const calculateFee = (fee: string): string => {
  // 0.02 RUNE is automatically charged on outbound transactions
  // the returned is the difference of any additional fee over the default 0.02 RUNE (ie. tx.fee >= 2000001)
  const feeMinusAutomaticOutboundFee = bnOrZero(fee).minus(OUTBOUND_FEE)
  return feeMinusAutomaticOutboundFee.gt(0) ? feeMinusAutomaticOutboundFee.toString() : '0'
}

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.ThorchainMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Thorchain),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      denom: 'rune',
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.assetId = thorchainAssetId
    this.parser = new unchained.thorchain.TransactionParser({ chainId: this.chainId })
  }

  getDisplayName() {
    return ChainAdapterName.Thorchain
  }

  getType(): KnownChainIds.ThorchainMainnet {
    return KnownChainIds.ThorchainMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, bip44Params, showOnDevice = false } = input

    if (!bip44Params) {
      throw new Error('bip44Params required in getAddress input')
    }

    try {
      if (supportsThorchain(wallet)) {
        const address = await wallet.thorchainGetAddress({
          addressNList: toAddressNList(bip44Params),
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
        throw new Error('Wallet does not support Thorchain.')
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
        bip44Params,
        chainSpecific: { fee },
        sendMax,
        to,
        value,
        wallet,
      } = tx

      const from = await this.getAddress({ bip44Params, wallet })
      const account = await this.getAccount(from)
      const amount = this.getAmount({ account, value, fee, sendMax })

      const msg: Message = {
        type: 'thorchain/MsgSend',
        value: {
          amount: [{ amount, denom: this.denom }],
          from_address: from,
          to_address: to,
        },
      }

      tx.chainSpecific.fee = calculateFee(tx.chainSpecific.fee)

      return this.buildTransaction<KnownChainIds.ThorchainMainnet>({ ...tx, account, msg })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  /* MsgDeposit is used for thorchain swap/lp operations */
  async buildDepositTransaction(
    tx: BuildDepositTxInput<KnownChainIds.ThorchainMainnet>,
  ): Promise<{ txToSign: ThorchainSignTx }> {
    try {
      // TODO memo validation
      const { wallet, bip44Params, value, memo } = tx

      const from = await this.getAddress({ bip44Params, wallet })
      const account = await this.getAccount(from)

      const msg: Message = {
        type: 'thorchain/MsgDeposit',
        value: {
          coins: [{ asset: 'rune', amount: bnOrZero(value).toString() }],
          memo,
          signer: from,
        },
      }

      tx.chainSpecific.fee = calculateFee(tx.chainSpecific.fee)

      return this.buildTransaction<KnownChainIds.ThorchainMainnet>({ ...tx, account, msg })
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
    return {
      fast: { txFee: OUTBOUND_FEE, chainSpecific: { gasLimit: '500000000' } },
      average: { txFee: OUTBOUND_FEE, chainSpecific: { gasLimit: '500000000' } },
      slow: { txFee: OUTBOUND_FEE, chainSpecific: { gasLimit: '500000000' } },
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<ThorchainSignTx>): Promise<string> {
    const { wallet } = signTxInput
    try {
      if (supportsThorchain(wallet)) {
        const signedTx = await this.signTransaction(signTxInput)
        return this.providers.http.sendTx({ body: { rawTx: signedTx } })
      } else {
        throw new Error('Wallet does not support Thorchain.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }
}
