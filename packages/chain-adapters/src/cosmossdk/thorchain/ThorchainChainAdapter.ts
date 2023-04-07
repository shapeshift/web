import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThorchainSignTx } from '@shapeshiftoss/hdwallet-core'
import { supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ErrorHandler } from '../../error/ErrorHandler'
import type {
  BuildDepositTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignTxInput,
} from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { toAddressNList } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import type { ChainAdapterArgs } from '../CosmosSdkBaseAdapter'
import { CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'
import type { Message } from '../types'

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
      assetId: thorchainAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      denom: 'rune',
      parser: new unchained.thorchain.TransactionParser({
        assetId: thorchainAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Thorchain
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Thorchain,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.ThorchainMainnet {
    return KnownChainIds.ThorchainMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, accountNumber, showOnDevice = false } = input
    const bip44Params = this.getBIP44Params({ accountNumber })

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
        accountNumber,
        chainSpecific: { fee },
        sendMax,
        to,
        value,
        wallet,
      } = tx

      const from = await this.getAddress({ accountNumber, wallet })
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
      const { accountNumber, wallet, value, memo } = tx

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)
      // https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
      const msg: Message = {
        type: 'thorchain/MsgDeposit',
        value: {
          coins: [{ asset: 'THOR.RUNE', amount: bnOrZero(value).toString() }],
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

  // eslint-disable-next-line require-await
  async getFeeData(
    _: Partial<GetFeeDataInput<KnownChainIds.ThorchainMainnet>>,
  ): Promise<FeeDataEstimate<KnownChainIds.ThorchainMainnet>> {
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
