import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, optimismAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import { ErrorHandler } from '../../error/ErrorHandler'
import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bnOrZero } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.OptimismMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.OptimismMainnet

export const isOptimismChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.OptimismMainnet
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.OptimismMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Optimism),
    accountNumber: 0,
  }

  private readonly api: unchained.optimism.V1Api

  constructor(args: ChainAdapterArgs<unchained.optimism.V1Api>) {
    super({
      assetId: optimismAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.optimism.TransactionParser({
        assetId: optimismAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.api = args.providers.http
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Optimism
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Optimism,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.OptimismMainnet {
    return KnownChainIds.OptimismMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    try {
      const { fast, average, slow, l1GasPrice } = await this.api.getGasFees()

      return {
        fast: { ...fast, l1GasPrice },
        average: { ...average, l1GasPrice },
        slow: { ...slow, l1GasPrice },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getGasFeeData',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.OptimismMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.OptimismMainnet>> {
    try {
      const req = await this.buildEstimateGasRequest(input)

      const { gasLimit, l1GasLimit } = await this.api.estimateGas(req)
      const { fast, average, slow } = await this.getGasFeeData()

      return {
        fast: {
          txFee: bnOrZero(
            BigNumber.max(fast.gasPrice, fast.maxFeePerGas ?? 0)
              .times(gasLimit)
              .plus(bnOrZero(fast.l1GasPrice).times(l1GasLimit)),
          ).toFixed(0),
          chainSpecific: { gasLimit, l1GasLimit, ...fast },
        },
        average: {
          txFee: bnOrZero(
            BigNumber.max(average.gasPrice, average.maxFeePerGas ?? 0)
              .times(gasLimit)
              .plus(bnOrZero(average.l1GasPrice).times(l1GasLimit)),
          ).toFixed(0),
          chainSpecific: { gasLimit, l1GasLimit, ...average },
        },
        slow: {
          txFee: bnOrZero(
            BigNumber.max(slow.gasPrice, slow.maxFeePerGas ?? 0)
              .times(gasLimit)
              .plus(bnOrZero(slow.l1GasPrice).times(l1GasLimit)),
          ).toFixed(0),
          chainSpecific: { gasLimit, l1GasLimit, ...slow },
        },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }
}
