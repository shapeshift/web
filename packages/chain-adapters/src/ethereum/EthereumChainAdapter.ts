import {
  ChainAdapter,
  TxHistoryResponse,
  BuildSendTxInput,
  SignTxInput,
  GetAddressInput,
  FeeData,
  FeeEstimateInput,
  BalanceResponse,
  ChainIdentifier
} from '../api'
import { BlockchainProvider } from '../types/BlockchainProvider.type'
import { PaginationParams } from '../types/PaginationParams.type'
import { ErrorHandler } from '../error/ErrorHandler'
import { bip32ToAddressNList, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { numberToHex } from 'web3-utils'
import { Contract } from '@ethersproject/contracts'
import erc20Abi from './erc20Abi.json'
import { BigNumber } from 'bignumber.js'

export type EthereumChainAdapterDependencies = {
  provider: BlockchainProvider
}

export class EthereumChainAdapter implements ChainAdapter {
  private readonly provider: BlockchainProvider

  constructor(deps: EthereumChainAdapterDependencies) {
    this.provider = deps.provider
  }

  getType = (): ChainIdentifier => {
    return ChainIdentifier.Ethereum
  }

  getBalance = async (address: string): Promise<BalanceResponse | undefined> => {
    try {
      const balanceData = await this.provider.getBalance(address)
      return balanceData
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  getTxHistory = async (
    address: string,
    paginationParams?: PaginationParams
  ): Promise<TxHistoryResponse> => {
    try {
      return this.provider.getTxHistory(address, paginationParams)
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  buildSendTransaction = async (tx: BuildSendTxInput): Promise<ETHSignTx> => {
    try {
      const { to, erc20ContractAddress, path, wallet, chainId } = tx
      const value = erc20ContractAddress ? '0' : tx?.value
      const destAddress = erc20ContractAddress ?? to

      const addressNList = bip32ToAddressNList(path)

      let data = ''
      if (erc20ContractAddress) {
        const erc20Contract = new Contract(erc20ContractAddress, erc20Abi)
        const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
        data = callData || ''
      }

      const from = await this.getAddress({ wallet, path })
      const nonce = await this.provider.getNonce(from)

      const { price: gasPrice, units: gasLimit } = await this.getFeeData({
        from,
        to: destAddress,
        value,
        data
      })

      const txToSign: ETHSignTx = {
        addressNList,
        value: numberToHex(value),
        to: destAddress,
        chainId: chainId || 1,
        data,
        nonce: String(nonce),
        gasPrice: numberToHex(gasPrice),
        gasLimit: numberToHex(gasLimit)
      }
      return txToSign
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  signTransaction = async (signTxInput: SignTxInput): Promise<string> => {
    try {
      const { txToSign, wallet } = signTxInput

      const signedTx = await (wallet as ETHWallet).ethSignTx(txToSign)
      if (!signedTx) throw new Error('Error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  broadcastTransaction = async (hex: string) => {
    return this.provider.broadcastTx(hex)
  }

  getFeeData = async (feeEstimateInput: FeeEstimateInput): Promise<FeeData> => {
    const [price, units] = await Promise.all([
      this.provider.getFeePrice(),
      this.provider.getFeeUnits(feeEstimateInput) // Returns estimated gas for ETH
    ])

    // The node seems to be often estimating low gas price
    // Hard code 1.5x multiplier to get it working for now
    const adjustedPrice = new BigNumber(price).times(1.5).decimalPlaces(0)
    // Hard code 2x gas limit multipiler
    const adjustedGas = new BigNumber(units).times(2).decimalPlaces(0)

    return {
      units: adjustedGas.toString(),
      price: adjustedPrice.toString()
    }
  }

  getAddress = async (input: GetAddressInput): Promise<string> => {
    const { wallet, path } = input
    const addressNList = bip32ToAddressNList(path)
    const ethAddress = await (wallet as ETHWallet).ethGetAddress({
      addressNList,
      showDisplay: false
    })
    return ethAddress as string
  }
}
