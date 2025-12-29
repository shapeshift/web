import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_REFERENCE,
  generateAssetIdFromCosmosSdkDenom,
  mayachainAssetId,
} from '@shapeshiftoss/caip'
import type { HDWallet, MayachainSignTx, MayachainWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsMayachain } from '@shapeshiftoss/hdwallet-core'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterError, ErrorHandler } from '../../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildDepositTxInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTxInput,
} from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION } from '../../types'
import { toAddressNList, verifyLedgerAppOpen } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../CosmosSdkBaseAdapter'
import { CosmosSdkBaseAdapter, Denoms } from '../CosmosSdkBaseAdapter'
import type { MayachainMsgDeposit, MayachainMsgSend } from '../types'
import { MayachainMessageType } from '../types'

// static automatic native fee as defined by: https://api.mayachain.shapeshift.com/lcd/mayachain/constants
export const NATIVE_FEE = '2000000000'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.MayachainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.MayachainMainnet

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.mayachain.V1Api> {
  midgardUrl: string
  nodeUrl: string
}

export class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.MayachainMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Mayachain),
    accountNumber: 0,
  }

  protected readonly nodeUrl: string

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: mayachainAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      denom: Denoms.cacao,
      parser: new unchained.mayachain.TransactionParser({
        assetId: mayachainAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        midgardUrl: args.midgardUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.nodeUrl = args.nodeUrl
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is MayachainWallet {
    if (!supportsMayachain(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Mayachain
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Mayachain,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.MayachainMainnet {
    return KnownChainIds.MayachainMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { wallet, accountNumber, pubKey, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const bip44Params = this.getBip44Params({ accountNumber })
      const address = await wallet.mayachainGetAddress({
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

  async signTransaction(signTxInput: SignTxInput<MayachainSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.mayachainSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.MayachainMainnet>,
  ): Promise<{ txToSign: MayachainSignTx }> {
    try {
      const { sendMax, to, value, from } = input

      const account = await this.getAccount(from)
      const amount = this.getAmount({ account, value, fee: NATIVE_FEE, sendMax })

      const msg: MayachainMsgSend = {
        type: MayachainMessageType.MsgSend,
        value: {
          amount: [{ amount, denom: this.denom }],
          from_address: from,
          to_address: to,
        },
      }

      const tx = Object.assign(input, {
        account,
        msg,
        chainSpecific: { ...input.chainSpecific, fee: '0' },
      })

      return this.buildTransaction<KnownChainIds.MayachainMainnet>(tx)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(
    input: BuildSendTxInput<KnownChainIds.MayachainMainnet>,
  ): Promise<{ txToSign: MayachainSignTx }> {
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

  async buildDepositTransaction(
    input: BuildDepositTxInput<KnownChainIds.MayachainMainnet>,
  ): Promise<{ txToSign: MayachainSignTx }> {
    try {
      const { from, value, memo } = input

      const account = await this.getAccount(from)

      const msg: MayachainMsgDeposit = {
        type: MayachainMessageType.MsgDeposit,
        value: {
          coins: [{ asset: 'MAYA.CACAO', amount: bnOrZero(value).toString() }],
          memo,
          signer: from,
        },
      }

      const tx = Object.assign(input, {
        account,
        msg,
        chainSpecific: { ...input.chainSpecific, fee: '0' },
      })

      return this.buildTransaction<KnownChainIds.MayachainMainnet>(tx)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  // eslint-disable-next-line require-await
  async getFeeData(
    _: Partial<GetFeeDataInput<KnownChainIds.MayachainMainnet>>,
  ): Promise<FeeDataEstimate<KnownChainIds.MayachainMainnet>> {
    return {
      fast: { txFee: NATIVE_FEE, chainSpecific: { gasLimit: '500000' } },
      average: { txFee: NATIVE_FEE, chainSpecific: { gasLimit: '500000' } },
      slow: { txFee: NATIVE_FEE, chainSpecific: { gasLimit: '500000' } },
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.MayachainMainnet>): Promise<string> {
    try {
      const { wallet } = signTxInput

      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      if (!wallet) throw new Error('wallet is required')
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

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.MayachainMainnet>> {
    try {
      const [authRes, balanceRes] = await Promise.all([
        fetch(`${this.nodeUrl}/cosmos/auth/v1beta1/accounts/${pubkey}`),
        fetch(`${this.nodeUrl}/cosmos/bank/v1beta1/balances/${pubkey}`),
      ])

      if (!authRes.ok) {
        throw new Error(`Failed to fetch account: ${authRes.status} ${authRes.statusText}`)
      }
      if (!balanceRes.ok) {
        throw new Error(`Failed to fetch balances: ${balanceRes.status} ${balanceRes.statusText}`)
      }

      const authData = (await authRes.json()) as {
        account: { account_number: string; sequence: string; pub_key?: { key: string } }
      }
      const balanceData = (await balanceRes.json()) as {
        balances: { denom: string; amount: string }[]
      }

      const assets = balanceData.balances.reduce<{ amount: string; assetId: AssetId }[]>(
        (acc, b) => {
          if (b.denom === this.denom) return acc
          try {
            acc.push({
              amount: b.amount,
              assetId: generateAssetIdFromCosmosSdkDenom(b.denom),
            })
          } catch {}
          return acc
        },
        [],
      )

      const nativeBalance = balanceData.balances.find(b => b.denom === this.denom)?.amount ?? '0'

      return {
        balance: nativeBalance,
        pubkey,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          accountNumber: authData.account.account_number,
          sequence: authData.account.sequence,
          assets,
          delegations: [],
          redelegations: [],
          undelegations: [],
          rewards: [],
        },
      } as Account<KnownChainIds.MayachainMainnet>
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const response = await fetch(`${this.nodeUrl}/cosmos/tx/v1beta1/txs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_bytes: hex,
          mode: 'BROADCAST_MODE_SYNC',
        }),
      })

      const data = (await response.json()) as {
        tx_response?: { code: number; txhash: string; raw_log?: string }
      }

      if (data.tx_response?.code !== 0) {
        throw new Error(data.tx_response?.raw_log || 'Broadcast failed')
      }

      return data.tx_response.txhash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }
}
