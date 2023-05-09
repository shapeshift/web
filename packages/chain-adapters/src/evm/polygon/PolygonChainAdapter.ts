import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, polygonAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bn, bnOrZero } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.PolygonMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.PolygonMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.PolygonMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Polygon),
    accountNumber: 0,
  }

  private readonly api: unchained.polygon.V1Api

  constructor(args: ChainAdapterArgs<unchained.polygon.V1Api>) {
    super({
      assetId: polygonAssetId,
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.polygon.TransactionParser({
        assetId: polygonAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      ...args,
    })
    this.api = args.providers.http
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Polygon
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Polygon,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.PolygonMainnet {
    return KnownChainIds.PolygonMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const { fast, average, slow } = await this.api.getGasFees()

    return {
      fast: {
        gasPrice: fast.maxFeePerGas ?? '0',
        maxFeePerGas: fast.maxFeePerGas,
        maxPriorityFeePerGas: fast.maxPriorityFeePerGas,
      },
      average: {
        gasPrice: average.maxFeePerGas ?? '0',
        maxFeePerGas: average.maxFeePerGas,
        maxPriorityFeePerGas: average.maxPriorityFeePerGas,
      },
      slow: {
        gasPrice: slow.maxFeePerGas ?? '0',
        maxFeePerGas: slow.maxFeePerGas,
        maxPriorityFeePerGas: slow.maxPriorityFeePerGas,
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.PolygonMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.PolygonMainnet>> {
    const req = await this.buildEstimateGasRequest(input)

    const { gasLimit } = await this.api.estimateGas(req)
    const { fast, average, slow } = await this.getGasFeeData()

    return {
      fast: {
        txFee: bnOrZero(bn(fast.gasPrice).times(gasLimit)).toFixed(0),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: bnOrZero(bn(average.gasPrice).times(gasLimit)).toFixed(0),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: bnOrZero(bn(slow.gasPrice).times(gasLimit)).toFixed(0),
        chainSpecific: { gasLimit, ...slow },
      },
    }
  }
}
