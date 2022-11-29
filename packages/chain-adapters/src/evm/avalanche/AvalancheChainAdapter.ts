import { ASSET_REFERENCE, AssetId, avalancheAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import { ChainAdapterName } from '../../cosmossdk/types'
import { FeeDataEstimate, GasFeeDataEstimate, GetFeeDataInput } from '../../types'
import { bn, bnOrZero } from '../../utils/bignumber'
import { ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'
import { getErc20Data } from '../utils'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.AvalancheMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.AvalancheMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.AvalancheMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.AvalancheC),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.assetId = avalancheAssetId
    this.parser = new unchained.avalanche.TransactionParser({
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
    })
  }

  getDisplayName() {
    return ChainAdapterName.Avalanche
  }

  getType(): KnownChainIds.AvalancheMainnet {
    return KnownChainIds.AvalancheMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const feeData = await this.providers.http.getGasFees()

    const normalizationConstants = {
      fast: bn(1.2),
      average: bn(1),
      slow: bn(0.8),
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
        gasPrice: calcFee(feeData.gasPrice, 'fast'),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'fast'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'fast'),
      },
      average: {
        gasPrice: calcFee(feeData.gasPrice, 'average'),
        maxFeePerGas: calcFee(feeData.maxFeePerGas, 'average'),
        maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'average'),
      },
      slow: {
        gasPrice: calcFee(feeData.gasPrice, 'slow'),
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
  }: GetFeeDataInput<KnownChainIds.AvalancheMainnet>): Promise<
    FeeDataEstimate<KnownChainIds.AvalancheMainnet>
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
}
