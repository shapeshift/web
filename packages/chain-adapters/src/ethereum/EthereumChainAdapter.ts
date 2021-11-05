import { Contract } from '@ethersproject/contracts'
import { bip32ToAddressNList, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import {
  BIP32Params,
  chainAdapters,
  ChainTypes,
  ContractTypes,
  NetworkTypes
} from '@shapeshiftoss/types'
import { ethereum, unchained } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import WAValidator from 'multicoin-address-validator'
import { numberToHex } from 'web3-utils'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import { toPath } from '../utils/bip32'
import erc20Abi from './erc20Abi.json'

export interface ChainAdapterArgs {
  providers: {
    http: ethereum.api.V1Api
    ws: ethereum.ws.Client
  }
}

async function getErc20Data(to: string, value: string, contractAddress?: string) {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
  return callData || ''
}

export class ChainAdapter implements IChainAdapter<ChainTypes.Ethereum> {
  private readonly providers: {
    http: ethereum.api.V1Api
    ws: ethereum.ws.Client
  }
  public static readonly defaultBIP32Params: BIP32Params = {
    purpose: 44,
    coinType: 60,
    accountNumber: 0
  }

  constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
  }

  getType(): ChainTypes.Ethereum {
    return ChainTypes.Ethereum
  }

  async getAccount(pubkey: string): Promise<chainAdapters.Account<ChainTypes.Ethereum>> {
    try {
      const { data } = await this.providers.http.getAccount({ pubkey })

      return {
        balance: data.balance,
        chain: ChainTypes.Ethereum,
        chainSpecific: {
          nonce: data.nonce,
          tokens: data.tokens.map((token) => ({
            balance: token.balance,
            contract: token.contract,
            // note: unchained gets token types from blockbook
            // blockbook only has one definition of a TokenType for ethereum
            // https://github1s.com/trezor/blockbook/blob/master/api/types.go#L140
            contractType: ContractTypes.ERC20,
            name: token.name,
            precision: token.decimals,
            symbol: token.symbol
          }))
        },
        network: NetworkTypes.MAINNET, // TODO(0xdef1cafe): need to reflect this from the provider
        pubkey: data.pubkey,
        symbol: 'ETH' // TODO(0xdef1cafe): this is real dirty
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  buildBIP32Params(params: Partial<BIP32Params>): BIP32Params {
    return { ...ChainAdapter.defaultBIP32Params, ...params }
  }

  async getTxHistory({
    pubkey
  }: ethereum.api.V1ApiGetTxHistoryRequest): Promise<
    chainAdapters.TxHistoryResponse<ChainTypes.Ethereum>
  > {
    try {
      const { data } = await this.providers.http.getTxHistory({ pubkey })

      return {
        page: data.page,
        totalPages: data.totalPages,
        transactions: data.transactions.map((tx) => ({
          ...tx,
          chain: ChainTypes.Ethereum,
          network: NetworkTypes.MAINNET,
          symbol: 'ETH'
        })),
        txs: data.txs
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(
    tx: chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>
  ): Promise<{
    txToSign: ETHSignTx
  }> {
    try {
      const {
        to,
        wallet,
        bip32Params = ChainAdapter.defaultBIP32Params,
        chainSpecific: { erc20ContractAddress, fee: gasPrice, gasLimit }
      } = tx

      if (!to) throw new Error('EthereumChainAdapter: to is required')
      if (!tx?.value) throw new Error('EthereumChainAdapter: value is required')

      const value = erc20ContractAddress ? '0' : tx?.value
      const destAddress = erc20ContractAddress ?? to

      const path = toPath(bip32Params)
      const addressNList = bip32ToAddressNList(path)

      const data = await getErc20Data(to, tx?.value, erc20ContractAddress)
      const from = await this.getAddress({ bip32Params, wallet })
      const { chainSpecific } = await this.getAccount(from)

      const txToSign: ETHSignTx = {
        addressNList,
        value: numberToHex(value),
        to: destAddress,
        chainId: 1, // TODO: implement for multiple chains
        data,
        nonce: numberToHex(chainSpecific.nonce),
        gasPrice: numberToHex(gasPrice),
        gasLimit: numberToHex(gasLimit)
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signTransaction(signTxInput: chainAdapters.SignTxInput<ETHSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      const signedTx = await (wallet as ETHWallet).ethSignTx(txToSign)

      if (!signedTx) throw new Error('Error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signAndBroadcastTransaction(
    signTxInput: chainAdapters.SignTxInput<ETHSignTx>
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      const ethHash = await (wallet as ETHWallet)?.ethSendTx?.(txToSign)

      if (!ethHash) throw new Error('Error signing & broadcasting tx')
      return ethHash.hash
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async broadcastTransaction(hex: string) {
    const { data } = await this.providers.http.sendTx({ sendTxBody: { hex } })
    return data
  }

  async getFeeData({
    to,
    from,
    contractAddress,
    value
  }: chainAdapters.GetFeeDataInput): Promise<chainAdapters.FeeDataEstimate<ChainTypes.Ethereum>> {
    const { data: responseData } = await axios.get<chainAdapters.ZrxGasApiResponse>(
      'https://gas.api.0x.org/'
    )
    const fees = responseData.result.find((result) => result.source === 'MEDIAN')

    if (!fees) throw new TypeError('ETH Gas Fees should always exist')

    const data = await getErc20Data(to, value, contractAddress)

    const { data: feeUnits } = await this.providers.http.estimateGas({
      from,
      to,
      value,
      data
    })

    // PAD LIMIT
    const gasLimit = new BigNumber(feeUnits).times(2).toString()

    return {
      fast: {
        feePerUnit: String(fees.instant),
        chainSpecific: {
          feeLimit: gasLimit,
          feePerTx: new BigNumber(fees.instant).times(gasLimit).toPrecision()
        }
      },
      average: {
        feePerUnit: String(fees.fast),
        chainSpecific: {
          feeLimit: gasLimit,
          feePerTx: new BigNumber(fees.fast).times(gasLimit).toPrecision()
        }
      },
      slow: {
        feePerUnit: String(fees.low),
        chainSpecific: {
          feeLimit: gasLimit,
          feePerTx: new BigNumber(fees.low).times(gasLimit).toPrecision()
        }
      }
    }
  }

  async getAddress(input: chainAdapters.GetAddressInput): Promise<string> {
    const { wallet, bip32Params = ChainAdapter.defaultBIP32Params } = input
    const path = toPath(bip32Params)
    const addressNList = bip32ToAddressNList(path)
    const ethAddress = await (wallet as ETHWallet).ethGetAddress({
      addressNList,
      showDisplay: Boolean(input.showOnDevice)
    })
    return ethAddress as string
  }

  async validateAddress(address: string): Promise<chainAdapters.ValidAddressResult> {
    const isValidAddress = WAValidator.validate(address, this.getType())
    if (isValidAddress) return { valid: true, result: chainAdapters.ValidAddressResultType.Valid }
    return { valid: false, result: chainAdapters.ValidAddressResultType.Invalid }
  }

  async subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.SubscribeTxsMessage<ChainTypes.Ethereum>) => void,
    onError: (err: chainAdapters.SubscribeError) => void
  ): Promise<void> {
    // TODO: option to use sequence data for order and data validation
    await this.providers.ws.subscribeTxs(
      { topic: 'txs', addresses: input.addresses },
      (msg) => {
        const getStatus = () => {
          const msgStatus = msg?.ethereumSpecific?.status
          if (!msgStatus || msg.confirmations <= 0) return chainAdapters.TxStatus.pending
          if (msgStatus === 1 && msg.confirmations > 0) return chainAdapters.TxStatus.confirmed
          if (msgStatus <= 0) return chainAdapters.TxStatus.failed
          return chainAdapters.TxStatus.pending
        }

        const baseTx = {
          address: msg.address,
          blockHash: msg.blockHash,
          blockHeight: msg.blockHeight,
          blockTime: msg.blockTime,
          chain: ChainTypes.Ethereum as ChainTypes.Ethereum,
          confirmations: msg.confirmations,
          network: NetworkTypes.MAINNET,
          txid: msg.txid,
          fee: msg.fee,
          status: getStatus()
        }

        const specificTx = (symbol: string, value: string, token?: unchained.Token) => ({
          asset: token?.contract || ChainTypes.Ethereum,
          value,
          chainSpecific: {
            ...(token && {
              token: {
                contract: token.contract,
                contractType: ContractTypes.ERC20,
                name: token.name,
                precision: token.decimals,
                symbol
              }
            })
          }
        })

        Object.entries(msg.send).forEach(([symbol, { totalValue, token }]) => {
          onMessage({
            ...baseTx,
            ...specificTx(symbol, totalValue, token),
            type: chainAdapters.TxType.send,
            to: msg?.vout?.[0]?.addresses?.[0]
          })
        })

        Object.entries(msg.receive).forEach(([symbol, { totalValue, token }]) => {
          onMessage({
            ...baseTx,
            ...specificTx(symbol, totalValue, token),
            type: chainAdapters.TxType.receive,
            from: msg?.vin?.[0]?.addresses?.[0]
          })
        })
      },
      (err) => onError({ message: err.message })
    )
  }
}
