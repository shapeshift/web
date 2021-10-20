import coinSelect from 'coinselect'
import WAValidator from 'multicoin-address-validator'
import {
  BTCInputScriptType,
  BTCOutputAddressType,
  BTCOutputScriptType,
  BTCSignTx,
  BTCSignTxInput,
  BTCSignTxOutput,
  HDWallet,
  PublicKey,
  bip32ToAddressNList,
  supportsBTC
} from '@shapeshiftoss/hdwallet-core'
import { BIP32Params, chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { bitcoin } from '@shapeshiftoss/unchained-client'
import { ChainAdapter as IChainAdapter } from '../api'
import { toPath, toRootDerivationPath } from '../bip32'
import { ErrorHandler } from '../error/ErrorHandler'

export interface ChainAdapterArgs {
  providers: {
    http: bitcoin.api.V1Api
  }
  coinName: string
}

export class ChainAdapter implements IChainAdapter<ChainTypes.Bitcoin> {
  private readonly providers: {
    http: bitcoin.api.V1Api
  }
  private readonly defaultBIP32Params: BIP32Params = {
    purpose: 84, // segwit native
    coinType: 0,
    accountNumber: 0
  }

  // TODO(0xdef1cafe): constraint this to utxo coins and refactor this to be a UTXOChainAdapter
  coinName: string

  constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
    this.coinName = args.coinName
  }

  getType(): ChainTypes.Bitcoin {
    return ChainTypes.Bitcoin
  }

  async getPubKey(wallet: HDWallet, bip32Params: BIP32Params): Promise<PublicKey> {
    const path = toRootDerivationPath(bip32Params)
    const publicKeys = await wallet.getPublicKeys([
      {
        coin: this.coinName,
        addressNList: bip32ToAddressNList(path),
        curve: 'secp256k1', // TODO(0xdef1cafe): from constant?
        scriptType: BTCInputScriptType.SpendWitness
      }
    ])
    if (!publicKeys?.[0]) throw new Error("couldn't get public key")
    return publicKeys[0]
  }

  async getAccount(pubkey: string): Promise<chainAdapters.Account<ChainTypes.Bitcoin>> {
    if (!pubkey) {
      return ErrorHandler('BitcoinChainAdapter: pubkey parameter is not defined')
    }
    try {
      const { data } = await this.providers.http.getAccount({ pubkey: pubkey })
      return {
        balance: data.balance,
        chain: ChainTypes.Bitcoin,
        chainSpecific: {
          nextChangeAddressIndex: data.nextChangeAddressIndex,
          nextReceiveAddressIndex: data.nextReceiveAddressIndex
        },
        network: NetworkTypes.MAINNET,
        pubkey: data.pubkey,
        symbol: 'BTC'
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory(
    input: chainAdapters.TxHistoryInput
  ): Promise<chainAdapters.TxHistoryResponse<ChainTypes.Bitcoin>> {
    const { pubkey } = input

    if (!pubkey) return ErrorHandler('pubkey parameter is not defined')

    try {
      const { data } = await this.providers.http.getTxHistory(input)
      return {
        page: data.page,
        totalPages: data.totalPages,
        transactions: data.transactions.map((tx) => ({
          ...tx,
          chain: ChainTypes.Bitcoin,
          network: NetworkTypes.MAINNET,
          symbol: 'BTC',
          chainSpecific: {
            opReturnData: ''
          }
        })),
        txs: data.txs
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(
    tx: chainAdapters.BuildSendTxInput
  ): Promise<{
    txToSign: chainAdapters.ChainTxType<ChainTypes.Bitcoin>
    estimatedFees: chainAdapters.FeeDataEstimate<ChainTypes.Bitcoin>
  }> {
    try {
      const { recipients, wallet, bip32Params = this.defaultBIP32Params, feeSpeed } = tx

      if (!recipients || !recipients.length) {
        throw new Error('BitcoinChainAdapter: recipients is required')
      }

      const path = toRootDerivationPath(bip32Params)
      const pubkey = await this.getPubKey(wallet, bip32Params)
      const { data: utxos } = await this.providers.http.getUtxos({
        pubkey: pubkey.xpub
      })

      const account = await this.getAccount(pubkey.xpub)
      const estimatedFees = await this.getFeeData()
      const satoshiPerByte = estimatedFees[feeSpeed ?? chainAdapters.FeeDataKey.Average].feePerUnit

      type MappedUtxos = Omit<bitcoin.api.Utxo, 'value'> & { value: number }
      const mappedUtxos: MappedUtxos[] = utxos.map((x) => ({ ...x, value: Number(x.value) }))

      const coinSelectResult = coinSelect<MappedUtxos, chainAdapters.bitcoin.Recipient>(
        mappedUtxos,
        recipients,
        Number(satoshiPerByte)
      )
      if (!coinSelectResult.inputs) {
        throw new Error("BitcoinChainAdapter: coinSelect didn't select coins")
      }

      const { inputs, outputs, fee } = coinSelectResult

      const signTxInputs: BTCSignTxInput[] = []
      for (const input of inputs) {
        if (!input.path) continue
        const getTransactionResponse = await this.providers.http.getTransaction({
          txid: input.txid
        })
        const inputTx = getTransactionResponse.data

        signTxInputs.push({
          addressNList: bip32ToAddressNList(input.path),
          scriptType: BTCInputScriptType.SpendWitness,
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
            scriptType: BTCOutputScriptType.PayToWitness,
            isChange: true
          }
        }
        return {
          addressType: BTCOutputAddressType.Spend,
          amount,
          address: out.address,
          scriptType: BTCOutputScriptType.PayToWitness
        }
      })

      const txToSign: BTCSignTx & { fee: number } = {
        coin: this.coinName,
        inputs: signTxInputs,
        outputs: signTxOutputs,
        fee
      }

      return { txToSign, estimatedFees }
    } catch (err) {
      return ErrorHandler(err)
    }
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

  async broadcastTransaction(hex: string): Promise<string> {
    const broadcastedTx = await this.providers.http.sendTx({ sendTxBody: { hex } })
    return broadcastedTx.data
  }

  async getFeeData(): Promise<chainAdapters.FeeDataEstimate<ChainTypes.Bitcoin>> {
    const confTimes: chainAdapters.FeeDataEstimate<ChainTypes.Bitcoin> = {
      [chainAdapters.FeeDataKey.Fast]: {
        feePerUnit: '1'
      },
      [chainAdapters.FeeDataKey.Average]: {
        feePerUnit: '1'
      },
      [chainAdapters.FeeDataKey.Slow]: {
        feePerUnit: '1'
      }
    }

    return confTimes
  }

  async getAddress({
    wallet,
    bip32Params = this.defaultBIP32Params,
    scriptType = BTCInputScriptType.SpendWitness
  }: chainAdapters.bitcoin.GetAddressInput): Promise<string> {
    if (!supportsBTC(wallet)) {
      throw new Error('BitcoinChainAdapter: wallet does not support btc')
    }

    const { isChange } = bip32Params
    let { index } = bip32Params

    // If an index is not passed in, we want to use the newest unused change/receive indices
    if (index === undefined) {
      const { xpub } = await this.getPubKey(wallet, bip32Params)
      const account = await this.getAccount(xpub)
      index = isChange
        ? account.chainSpecific.nextChangeAddressIndex
        : account.chainSpecific.nextReceiveAddressIndex
    }

    const path = toPath({ ...bip32Params, index })
    const addressNList = path ? bip32ToAddressNList(path) : bip32ToAddressNList("m/84'/0'/0'/0/0")
    const btcAddress = await wallet.btcGetAddress({
      addressNList,
      coin: this.coinName,
      scriptType
    })
    if (!btcAddress) throw new Error('BitcoinChainAdapter: no btcAddress available from wallet')
    return btcAddress
  }

  async validateAddress(address: string): Promise<chainAdapters.ValidAddressResult> {
    const isValidAddress = WAValidator.validate(address, this.getType())
    if (isValidAddress) return { valid: true, result: chainAdapters.ValidAddressResultType.Valid }
    return { valid: false, result: chainAdapters.ValidAddressResultType.Invalid }
  }

  async subscribeTxs(): Promise<void> {
    throw new Error('Not implemented')
  }
}
