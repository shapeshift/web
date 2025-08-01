import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, thorchainAssetId } from '@shapeshiftoss/caip'
import type { HDWallet, ThorchainSignTx, ThorchainWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'
import PQueue from 'p-queue'

import { ChainAdapterError, ErrorHandler } from '../../error/ErrorHandler'
import type {
  BuildDepositTxInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTxInput,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION, ValidAddressResultType } from '../../types'
import { toAddressNList, verifyLedgerAppOpen } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../CosmosSdkBaseAdapter'
import { CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'
import type { ThorchainMsgDeposit, ThorchainMsgSend, ThorSupportedCoin } from '../types'
import { ThorchainMessageType } from '../types'

// https://dev.thorchain.org/thorchain-dev/interface-guide/fees#thorchain-native-rune
// static automatic native fee as defined by: https://daemon.thorchain.shapeshift.com/lcd/thorchain/constants
export const NATIVE_FEE = '2000000'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ThorchainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ThorchainMainnet

const calculateFee = (fee: string): string => {
  // 0.02 RUNE is automatically charged on transactions
  // the returned amount is the difference of any additional fee over the default 0.02 RUNE (ie. tx.fee >= 2000001)
  const feeMinusAutomaticOutboundFee = bnOrZero(fee).minus(NATIVE_FEE)
  return feeMinusAutomaticOutboundFee.gt(0) ? feeMinusAutomaticOutboundFee.toString() : '0'
}

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.thorchain.V1Api> {
  thorMidgardUrl: string
  mayaMidgardUrl: string
  httpV1: unchained.thorchainV1.V1Api
}

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.ThorchainMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Thorchain),
    accountNumber: 0,
  }

  protected readonly httpV1: unchained.thorchainV1.V1Api

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: thorchainAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      denom: 'rune',
      parser: new unchained.thorchain.TransactionParser({
        assetId: thorchainAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        thorMidgardUrl: args.thorMidgardUrl,
        mayaMidgardUrl: args.mayaMidgardUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.httpV1 = args.httpV1
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is ThorchainWallet {
    if (!supportsThorchain(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
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
    try {
      const { wallet, accountNumber, pubKey, showOnDevice = false } = input

      if (pubKey) return pubKey

      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const bip44Params = this.getBip44Params({ accountNumber })
      const address = await wallet.thorchainGetAddress({
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

  // eslint-disable-next-line require-await
  async validateAddress(address: string): Promise<ValidAddressResult> {
    const THORCHAIN_PREFIX = 'thor'

    try {
      const decoded = bech32.decode(address)
      if (decoded.prefix !== THORCHAIN_PREFIX) {
        return { valid: false, result: ValidAddressResultType.Invalid }
      }

      const wordsLength = decoded.words.length
      if (wordsLength !== 32) {
        return { valid: false, result: ValidAddressResultType.Invalid }
      }
      return { valid: true, result: ValidAddressResultType.Valid }
    } catch (e) {
      return { valid: false, result: ValidAddressResultType.Invalid }
    }
  }

  async getTxHistoryV1(input: TxHistoryInput): Promise<TxHistoryResponse> {
    try {
      const requestQueue = input.requestQueue ?? new PQueue()

      const data = await requestQueue.add(() =>
        this.httpV1.getTxHistory({
          pubkey: input.pubkey,
          pageSize: input.pageSize,
          cursor: input.cursor,
        }),
      )

      const txs = await Promise.all(
        data.txs.map(tx => requestQueue.add(() => this.parseTx(tx, input.pubkey))),
      )

      return {
        cursor: data.cursor,
        pubkey: input.pubkey,
        transactions: txs,
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signTransaction(signTxInput: SignTxInput<ThorchainSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.thorchainSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.ThorchainMainnet>,
  ): Promise<{ txToSign: ThorchainSignTx }> {
    try {
      const { sendMax, to, value, from, chainSpecific } = input
      const { coin = 'THOR.RUNE', fee } = chainSpecific

      if (coin !== 'THOR.RUNE' && coin !== 'THOR.TCY' && coin !== 'THOR.RUJI')
        throw new Error('unsupported coin type')

      if (!fee) throw new Error('fee is required')

      const account = await this.getAccount(from)
      // Never deduct value for native, non-fee assets. Max-send fees deduction only apply to fee asset i.e THOR.RUNE here
      // THOR.TCY is a native asset, but not a fee asset, for all intents and purposes it's a token
      const amount = coin === 'THOR.RUNE' ? this.getAmount({ account, value, fee, sendMax }) : value

      const denom = (() => {
        if (coin === 'THOR.TCY') return 'tcy'
        if (coin === 'THOR.RUJI') return 'x/ruji'
        return this.denom
      })()

      const msg: ThorchainMsgSend = {
        type: ThorchainMessageType.MsgSend,
        value: {
          amount: [{ amount, denom }],
          from_address: from,
          to_address: to,
        },
      }

      const tx = Object.assign(input, {
        account,
        msg,
        chainSpecific: { ...input.chainSpecific, fee: calculateFee(fee) },
      })

      return this.buildTransaction<KnownChainIds.ThorchainMainnet>(tx)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(
    input: BuildSendTxInput<KnownChainIds.ThorchainMainnet>,
  ): Promise<{ txToSign: ThorchainSignTx }> {
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

  /* MsgDeposit is used for thorchain swap/lp/repayment operations */
  async buildDepositTransaction(
    input: BuildDepositTxInput<KnownChainIds.ThorchainMainnet>,
  ): Promise<{ txToSign: ThorchainSignTx }> {
    try {
      const { from, value, memo, chainSpecific } = input
      const { fee, coin = 'THOR.RUNE' } = chainSpecific

      if (!['THOR.TCY', 'THOR.RUJI', 'THOR.RUNE'].includes(coin))
        throw new Error('unsupported coin type')

      if (!fee) throw new Error('fee is required')

      const account = await this.getAccount(from)

      // https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
      const msg: ThorchainMsgDeposit = {
        type: ThorchainMessageType.MsgDeposit,
        value: {
          coins: [{ asset: coin as ThorSupportedCoin, amount: bnOrZero(value).toString() }],
          memo,
          signer: from,
        },
      }

      const tx = Object.assign(input, {
        account,
        msg,
        chainSpecific: { ...input.chainSpecific, fee: calculateFee(fee) },
      })

      return this.buildTransaction<KnownChainIds.ThorchainMainnet>(tx)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  // eslint-disable-next-line require-await
  async getFeeData(
    _: Partial<GetFeeDataInput<KnownChainIds.ThorchainMainnet>>,
  ): Promise<FeeDataEstimate<KnownChainIds.ThorchainMainnet>> {
    return {
      fast: { txFee: NATIVE_FEE, chainSpecific: { gasLimit: '500000000' } },
      average: { txFee: NATIVE_FEE, chainSpecific: { gasLimit: '500000000' } },
      slow: { txFee: NATIVE_FEE, chainSpecific: { gasLimit: '500000000' } },
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.ThorchainMainnet>): Promise<string> {
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
