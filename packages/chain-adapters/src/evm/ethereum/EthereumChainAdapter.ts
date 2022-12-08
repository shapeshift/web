import { ASSET_REFERENCE, AssetId, ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import axios from 'axios'
import BigNumber from 'bignumber.js'

import { ChainAdapterDisplayName } from '../../types'
import {
  FeeDataEstimate,
  GasFeeDataEstimate,
  GetFeeDataInput,
  ValidAddressResult,
  ValidAddressResultType,
  ZrxGasApiResponse,
} from '../../types'
import { bn, bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'
import { getErc20Data } from '../utils'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.EthereumMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.EthereumMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ethereum),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.assetId = ethAssetId
    this.parser = new unchained.ethereum.TransactionParser({
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Ethereum
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Ethereum,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.EthereumMainnet {
    return KnownChainIds.EthereumMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const { data: responseData } = await axios.get<ZrxGasApiResponse>('https://gas.api.0x.org/')
    const medianFees = responseData.result.find((result) => result.source === 'MEDIAN')

    if (!medianFees) throw new TypeError('ETH Gas Fees should always exist')

    const feeData = await this.providers.http.getGasFees()
    const normalizationConstants = {
      fast: bnOrZero(bn(medianFees.fast).dividedBy(medianFees.standard)),
      average: bn(1),
      slow: bnOrZero(bn(medianFees.low).dividedBy(medianFees.standard)),
    }

    const calcFee = (
      fee: string | number | BigNumber,
      speed: 'slow' | 'average' | 'fast',
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
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'fast'),
      },
      average: {
        gasPrice: bnOrZero(medianFees.standard).toString(),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'average'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'average'),
      },
      slow: {
        gasPrice: bnOrZero(medianFees.low).toString(),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'slow'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'slow'),
      },
    }
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { contractAddress, from, contractData },
    sendMax = false,
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

    const gasLimit = await this.providers.http.estimateGas({
      from,
      to: isErc20Send ? contractAddress : to,
      value: isErc20Send ? '0' : value,
      data,
    })

    const gasResults = await this.getGasFeeData()

    return {
      fast: {
        txFee: bnOrZero(bn(gasResults.fast.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...gasResults.fast },
      },
      average: {
        txFee: bnOrZero(bn(gasResults.average.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...gasResults.average },
      },
      slow: {
        txFee: bnOrZero(bn(gasResults.slow.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...gasResults.slow },
      },
    }
  }

  async validateEnsAddress(address: string): Promise<ValidAddressResult> {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
