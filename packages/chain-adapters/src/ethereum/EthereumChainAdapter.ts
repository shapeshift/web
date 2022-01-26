import { Contract } from '@ethersproject/contracts'
import { CAIP2, caip2, caip19 } from '@shapeshiftoss/caip'
import { bip32ToAddressNList, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { ethereum } from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import WAValidator from 'multicoin-address-validator'
import { numberToHex } from 'web3-utils'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import {
  bnOrZero,
  getContractType,
  getStatus,
  getType,
  toPath,
  toRootDerivationPath
} from '../utils'
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
  public static readonly defaultBIP44Params: BIP44Params = {
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

  async getCaip2(): Promise<CAIP2> {
    try {
      const { data } = await this.providers.http.getInfo()

      switch (data.network) {
        case 'mainnet':
          return caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
        case 'ropsten':
          return caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.ETH_ROPSTEN })
        case 'rinkeby':
          return caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.ETH_RINKEBY })
        default:
          throw new Error(`EthereumChainAdapter: network is not supported: ${data.network}`)
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getAccount(pubkey: string): Promise<chainAdapters.Account<ChainTypes.Ethereum>> {
    try {
      const caip = await this.getCaip2()
      const { chain, network } = caip2.fromCAIP2(caip)
      const { data } = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      return {
        balance: balance.toString(),
        caip2: caip,
        caip19: caip19.toCAIP19({ chain, network }),
        chain: ChainTypes.Ethereum,
        chainSpecific: {
          nonce: data.nonce,
          tokens: data.tokens.map((token) => ({
            balance: token.balance,
            caip19: caip19.toCAIP19({
              chain,
              network,
              contractType: getContractType(token.type),
              tokenId: token.contract
            })
          }))
        },
        pubkey: data.pubkey
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params {
    return { ...ChainAdapter.defaultBIP44Params, ...params }
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
        bip44Params = ChainAdapter.defaultBIP44Params,
        chainSpecific: { erc20ContractAddress, gasPrice, gasLimit },
        sendMax = false
      } = tx

      if (!to) throw new Error('EthereumChainAdapter: to is required')
      if (!tx?.value) throw new Error('EthereumChainAdapter: value is required')

      const destAddress = erc20ContractAddress ?? to

      const path = toPath(bip44Params)
      const addressNList = bip32ToAddressNList(path)

      const from = await this.getAddress({ bip44Params, wallet })
      const { chainSpecific } = await this.getAccount(from)

      const isErc20Send = !!erc20ContractAddress

      if (sendMax) {
        const account = await this.getAccount(from)
        if (isErc20Send) {
          if (!erc20ContractAddress) throw new Error('no token address')
          const erc20Balance = account?.chainSpecific?.tokens?.find((token) => {
            return caip19.fromCAIP19(token.caip19).tokenId === erc20ContractAddress.toLowerCase()
          })?.balance
          if (!erc20Balance) throw new Error('no balance')
          tx.value = erc20Balance
        } else {
          if (new BigNumber(account.balance).isZero()) throw new Error('no balance')

          const fee = new BigNumber(gasPrice).times(gasLimit)
          tx.value = new BigNumber(account.balance).minus(fee).toString()
        }
      }
      const data = await getErc20Data(to, tx?.value, erc20ContractAddress)

      const txToSign: ETHSignTx = {
        addressNList,
        value: numberToHex(isErc20Send ? '0' : tx?.value),
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
    value,
    chainSpecific: { contractAddress, from, contractData },
    sendMax = false
  }: chainAdapters.GetFeeDataInput<ChainTypes.Ethereum>): Promise<
    chainAdapters.FeeDataEstimate<ChainTypes.Ethereum>
  > {
    const { data: responseData } = await axios.get<chainAdapters.ZrxGasApiResponse>(
      'https://gas.api.0x.org/'
    )
    const fees = responseData.result.find((result) => result.source === 'MEDIAN')

    if (!fees) throw new TypeError('ETH Gas Fees should always exist')

    const isErc20Send = !!contractAddress

    // Only care about sendMax for erc20
    // its hard to estimate eth fees for sendmax to contracts
    // in MOST cases any eth amount will cost the same 21000 gas
    if (sendMax && isErc20Send && contractAddress) {
      const account = await this.getAccount(from)
      const erc20Balance = account?.chainSpecific?.tokens?.find((token) => {
        const { tokenId } = caip19.fromCAIP19(token.caip19)
        return tokenId === contractAddress.toLowerCase()
      })?.balance
      if (!erc20Balance) throw new Error('no balance')
      value = erc20Balance
    }

    const data = contractData ?? (await getErc20Data(to, value, contractAddress))

    const { data: gasLimit } = await this.providers.http.estimateGas({
      from,
      to: isErc20Send ? contractAddress : to,
      value: isErc20Send ? '0' : value,
      data
    })

    const feeData = (await this.providers.http.getGasFees()).data
    const normalizationConstants = {
      instant: String(new BigNumber(fees.instant).dividedBy(fees.fast)),
      average: String(1),
      slow: String(new BigNumber(fees.low).dividedBy(fees.fast))
    }

    return {
      fast: {
        txFee: new BigNumber(fees.instant).times(gasLimit).toPrecision(),
        chainSpecific: {
          gasLimit,
          gasPrice: String(fees.instant),
          maxFeePerGas: String(
            new BigNumber(feeData.maxFeePerGas)
              .times(normalizationConstants.instant)
              .toFixed(0, BigNumber.ROUND_CEIL)
          ),
          maxPriorityFeePerGas: String(
            new BigNumber(feeData.maxPriorityFeePerGas)
              .times(normalizationConstants.instant)
              .toFixed(0, BigNumber.ROUND_CEIL)
          )
        }
      },
      average: {
        txFee: new BigNumber(fees.fast).times(gasLimit).toPrecision(),
        chainSpecific: {
          gasLimit,
          gasPrice: String(fees.fast),
          maxFeePerGas: String(
            new BigNumber(feeData.maxFeePerGas)
              .times(normalizationConstants.average)
              .toFixed(0, BigNumber.ROUND_CEIL)
          ),
          maxPriorityFeePerGas: String(
            new BigNumber(feeData.maxPriorityFeePerGas)
              .times(normalizationConstants.average)
              .toFixed(0, BigNumber.ROUND_CEIL)
          )
        }
      },
      slow: {
        txFee: new BigNumber(fees.low).times(gasLimit).toPrecision(),
        chainSpecific: {
          gasLimit,
          gasPrice: String(fees.low),
          maxFeePerGas: String(
            new BigNumber(feeData.maxFeePerGas)
              .times(normalizationConstants.slow)
              .toFixed(0, BigNumber.ROUND_CEIL)
          ),
          maxPriorityFeePerGas: String(
            new BigNumber(feeData.maxPriorityFeePerGas)
              .times(normalizationConstants.slow)
              .toFixed(0, BigNumber.ROUND_CEIL)
          )
        }
      }
    }
  }

  async getAddress(input: chainAdapters.GetAddressInput): Promise<string> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = input
    const path = toPath(bip44Params)
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

  async validateEnsAddress(address: string): Promise<chainAdapters.ValidAddressResult> {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress)
      return { valid: true, result: chainAdapters.ValidAddressResultType.Valid }
    return { valid: false, result: chainAdapters.ValidAddressResultType.Invalid }
  }

  async subscribeTxs(
    input: chainAdapters.SubscribeTxsInput,
    onMessage: (msg: chainAdapters.SubscribeTxsMessage<ChainTypes.Ethereum>) => void,
    onError: (err: chainAdapters.SubscribeError) => void
  ): Promise<void> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = input

    const address = await this.getAddress({ wallet, bip44Params })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
      (msg) => {
        const transfers = msg.transfers.map<chainAdapters.TxTransfer>((transfer) => ({
          caip19: transfer.caip19,
          from: transfer.from,
          to: transfer.to,
          type: getType(transfer.type),
          value: transfer.totalValue
        }))

        onMessage({
          address: msg.address,
          blockHash: msg.blockHash,
          blockHeight: msg.blockHeight,
          blockTime: msg.blockTime,
          caip2: msg.caip2,
          chain: ChainTypes.Ethereum,
          confirmations: msg.confirmations,
          fee: msg.fee,
          status: getStatus(msg.status),
          tradeDetails: msg.trade,
          transfers,
          txid: msg.txid
        })
      },
      (err) => onError({ message: err.message })
    )
  }

  unsubscribeTxs(input?: chainAdapters.SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { bip44Params = ChainAdapter.defaultBIP44Params } = input
    const subscriptionId = toRootDerivationPath(bip44Params)

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }
}
