import { Contract } from '@ethersproject/contracts'
import {
  ASSET_REFERENCE,
  AssetId,
  CHAIN_NAMESPACE,
  ChainId,
  fromAssetId,
  fromChainId,
  toAssetId
} from '@shapeshiftoss/caip'
import { bip32ToAddressNList, ETHSignTx, ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import WAValidator from 'multicoin-address-validator'
import { numberToHex } from 'web3-utils'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import { getAssetNamespace, getStatus, getType, toPath, toRootDerivationPath } from '../utils'
import { bn, bnOrZero } from '../utils/bignumber'
import erc20Abi from './erc20Abi.json'

export interface ChainAdapterArgs {
  providers: {
    http: unchained.ethereum.V1Api
    ws: unchained.ws.Client<unchained.ethereum.ParsedTx>
  }
  chainId?: ChainId
}

async function getErc20Data(to: string, value: string, contractAddress?: string) {
  if (!contractAddress) return ''
  const erc20Contract = new Contract(contractAddress, erc20Abi)
  const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value)
  return callData || ''
}

export class ChainAdapter implements IChainAdapter<ChainTypes.Ethereum> {
  private readonly providers: {
    http: unchained.ethereum.V1Api
    ws: unchained.ws.Client<unchained.ethereum.ParsedTx>
  }
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: 60,
    accountNumber: 0
  }

  private readonly chainId: ChainId = 'eip155:1'

  constructor(args: ChainAdapterArgs) {
    if (args.chainId) {
      try {
        const { chainNamespace } = fromChainId(args.chainId)
        if (chainNamespace !== CHAIN_NAMESPACE.Ethereum) {
          throw new Error()
        }
        this.chainId = args.chainId
      } catch (e) {
        throw new Error(`The ChainID ${args.chainId} is not supported`)
      }
    }
    this.providers = args.providers
  }

  getType(): ChainTypes.Ethereum {
    return ChainTypes.Ethereum
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getFeeAssetId(): AssetId {
    return 'eip155:1/slip44:60'
  }

  async getAccount(pubkey: string): Promise<chainAdapters.Account<ChainTypes.Ethereum>> {
    try {
      const chainId = this.getChainId()
      const { data } = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      return {
        balance: balance.toString(),
        chainId,
        assetId: toAssetId({
          chainId,
          assetNamespace: 'slip44',
          assetReference: ASSET_REFERENCE.Ethereum
        }),
        chain: ChainTypes.Ethereum,
        chainSpecific: {
          nonce: data.nonce,
          tokens: data.tokens.map((token) => ({
            balance: token.balance,
            assetId: toAssetId({
              chainId,
              assetNamespace: getAssetNamespace(token.type),
              assetReference: token.contract
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

  // @ts-ignore: keep type signature with unimplemented state
  async getTxHistory({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pubkey
  }: unchained.ethereum.V1ApiGetTxHistoryRequest): Promise<
    chainAdapters.TxHistoryResponse<ChainTypes.Ethereum>
  > {
    throw new Error('Method not implemented.')
  }

  async buildSendTransaction(tx: chainAdapters.BuildSendTxInput<ChainTypes.Ethereum>): Promise<{
    txToSign: ETHSignTx
  }> {
    try {
      const {
        to,
        wallet,
        bip44Params = ChainAdapter.defaultBIP44Params,
        chainSpecific: {
          erc20ContractAddress,
          gasPrice,
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas
        },
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
            return fromAssetId(token.assetId).assetReference === erc20ContractAddress.toLowerCase()
          })?.balance
          if (!erc20Balance) throw new Error('no balance')
          tx.value = erc20Balance
        } else {
          if (bnOrZero(account.balance).isZero()) throw new Error('no balance')

          // (The type system guarantees that either maxFeePerGas or gasPrice will be undefined, but not both)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const fee = bnOrZero((maxFeePerGas ?? gasPrice)!).times(bnOrZero(gasLimit))
          tx.value = bnOrZero(account.balance).minus(fee).toString()
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
        gasLimit: numberToHex(gasLimit),
        ...(gasPrice !== undefined
          ? {
              gasPrice: numberToHex(gasPrice)
            }
          : {
              // (The type system guarantees that on this branch both of these will be set)
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              maxFeePerGas: numberToHex(maxFeePerGas!),
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              maxPriorityFeePerGas: numberToHex(maxPriorityFeePerGas!)
            })
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
        const { assetReference } = fromAssetId(token.assetId)
        return assetReference === contractAddress.toLowerCase()
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
      fast: bnOrZero(bn(fees.fast).dividedBy(fees.standard)),
      average: bn(1),
      slow: bnOrZero(bn(fees.low).dividedBy(fees.standard))
    }

    return {
      fast: {
        txFee: bnOrZero(bn(fees.fast).times(gasLimit)).toPrecision(),
        chainSpecific: {
          gasLimit,
          gasPrice: bnOrZero(fees.fast).toString(),
          maxFeePerGas: bnOrZero(feeData.maxFeePerGas)
            .times(normalizationConstants.fast)
            .toFixed(0, BigNumber.ROUND_CEIL)
            .toString(),
          maxPriorityFeePerGas: bnOrZero(feeData.maxPriorityFeePerGas)
            .times(normalizationConstants.fast)
            .toFixed(0, BigNumber.ROUND_CEIL)
            .toString()
        }
      },
      average: {
        txFee: bnOrZero(bn(fees.standard).times(gasLimit)).toPrecision(),
        chainSpecific: {
          gasLimit,
          gasPrice: bnOrZero(fees.standard).toString(),
          maxFeePerGas: bnOrZero(feeData.maxFeePerGas)
            .times(normalizationConstants.average)
            .toFixed(0, BigNumber.ROUND_CEIL)
            .toString(),
          maxPriorityFeePerGas: bnOrZero(feeData.maxPriorityFeePerGas)
            .times(normalizationConstants.average)
            .toFixed(0, BigNumber.ROUND_CEIL)
            .toString()
        }
      },
      slow: {
        txFee: bnOrZero(bn(fees.low).times(gasLimit)).toPrecision(),
        chainSpecific: {
          gasLimit,
          gasPrice: bnOrZero(fees.low).toString(),
          maxFeePerGas: bnOrZero(feeData.maxFeePerGas)
            .times(normalizationConstants.slow)
            .toFixed(0, BigNumber.ROUND_CEIL)
            .toString(),
          maxPriorityFeePerGas: bnOrZero(feeData.maxPriorityFeePerGas)
            .times(normalizationConstants.slow)
            .toFixed(0, BigNumber.ROUND_CEIL)
            .toString()
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
    onMessage: (msg: chainAdapters.Transaction<ChainTypes.Ethereum>) => void,
    onError: (err: chainAdapters.SubscribeError) => void
  ): Promise<void> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = input

    const address = await this.getAddress({ wallet, bip44Params })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
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
          chain: ChainTypes.Ethereum,
          confirmations: tx.confirmations,
          fee: tx.fee,
          status: getStatus(tx.status),
          tradeDetails: tx.trade,
          transfers,
          txid: tx.txid,
          ...(tx.data && {
            data: {
              method: tx.data.method,
              parser: tx.data.parser ?? 'unknown'
            }
          })
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
