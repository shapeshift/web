import { ASSET_REFERENCE, AssetId, optimismAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { bn, bnOrZero } from '../../utils/bignumber'
import { calcFee, ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'
import { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.OptimismMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.OptimismMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.OptimismMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Optimism),
    accountNumber: 0,
  }

  private readonly api: unchained.optimism.V1Api

  constructor(args: ChainAdapterArgs<unchained.optimism.V1Api>) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.api = args.providers.http
    this.assetId = optimismAssetId
    this.parser = new unchained.optimism.TransactionParser({
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
    })
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

  async getGasFeeData(): Promise<GasFeeDataEstimate & { l1GasPrice: string }> {
    const { gasPrice, l1GasPrice } = await this.api.getGasFees()

    const scalars = { fast: bn(1.1), average: bn(1), slow: bn(0.9) }

    return {
      fast: { gasPrice: calcFee(gasPrice, 'fast', scalars) },
      average: { gasPrice: calcFee(gasPrice, 'average', scalars) },
      slow: { gasPrice: calcFee(gasPrice, 'slow', scalars) },
      l1GasPrice,
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.OptimismMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.OptimismMainnet>> {
    const req = await this.buildEstimateGasRequest(input)

    const { gasLimit, l1GasLimit } = await this.api.estimateGas(req)
    const { fast, average, slow, l1GasPrice } = await this.getGasFeeData()

    return {
      fast: {
        txFee: bnOrZero(
          bn(fast.gasPrice).times(gasLimit).plus(bn(l1GasPrice).times(l1GasLimit)),
        ).toPrecision(),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: bnOrZero(
          bn(average.gasPrice).times(gasLimit).plus(bn(l1GasPrice).times(l1GasLimit)),
        ).toPrecision(),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: bnOrZero(
          bn(slow.gasPrice).times(gasLimit).plus(bn(l1GasPrice).times(l1GasLimit)),
        ).toPrecision(),
        chainSpecific: { gasLimit, ...slow },
      },
    }
  }
}
