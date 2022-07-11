import { ASSET_REFERENCE, AssetId, ethAssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { bip32ToAddressNList, ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import { numberToHex } from 'web3-utils'

import { ErrorHandler } from '../../error/ErrorHandler'
import {
  BuildSendTxInput,
  FeeDataEstimate,
  GasFeeDataEstimate,
  GetFeeDataInput,
  ValidAddressResult,
  ValidAddressResultType,
  ZrxGasApiResponse
} from '../../types'
import { toPath } from '../../utils'
import { bn, bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'
import { Fees } from '../types'
import { getErc20Data } from '../utils'
import { BuildCustomTxInput } from './types'

const SUPPORTED_CHAIN_IDS = [ethChainId]
const DEFAULT_CHAIN_ID = ethChainId

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ethereum),
    accountNumber: 0
  }

  constructor(args: ChainAdapterArgs) {
    super({ chainId: DEFAULT_CHAIN_ID, supportedChainIds: SUPPORTED_CHAIN_IDS, ...args })

    this.assetId = ethAssetId
    this.parser = new unchained.ethereum.TransactionParser({
      chainId: this.chainId,
      rpcUrl: this.rpcUrl
    })
  }

  getType(): KnownChainIds.EthereumMainnet {
    return KnownChainIds.EthereumMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async buildSendTransaction(tx: BuildSendTxInput<KnownChainIds.EthereumMainnet>): Promise<{
    txToSign: ETHSignTx
  }> {
    try {
      const { to, wallet, bip44Params = ChainAdapter.defaultBIP44Params, sendMax = false } = tx
      const { erc20ContractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } =
        tx.chainSpecific

      if (!tx.to) throw new Error('EthereumChainAdapter: to is required')
      if (!tx.value) throw new Error('EthereumChainAdapter: value is required')

      const destAddress = erc20ContractAddress ?? to

      const from = await this.getAddress({ bip44Params, wallet })
      const account = await this.getAccount(from)

      const isErc20Send = !!erc20ContractAddress

      if (sendMax) {
        if (isErc20Send) {
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

      const fees = ((): Fees => {
        if (maxFeePerGas && maxPriorityFeePerGas) {
          return {
            maxFeePerGas: numberToHex(maxFeePerGas),
            maxPriorityFeePerGas: numberToHex(maxPriorityFeePerGas)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { gasPrice: numberToHex(tx.chainSpecific.gasPrice!) }
      })()

      const txToSign: ETHSignTx = {
        addressNList: bip32ToAddressNList(toPath(bip44Params)),
        value: numberToHex(isErc20Send ? '0' : tx?.value),
        to: destAddress,
        chainId: 1, // TODO: implement for multiple chains
        data,
        nonce: numberToHex(account.chainSpecific.nonce),
        gasLimit: numberToHex(gasLimit),
        ...fees
      }
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildCustomTx(tx: BuildCustomTxInput): Promise<{
    txToSign: ETHSignTx
  }> {
    try {
      const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = tx

      const from = await this.getAddress({ bip44Params, wallet })
      const account = await this.getAccount(from)

      const fees = ((): Fees => {
        if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
          return {
            maxFeePerGas: numberToHex(tx.maxFeePerGas),
            maxPriorityFeePerGas: numberToHex(tx.maxPriorityFeePerGas)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { gasPrice: numberToHex(tx.gasPrice!) }
      })()

      const txToSign: ETHSignTx = {
        addressNList: bip32ToAddressNList(toPath(bip44Params)),
        value: tx.value,
        to: tx.to,
        chainId: 1, // TODO: implement for multiple chains
        data: tx.data,
        nonce: numberToHex(account.chainSpecific.nonce),
        gasLimit: numberToHex(tx.gasLimit),
        ...fees
      }

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const { data: responseData } = await axios.get<ZrxGasApiResponse>('https://gas.api.0x.org/')
    const medianFees = responseData.result.find((result) => result.source === 'MEDIAN')

    if (!medianFees) throw new TypeError('ETH Gas Fees should always exist')

    const feeData = (await this.providers.http.getGasFees()).data
    const normalizationConstants = {
      fast: bnOrZero(bn(medianFees.fast).dividedBy(medianFees.standard)),
      average: bn(1),
      slow: bnOrZero(bn(medianFees.low).dividedBy(medianFees.standard))
    }

    const calcFee = (
      fee: string | number | BigNumber,
      speed: 'slow' | 'average' | 'fast'
    ): string => {
      return bnOrZero(fee)
        .times(normalizationConstants[speed])
        .toFixed(0, BigNumber.ROUND_CEIL)
        .toString()
    }

    return {
      fast: {
        gasPrice: bnOrZero(medianFees.fast).toString(),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'fast'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'fast')
      },
      average: {
        gasPrice: bnOrZero(medianFees.standard).toString(),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'average'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'average')
      },
      slow: {
        gasPrice: bnOrZero(medianFees.low).toString(),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'slow'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'slow')
      }
    }
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { contractAddress, from, contractData },
    sendMax = false
  }: GetFeeDataInput<KnownChainIds.EthereumMainnet>): Promise<
    FeeDataEstimate<KnownChainIds.EthereumMainnet>
  > {
    const isErc20Send = !!contractAddress

    // get the exact send max value for an erc20 send to ensure we have the correct input data when estimating fees
    if (sendMax && isErc20Send) {
      const account = await this.getAccount(from)
      const erc20Balance = account.chainSpecific.tokens?.find((token) => {
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

    const gasResults = await this.getGasFeeData()

    return {
      fast: {
        txFee: bnOrZero(bn(gasResults.fast.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...gasResults.fast }
      },
      average: {
        txFee: bnOrZero(bn(gasResults.average.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...gasResults.average }
      },
      slow: {
        txFee: bnOrZero(bn(gasResults.slow.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...gasResults.slow }
      }
    }
  }

  async validateEnsAddress(address: string): Promise<ValidAddressResult> {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
