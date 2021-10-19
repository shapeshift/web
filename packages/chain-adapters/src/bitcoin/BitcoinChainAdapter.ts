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
import { BIP32Params, ChainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { BitcoinAPI } from '@shapeshiftoss/unchained-client'
import { ChainAdapter } from '../api'
import { toPath, toRootDerivationPath } from '../bip32'
import { ErrorHandler } from '../error/ErrorHandler'

export type BitcoinChainAdapterDependencies = {
  provider: BitcoinAPI.V1Api
}

type UtxoCoinName = {
  coinName: string
}

export class BitcoinChainAdapter implements ChainAdapter<ChainTypes.Bitcoin> {
  private readonly provider: BitcoinAPI.V1Api
  private readonly defaultBIP32Params: BIP32Params = {
    purpose: 84, // segwit native
    coinType: 0,
    accountNumber: 0
  }

  // TODO(0xdef1cafe): constraint this to utxo coins and refactor this to be a UTXOChainAdapter
  coinName: string

  constructor(deps: BitcoinChainAdapterDependencies & UtxoCoinName) {
    this.provider = deps.provider
    this.coinName = deps.coinName
  }

  getType(): ChainTypes.Bitcoin {
    return ChainTypes.Bitcoin
  }

  // TODO(0xdef1cafe): change this path to bip32Params
  async getPubKey(wallet: HDWallet, path: string): Promise<PublicKey> {
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

  async getAccount(pubkey: string): Promise<ChainAdapters.Account<ChainTypes.Bitcoin>> {
    if (!pubkey) {
      return ErrorHandler('BitcoinChainAdapter: pubkey parameter is not defined')
    }
    try {
      const { data } = await this.provider.getAccount({ pubkey: pubkey })
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
    input: ChainAdapters.TxHistoryInput
  ): Promise<ChainAdapters.TxHistoryResponse<ChainTypes.Bitcoin>> {
    const { pubkey } = input

    if (!pubkey) return ErrorHandler('pubkey parameter is not defined')

    try {
      const { data } = await this.provider.getTxHistory(input)
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
    tx: ChainAdapters.BuildSendTxInput
  ): Promise<{
    txToSign: ChainAdapters.ChainTxType<ChainTypes.Bitcoin>
    estimatedFees: ChainAdapters.FeeDataEstimate<ChainTypes.Bitcoin>
  }> {
    try {
      const {
        recipients,
        wallet,
        scriptType = BTCInputScriptType.SpendWitness,
        bip32Params = this.defaultBIP32Params,
        feeSpeed
      } = tx

      if (!recipients || !recipients.length) {
        throw new Error('BitcoinChainAdapter: recipients is required')
      }

      const path = toRootDerivationPath(bip32Params)
      const publicKeys = await wallet.getPublicKeys([
        {
          coin: this.coinName,
          addressNList: bip32ToAddressNList(path),
          curve: 'secp256k1', // TODO(0xdef1cafe): from constant?
          scriptType
        }
      ])

      if (!(publicKeys ?? []).length) {
        throw new Error('BitcoinChainAdapter: no public keys available from wallet')
      }
      const pubkey = publicKeys?.[0]?.xpub
      if (!pubkey) throw new Error('BitcoinChainAdapter: no pubkey available from wallet')
      const { data: utxos } = await this.provider.getUtxos({
        pubkey
      })

      const account = await this.getAccount(pubkey)
      const estimatedFees = await this.getFeeData()
      const satoshiPerByte = estimatedFees[feeSpeed ?? ChainAdapters.FeeDataKey.Average].feePerUnit

      type MappedUtxos = Omit<BitcoinAPI.Utxo, 'value'> & { value: number }
      const mappedUtxos: MappedUtxos[] = utxos.map((x) => ({ ...x, value: Number(x.value) }))

      const coinSelectResult = coinSelect<MappedUtxos, ChainAdapters.Bitcoin.Recipient>(
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
        const getTransactionResponse = await this.provider.getTransaction({
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
    signTxInput: ChainAdapters.SignTxInput<ChainAdapters.ChainTxType<ChainTypes.Bitcoin>>
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
    const broadcastedTx = await this.provider.sendTx({ sendTxBody: { hex } })
    return broadcastedTx.data
  }

  async getFeeData(): Promise<ChainAdapters.FeeDataEstimate<ChainTypes.Bitcoin>> {
    const confTimes: ChainAdapters.FeeDataEstimate<ChainTypes.Bitcoin> = {
      [ChainAdapters.FeeDataKey.Fast]: {
        feePerUnit: '1'
      },
      [ChainAdapters.FeeDataKey.Average]: {
        feePerUnit: '1'
      },
      [ChainAdapters.FeeDataKey.Slow]: {
        feePerUnit: '1'
      }
    }

    return confTimes
  }

  async getAddress({
    wallet,
    bip32Params = this.defaultBIP32Params,
    scriptType = BTCInputScriptType.SpendWitness
  }: ChainAdapters.Bitcoin.GetAddressInput): Promise<string> {
    if (!supportsBTC(wallet)) {
      throw new Error('BitcoinChainAdapter: wallet does not support btc')
    }

    const { isChange } = bip32Params
    let { index } = bip32Params

    // If an index is not passed in, we want to use the newest unused change/receive indices
    if (index === undefined) {
      const pubkey = await this.getPubKey(wallet, toRootDerivationPath(bip32Params))
      const account = await this.getAccount(pubkey.xpub)
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

  async validateAddress(address: string): Promise<ChainAdapters.ValidAddressResult> {
    const isValidAddress = WAValidator.validate(address, this.getType())
    if (isValidAddress) return { valid: true, result: ChainAdapters.ValidAddressResultType.Valid }
    return { valid: false, result: ChainAdapters.ValidAddressResultType.Invalid }
  }
}
