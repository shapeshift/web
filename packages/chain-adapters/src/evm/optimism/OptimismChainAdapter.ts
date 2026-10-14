import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, optimismAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate, GasLimitEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.OptimismMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.OptimismMainnet

export const isOptimismChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.OptimismMainnet
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.OptimismMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Optimism),
    accountNumber: 0,
  }

  private readonly api: unchained.optimism.V1Api

  constructor(args: ChainAdapterArgs<unchained.optimism.V1Api>) {
    super({
      assetId: optimismAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
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
      return this.getGasFeeDataRpcFallback(err)
    }
  }

  async getGasLimit(
    input: GetFeeDataInput<KnownChainIds.OptimismMainnet>,
  ): Promise<GasLimitEstimate> {
    const estimateGasBody = this.buildEstimateGasBody(input)

    try {
      const { gasLimit, l1GasLimit } = await this.api.estimateGas({ estimateGasBody })
      return { gasLimit, l1GasLimit }
    } catch (err) {
      // RPC fallback has no L1 data, so the L1 fee reads 0 until unchained recovers
      return { gasLimit: await this.estimateGasRpcFallback(estimateGasBody, err) }
    }
  }
}
