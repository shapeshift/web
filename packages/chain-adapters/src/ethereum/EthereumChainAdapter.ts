import WAValidator from 'multicoin-address-validator'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import { bip32ToAddressNList, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { numberToHex } from 'web3-utils'
import { Contract } from '@ethersproject/contracts'
import {
  TxHistoryResponse,
  BuildSendTxInput,
  SignTxInput,
  GetAddressInput,
  GetFeeDataInput,
  ChainTypes,
  ValidAddressResult,
  ValidAddressResultType,
  Account,
  ContractTypes,
  NetworkTypes,
  ETHFeeDataEstimate,
  BIP32Params
} from '@shapeshiftoss/types'

import { ErrorHandler } from '../error/ErrorHandler'
import erc20Abi from './erc20Abi.json'
import { ChainAdapter } from '..'
import { EthereumAPI } from '@shapeshiftoss/unchained-client'
import { toPath } from '../bip32'

export type EthereumChainAdapterDependencies = {
  provider: EthereumAPI.V1Api
}

type ZrxFeeResult = {
  fast: number
  instant: number
  low: number
  source:
    | 'ETH_GAS_STATION'
    | 'ETHERSCAN'
    | 'ETHERCHAIN'
    | 'GAS_NOW'
    | 'MY_CRYPTO'
    | 'UP_VEST'
    | 'GETH_PENDING'
    | 'MEDIAN'
    | 'AVERAGE'
  standard: number
  timestamp: number
}

type ZrxGasApiResponse = {
  result: ZrxFeeResult[]
}

async function getErc20Data(to: string, value: string, contractAddress?: string) {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
  return callData || ''
}

export class EthereumChainAdapter implements ChainAdapter<ChainTypes.Ethereum> {
  private readonly provider: EthereumAPI.V1Api
  private readonly defaultBIP32Params: BIP32Params = {
    purpose: 44,
    coinType: 60,
    accountNumber: 0
  }

  constructor(deps: EthereumChainAdapterDependencies) {
    this.provider = deps.provider
  }

  getType(): ChainTypes.Ethereum {
    return ChainTypes.Ethereum
  }

  async getAccount(pubkey: string): Promise<Account<ChainTypes.Ethereum>> {
    try {
      const { data } = await this.provider.getAccount({ pubkey })

      return {
        balance: data.balance,
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET, // TODO(0xdef1cafe): need to reflect this from the provider
        nonce: data.nonce,
        pubkey: data.pubkey,
        symbol: 'ETH', // TODO(0xdef1cafe): this is real dirty
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
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory({
    pubkey
  }: EthereumAPI.V1ApiGetTxHistoryRequest): Promise<TxHistoryResponse<ChainTypes.Ethereum>> {
    try {
      const { data: unchainedTxHistory } = await this.provider.getTxHistory({ pubkey })
      const result: TxHistoryResponse<ChainTypes.Ethereum> = {
        ...unchainedTxHistory,
        transactions: unchainedTxHistory.transactions.map((tx) => ({
          ...tx,
          symbol: 'ETH', // TODO(0xdef1cafe): this is real dirty
          chain: ChainTypes.Ethereum,
          // TODO(0xdef1cafe): need to reflect this from the provider
          network: NetworkTypes.MAINNET,
          details: {}
        }))
      }
      return result
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(
    tx: BuildSendTxInput
  ): Promise<{ txToSign: ETHSignTx; estimatedFees: ETHFeeDataEstimate }> {
    try {
      const { to, erc20ContractAddress, wallet, fee, bip32Params = this.defaultBIP32Params } = tx
      if (!to) throw new Error('EthereumChainAdapter: to is required')
      if (!tx?.value) throw new Error('EthereumChainAdapter: value is required')
      const value = erc20ContractAddress ? '0' : tx?.value
      const destAddress = erc20ContractAddress ?? to

      const path = toPath(bip32Params)
      const addressNList = bip32ToAddressNList(path)

      const data = await getErc20Data(to, tx?.value, erc20ContractAddress)
      const from = await this.getAddress({ bip32Params, wallet })
      const { nonce } = await this.getAccount(from)

      let gasPrice = fee
      const estimatedFees = await this.getFeeData({
        to,
        from,
        value,
        contractAddress: erc20ContractAddress
      })

      let { gasLimit } = tx
      if (!gasPrice || !gasLimit) {
        // Default to average gas price if fee is not passed
        !gasPrice && (gasPrice = estimatedFees.average.feeUnitPrice)
        !gasLimit && (gasLimit = estimatedFees.average.feeUnits)
      }

      const txToSign: ETHSignTx = {
        addressNList,
        value: numberToHex(value),
        to: destAddress,
        chainId: 1, // TODO: implement for multiple chains
        data,
        nonce: String(nonce),
        gasPrice: numberToHex(gasPrice),
        gasLimit: numberToHex(gasLimit)
      }
      return { txToSign, estimatedFees }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      const signedTx = await (wallet as ETHWallet).ethSignTx(txToSign)

      if (!signedTx) throw new Error('Error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async broadcastTransaction(hex: string) {
    const { data } = await this.provider.sendTx({ sendTxBody: { hex } })
    return data
  }

  async getFeeData({
    to,
    from,
    contractAddress,
    value
  }: GetFeeDataInput): Promise<ETHFeeDataEstimate> {
    const { data: responseData } = await axios.get<ZrxGasApiResponse>('https://gas.api.0x.org/')
    const fees = responseData.result.find((result) => result.source === 'MEDIAN')

    if (!fees) throw new TypeError('ETH Gas Fees should always exist')

    const data = await getErc20Data(to, value, contractAddress)

    const { data: feeUnits } = await this.provider.estimateGas({
      from,
      to,
      value,
      data
    })

    // PAD LIMIT
    const gasLimit = new BigNumber(feeUnits).times(2).toString()

    return {
      fast: {
        feeUnits: gasLimit,
        feeUnitPrice: String(fees.instant),
        networkFee: new BigNumber(fees.instant).times(gasLimit).toPrecision()
      },
      average: {
        feeUnits: gasLimit,
        feeUnitPrice: String(fees.fast),
        networkFee: new BigNumber(fees.fast).times(gasLimit).toPrecision()
      },
      slow: {
        feeUnits: gasLimit,
        feeUnitPrice: String(fees.low),
        networkFee: new BigNumber(fees.low).times(gasLimit).toPrecision()
      }
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, bip32Params = this.defaultBIP32Params } = input
    const path = toPath(bip32Params)
    const addressNList = bip32ToAddressNList(path)
    const ethAddress = await (wallet as ETHWallet).ethGetAddress({
      addressNList,
      showDisplay: false
    })
    return ethAddress as string
  }

  async validateAddress(address: string): Promise<ValidAddressResult> {
    const isValidAddress = WAValidator.validate(address, this.getType())
    if (isValidAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
