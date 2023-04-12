import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, polygonAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bn, bnOrZero, calcFee } from '../../utils'
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
    const { gasPrice } = await this.api.getGasFees()

    const scalars = { fast: bn(1), average: bn(1), slow: bn(1) }

    return {
      fast: { gasPrice: calcFee(gasPrice, 'fast', scalars) },
      average: { gasPrice: calcFee(gasPrice, 'average', scalars) },
      slow: { gasPrice: calcFee(gasPrice, 'slow', scalars) },
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
        txFee: bnOrZero(bn(fast.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: bnOrZero(bn(average.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: bnOrZero(bn(slow.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...slow },
      },
    }
  }
}
