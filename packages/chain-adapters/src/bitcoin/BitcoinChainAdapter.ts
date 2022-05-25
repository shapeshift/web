import {
  ASSET_REFERENCE,
  AssetId,
  CHAIN_NAMESPACE,
  ChainId,
  fromChainId,
  toAssetId
} from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  BTCOutputAddressType,
  BTCSignTx,
  BTCSignTxInput,
  BTCSignTxOutput,
  supportsBTC
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import coinSelect from 'coinselect'
import split from 'coinselect/split'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  getStatus,
  getType,
  toPath,
  toRootDerivationPath
} from '../utils'
import { ChainAdapterArgs, UTXOBaseAdapter } from '../utxo/UTXOBaseAdapter'

export class ChainAdapter
  extends UTXOBaseAdapter<ChainTypes.Bitcoin>
  implements IChainAdapter<ChainTypes.Bitcoin>
{
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 84, // segwit native
    coinType: 0,
    accountNumber: 0
  }
  public static readonly defaultUtxoAccountType: UtxoAccountType = UtxoAccountType.SegwitNative

  private static readonly supportedAccountTypes: UtxoAccountType[] = [
    UtxoAccountType.SegwitNative,
    UtxoAccountType.SegwitP2sh,
    UtxoAccountType.P2pkh
  ]

  protected readonly supportedChainIds: ChainId[] = [
    'bip122:000000000019d6689c085ae165831e93',
    'bip122:000000000933ea01ad0ee984209779ba'
  ]
  chainId = this.supportedChainIds[0]

  constructor(args: ChainAdapterArgs) {
    super(args)
    if (args.chainId && !this.supportedChainIds.includes(args.chainId))
      throw new Error(`Bitcoin chainId ${args.chainId} not supported`)
    if (args.chainId) {
      this.chainId = args.chainId
    } else {
      this.chainId = this.supportedChainIds[0]
    }

    const chainId = this.chainId
    const { chainNamespace } = fromChainId(chainId)
    if (chainNamespace !== CHAIN_NAMESPACE.Bitcoin) {
      throw new Error('chainId must be a bitcoin chain type')
    }
    this.coinName = args.coinName
    this.assetId = toAssetId({
      chainId,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Bitcoin
    })
  }

  getType(): ChainTypes.Bitcoin {
    return ChainTypes.Bitcoin
  }

  getFeeAssetId(): AssetId {
    return 'bip122:000000000019d6689c085ae165831e93/slip44:0'
  }

  getSupportedAccountTypes() {
    return ChainAdapter.supportedAccountTypes
  }

  async getTxHistory(
    // @ts-ignore: keep type signature with unimplemented state
    input: chainAdapters.TxHistoryInput // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<chainAdapters.TxHistoryResponse<ChainTypes.Bitcoin>> {
    throw new Error('Method not implemented.')
  }

  async buildSendTransaction(tx: chainAdapters.BuildSendTxInput<ChainTypes.Bitcoin>): Promise<{
    txToSign: chainAdapters.ChainTxType<ChainTypes.Bitcoin>
  }> {
    try {
      const {
        value,
        to,
        wallet,
        bip44Params = ChainAdapter.defaultBIP44Params,
        chainSpecific: { satoshiPerByte, accountType },
        sendMax = false
      } = tx

      if (!value || !to) {
        throw new Error('BitcoinChainAdapter: (to and value) are required')
      }

      const path = toRootDerivationPath(bip44Params)
      const pubkey = await this.getPublicKey(wallet, bip44Params, accountType)
      const { data: utxos } = await this.providers.http.getUtxos({
        pubkey: pubkey.xpub
      })

      if (!supportsBTC(wallet))
        throw new Error(
          'BitcoinChainAdapter: signTransaction wallet does not support signing btc txs'
        )

      const account = await this.getAccount(pubkey.xpub)

      type MappedUtxos = Omit<unchained.bitcoin.Utxo, 'value'> & { value: number }
      const mappedUtxos: MappedUtxos[] = utxos.map((x) => ({ ...x, value: Number(x.value) }))

      let coinSelectResult
      if (sendMax) {
        coinSelectResult = split(mappedUtxos, [{ address: to }], Number(satoshiPerByte))
      } else {
        coinSelectResult = coinSelect<MappedUtxos, chainAdapters.bitcoin.Recipient>(
          mappedUtxos,
          [{ value: Number(value), address: to }],
          Number(satoshiPerByte)
        )
      }
      if (!coinSelectResult || !coinSelectResult.inputs || !coinSelectResult.outputs) {
        throw new Error("BitcoinChainAdapter: coinSelect didn't select coins")
      }

      const { inputs, outputs } = coinSelectResult

      const signTxInputs: BTCSignTxInput[] = []
      for (const input of inputs) {
        if (!input.path) continue
        const getTransactionResponse = await this.providers.http.getTransaction({
          txid: input.txid
        })
        const inputTx = getTransactionResponse.data

        signTxInputs.push({
          addressNList: bip32ToAddressNList(input.path),
          // https://github.com/shapeshift/hdwallet/issues/362
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scriptType: accountTypeToScriptType[accountType] as any,
          amount: String(input.value),
          vout: input.vout,
          txid: input.txid,
          hex: inputTx.hex
        })
      }

      const signTxOutputs: BTCSignTxOutput[] = outputs.map((out) => {
        const amount = String(out.value)
        if (!out.address) {
          return {
            addressType: BTCOutputAddressType.Change,
            amount,
            addressNList: bip32ToAddressNList(
              `${path}/1/${String(account.chainSpecific.nextChangeAddressIndex)}`
            ),
            scriptType: accountTypeToOutputScriptType[accountType],
            isChange: true
          }
        } else {
          return {
            addressType: BTCOutputAddressType.Spend,
            amount,
            address: out.address
          }
        }
      })

      const txToSign: BTCSignTx = {
        coin: this.coinName,
        inputs: signTxInputs,
        outputs: signTxOutputs
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params {
    return { ...ChainAdapter.defaultBIP44Params, ...params }
  }

  async signTransaction(
    signTxInput: chainAdapters.SignTxInput<chainAdapters.ChainTxType<ChainTypes.Bitcoin>>
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      if (!supportsBTC(wallet))
        throw new Error(
          'BitcoinChainAdapter: signTransaction wallet does not support signing btc txs'
        )
      const signedTx = await wallet.btcSignTx(txToSign)
      if (!signedTx) throw ErrorHandler('BitcoinChainAdapter: error signing tx')
      return signedTx.serializedTx
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { pubkey },
    sendMax = false
  }: chainAdapters.GetFeeDataInput<ChainTypes.Bitcoin>): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes.Bitcoin>
  > {
    const feeData = await this.providers.http.getNetworkFees()

    if (!to || !value || !pubkey) throw new Error('to, from, value and xpub are required')
    if (
      !feeData.data.fast?.satsPerKiloByte ||
      !feeData.data.average?.satsPerKiloByte ||
      !feeData.data.slow?.satsPerKiloByte
    )
      throw new Error('undefined fee')

    // We have to round because coinselect library uses sats per byte which cant be decimals
    const fastPerByte = String(Math.round(feeData.data.fast.satsPerKiloByte / 1024))
    const averagePerByte = String(Math.round(feeData.data.average.satsPerKiloByte / 1024))
    const slowPerByte = String(Math.round(feeData.data.slow.satsPerKiloByte / 1024))

    const { data: utxos } = await this.providers.http.getUtxos({
      pubkey
    })

    type MappedUtxos = Omit<unchained.bitcoin.Utxo, 'value'> & { value: number }
    const mappedUtxos: MappedUtxos[] = utxos.map((x) => ({ ...x, value: Number(x.value) }))

    let fastFee
    let averageFee
    let slowFee
    if (sendMax) {
      fastFee = 0
      averageFee = 0
      slowFee = 0
      const sendMaxResultFast = split(mappedUtxos, [{ address: to }], Number(fastPerByte))
      const sendMaxResultAverage = split(mappedUtxos, [{ address: to }], Number(averagePerByte))
      const sendMaxResultSlow = split(mappedUtxos, [{ address: to }], Number(slowPerByte))
      fastFee = sendMaxResultFast.fee
      averageFee = sendMaxResultAverage.fee
      slowFee = sendMaxResultSlow.fee
    } else {
      const { fee: fast } = coinSelect<MappedUtxos, chainAdapters.bitcoin.Recipient>(
        mappedUtxos,
        [{ value: Number(value), address: to }],
        Number(fastPerByte)
      )
      const { fee: average } = coinSelect<MappedUtxos, chainAdapters.bitcoin.Recipient>(
        mappedUtxos,
        [{ value: Number(value), address: to }],
        Number(averagePerByte)
      )
      const { fee: slow } = coinSelect<MappedUtxos, chainAdapters.bitcoin.Recipient>(
        mappedUtxos,
        [{ value: Number(value), address: to }],
        Number(slowPerByte)
      )
      fastFee = fast
      averageFee = average
      slowFee = slow
    }

    return {
      [chainAdapters.FeeDataKey.Fast]: {
        txFee: String(fastFee),
        chainSpecific: {
          satoshiPerByte: fastPerByte
        }
      },
      [chainAdapters.FeeDataKey.Average]: {
        txFee: String(averageFee),
        chainSpecific: {
          satoshiPerByte: averagePerByte
        }
      },
      [chainAdapters.FeeDataKey.Slow]: {
        txFee: String(slowFee),
        chainSpecific: {
          satoshiPerByte: slowPerByte
        }
      }
    }
  }

  async getAddress({
    wallet,
    bip44Params = ChainAdapter.defaultBIP44Params,
    accountType = ChainAdapter.defaultUtxoAccountType,
    showOnDevice = false
  }: chainAdapters.bitcoin.GetAddressInput): Promise<string> {
    if (!supportsBTC(wallet)) {
      throw new Error('BitcoinChainAdapter: wallet does not support btc')
    }

    const { isChange } = bip44Params
    let { index } = bip44Params

    // If an index is not passed in, we want to use the newest unused change/receive indices
    if (index === undefined) {
      const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
      const account = await this.getAccount(xpub)
      index = isChange
        ? account.chainSpecific.nextChangeAddressIndex
        : account.chainSpecific.nextReceiveAddressIndex
    }

    const path = toPath({ ...bip44Params, index })
    const addressNList = path ? bip32ToAddressNList(path) : bip32ToAddressNList("m/84'/0'/0'/0/0")
    const btcAddress = await wallet.btcGetAddress({
      addressNList,
      coin: this.coinName,
      scriptType: accountTypeToScriptType[accountType],
      showDisplay: Boolean(showOnDevice)
    })
    if (!btcAddress) throw new Error('BitcoinChainAdapter: no btcAddress available from wallet')
    return btcAddress
  }

  async subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.Transaction<ChainTypes.Bitcoin>) => void,
    onError: (err: chainAdapters.SubscribeError) => void
  ): Promise<void> {
    const {
      wallet,
      bip44Params = ChainAdapter.defaultBIP44Params,
      accountType = ChainAdapter.defaultUtxoAccountType
    } = input

    const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
    const account = await this.getAccount(xpub)
    const addresses = (account.chainSpecific.addresses ?? []).map((address) => address.pubkey)
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses },
      ({ data: tx }) => {
        const transfers = tx.transfers.map<chainAdapters.TxTransfer>((transfer) => ({
          assetId: transfer.assetId,
          from: transfer.from,
          to: transfer.to,
          type: getType(transfer.type),
          value: transfer.totalValue
        }))

        onMessage({
          address: tx.address,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.blockTime,
          chainId: tx.chainId,
          chain: ChainTypes.Bitcoin,
          confirmations: tx.confirmations,
          fee: tx.fee,
          status: getStatus(tx.status),
          tradeDetails: tx.trade,
          transfers,
          txid: tx.txid
        })
      },
      (err) => onError({ message: err.message })
    )
  }

  unsubscribeTxs(input?: chainAdapters.SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const {
      bip44Params = ChainAdapter.defaultBIP44Params,
      accountType = ChainAdapter.defaultUtxoAccountType
    } = input
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }
}
