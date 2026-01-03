import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_REFERENCE,
  fromChainId,
  generateAssetIdFromCosmosSdkDenom,
  mayachainAssetId,
} from '@shapeshiftoss/caip'
import type { HDWallet, MayachainSignTx, MayachainWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsMayachain } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { bech32 } from 'bech32'

import type { ChainAdapter as IChainAdapter } from '../../api'
import { ChainAdapterError, ErrorHandler } from '../../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildDepositTxInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBip44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION, ValidAddressResultType } from '../../types'
import { toAddressNList, verifyLedgerAppOpen } from '../../utils'
import { bnOrZero } from '../../utils/bignumber'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import type {
  BuildTransactionInput,
  CosmosSDKToken,
  MayachainMsgDeposit,
  MayachainMsgSend,
} from '../types'
import { MayachainMessageType } from '../types'

const NATIVE_FEE = '2000000000'

export type SecondClassMayachainAdapterArgs = {
  nodeUrl: string
  midgardUrl: string
}

export class SecondClassMayachainAdapter implements IChainAdapter<KnownChainIds.MayachainMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Mayachain),
    accountNumber: 0,
  }

  protected readonly nodeUrl: string
  protected readonly midgardUrl: string
  protected readonly assetId: AssetId = mayachainAssetId
  protected readonly chainId = KnownChainIds.MayachainMainnet
  protected readonly denom = 'cacao'

  constructor(args: SecondClassMayachainAdapterArgs) {
    this.nodeUrl = args.nodeUrl
    this.midgardUrl = args.midgardUrl
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

  getChainId() {
    return this.chainId
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return {
      ...SecondClassMayachainAdapter.rootBip44Params,
      accountNumber,
      isChange: false,
      addressIndex: 0,
    }
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

  // eslint-disable-next-line require-await
  async validateAddress(address: string): Promise<ValidAddressResult> {
    const MAYACHAIN_PREFIX = 'maya'

    try {
      const decoded = bech32.decode(address)
      if (decoded.prefix !== MAYACHAIN_PREFIX) {
        return { valid: false, result: ValidAddressResultType.Invalid }
      }

      return { valid: true, result: ValidAddressResultType.Valid }
    } catch {
      return { valid: false, result: ValidAddressResultType.Invalid }
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

      const assets = balanceData.balances.reduce<CosmosSDKToken[]>((acc, b) => {
        if (b.denom === this.denom) return acc
        try {
          acc.push({
            amount: b.amount,
            assetId: generateAssetIdFromCosmosSdkDenom(b.denom),
          })
        } catch {}
        return acc
      }, [])

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

  protected getAmount({
    account,
    value,
    fee,
    sendMax,
  }: {
    account: Account<KnownChainIds.MayachainMainnet>
    value: string
    fee: string
    sendMax?: boolean
  }) {
    if (!sendMax) return value

    const availableBalance = bnOrZero(account.balance).minus(fee)

    if (!availableBalance.isFinite() || availableBalance.lte(0)) {
      throw new Error(`not enough balance to send: ${availableBalance.toString()}`)
    }

    return availableBalance.toString()
  }

  protected buildTransaction(input: BuildTransactionInput<KnownChainIds.MayachainMainnet>): {
    txToSign: MayachainSignTx
  } {
    const { account, accountNumber, msg, memo = '', chainSpecific } = input
    const { gas, fee } = chainSpecific

    const bip44Params = this.getBip44Params({ accountNumber })

    const unsignedTx = {
      fee: { amount: [{ amount: bnOrZero(fee).toString(), denom: this.denom }], gas },
      msg: [msg],
      signatures: [],
      memo,
    }

    const txToSign = {
      addressNList: toAddressNList(bip44Params),
      tx: unsignedTx,
      chain_id: fromChainId(this.getType()).chainReference,
      account_number: account.chainSpecific.accountNumber,
      sequence: account.chainSpecific.sequence,
    } as unknown as MayachainSignTx

    return { txToSign }
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

      return this.buildTransaction(tx)
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

      return this.buildTransaction(tx)
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

  getTxHistory(_input: TxHistoryInput): Promise<TxHistoryResponse> {
    return Promise.resolve({
      cursor: '',
      pubkey: _input.pubkey,
      transactions: [],
      txIds: [],
    })
  }

  subscribeTxs(
    _input: SubscribeTxsInput,
    _onMessage: (msg: Transaction) => void,
    _onError: (err: SubscribeError) => void,
  ): Promise<void> {
    return Promise.resolve()
  }

  unsubscribeTxs(_input?: SubscribeTxsInput): void {
    return
  }

  closeTxs(): void {
    return
  }

  async parseTx(txHash: unknown, pubkey: string): Promise<Transaction> {
    const hash = txHash as string

    const getAssetIdFromDenom = (denom: string): AssetId => {
      const normalizedDenom = denom.toLowerCase().replace('maya.', '')
      if (normalizedDenom === this.denom) return this.assetId
      try {
        return generateAssetIdFromCosmosSdkDenom(normalizedDenom)
      } catch {
        return this.assetId
      }
    }

    const response = await fetch(`${this.nodeUrl}/cosmos/tx/v1beta1/txs/${hash}`)

    if (response.ok) {
      const data = (await response.json()) as {
        tx_response: {
          txhash: string
          height: string
          code: number
          timestamp: string
          tx: {
            body: {
              messages: {
                '@type': string
                from_address?: string
                to_address?: string
                amount?: { denom: string; amount: string }[]
                coins?: { asset: string; amount: string }[]
                memo?: string
                signer?: string
              }[]
              memo?: string
            }
          }
        }
      }

      const txResponse = data.tx_response
      const messages = txResponse.tx.body.messages
      const status = txResponse.code === 0 ? TxStatus.Confirmed : TxStatus.Failed
      const blockHeight = parseInt(txResponse.height, 10)
      const blockTime = Math.floor(new Date(txResponse.timestamp).getTime() / 1000)

      const transfers: Transaction['transfers'] = []

      for (const msg of messages) {
        if (msg['@type'] === '/types.MsgSend' && msg.from_address && msg.to_address && msg.amount) {
          for (const coin of msg.amount) {
            const isSend = msg.from_address.toLowerCase() === pubkey.toLowerCase()
            const isReceive = msg.to_address.toLowerCase() === pubkey.toLowerCase()

            if (isSend || isReceive) {
              transfers.push({
                assetId: getAssetIdFromDenom(coin.denom),
                from: [msg.from_address],
                to: [msg.to_address],
                type: isSend ? TransferType.Send : TransferType.Receive,
                value: coin.amount,
              })
            }
          }
        } else if (msg['@type'] === '/types.MsgDeposit' && msg.signer && msg.coins) {
          for (const coin of msg.coins) {
            const isSigner = msg.signer.toLowerCase() === pubkey.toLowerCase()
            if (isSigner) {
              transfers.push({
                assetId: getAssetIdFromDenom(coin.asset),
                from: [msg.signer],
                to: [msg.signer],
                type: TransferType.Send,
                value: coin.amount,
              })
            }
          }
        }
      }

      return {
        txid: txResponse.txhash,
        blockHash: '',
        blockHeight,
        blockTime,
        confirmations: 1,
        status,
        chainId: this.chainId,
        pubkey,
        transfers,
        data: txResponse.tx.body.memo
          ? { parser: 'mayachain' as const, memo: txResponse.tx.body.memo }
          : undefined,
      }
    }

    // Cosmos endpoint doesn't work for some txs, fall back to midgard
    const midgardResponse = await fetch(`${this.midgardUrl}/actions?txid=${hash}`)

    if (!midgardResponse.ok) {
      throw new Error(
        `Failed to fetch transaction: ${midgardResponse.status} ${midgardResponse.statusText}`,
      )
    }

    const midgardData = (await midgardResponse.json()) as {
      actions: {
        date: string
        height: string
        status: string
        type: string
        in: { address: string; coins: { amount: string; asset: string }[]; txID: string }[]
        out: { address: string; coins: { amount: string; asset: string }[]; txID: string }[]
        metadata?: { send?: { memo?: string }; swap?: { memo?: string } }
      }[]
    }

    if (!midgardData.actions?.length) {
      throw new Error(`Transaction not found: ${hash}`)
    }

    const action = midgardData.actions[0]
    const status = action.status === 'success' ? TxStatus.Confirmed : TxStatus.Failed
    const blockHeight = parseInt(action.height, 10)
    const blockTime = Math.floor(parseInt(action.date, 10) / 1_000_000_000)

    const transfers: Transaction['transfers'] = []

    for (const input of action.in) {
      for (const coin of input.coins) {
        const isSend = input.address.toLowerCase() === pubkey.toLowerCase()
        if (isSend) {
          transfers.push({
            assetId: getAssetIdFromDenom(coin.asset),
            from: [input.address],
            to: [action.out[0]?.address ?? input.address],
            type: TransferType.Send,
            value: coin.amount,
          })
        }
      }
    }

    for (const output of action.out) {
      for (const coin of output.coins) {
        const isReceive = output.address.toLowerCase() === pubkey.toLowerCase()
        const alreadyAdded = transfers.some(
          t => t.type === TransferType.Send && t.to.includes(output.address),
        )
        if (isReceive && !alreadyAdded) {
          transfers.push({
            assetId: getAssetIdFromDenom(coin.asset),
            from: [action.in[0]?.address ?? output.address],
            to: [output.address],
            type: TransferType.Receive,
            value: coin.amount,
          })
        }
      }
    }

    const memo = action.metadata?.send?.memo ?? action.metadata?.swap?.memo

    return {
      txid: hash,
      blockHash: '',
      blockHeight,
      blockTime,
      confirmations: 1,
      status,
      chainId: this.chainId,
      pubkey,
      transfers,
      data: memo ? { parser: 'mayachain' as const, memo } : undefined,
    }
  }
}
