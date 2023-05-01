import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, avalancheAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bn, bnOrZero } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.AvalancheMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.AvalancheMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.AvalancheMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.AvalancheC),
    accountNumber: 0,
  }

  private readonly api: unchained.avalanche.V1Api

  constructor(args: ChainAdapterArgs<unchained.avalanche.V1Api>) {
    super({
      assetId: avalancheAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.avalanche.TransactionParser({
        assetId: avalancheAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.api = args.providers.http
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Avalanche
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Avalanche,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.AvalancheMainnet {
    return KnownChainIds.AvalancheMainnet
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
    input: GetFeeDataInput<KnownChainIds.AvalancheMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.AvalancheMainnet>> {
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
