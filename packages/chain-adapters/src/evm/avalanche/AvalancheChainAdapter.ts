import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, avalancheAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bn, calcFee } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'
import { getEip1559GasPrice, getTxFee } from '../utils'

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
    const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.api.getGasFees()

    const scalars = { fast: bn(1.2), average: bn(1), slow: bn(0.8) }

    return {
      fast: {
        gasPrice: calcFee(gasPrice, 'fast', scalars),
        ...(maxFeePerGas &&
          maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(maxFeePerGas, 'fast', scalars),
            maxPriorityFeePerGas: calcFee(maxPriorityFeePerGas, 'fast', scalars),
          }),
      },
      average: {
        gasPrice: calcFee(gasPrice, 'average', scalars),
        ...(maxFeePerGas &&
          maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(maxFeePerGas, 'average', scalars),
            maxPriorityFeePerGas: calcFee(maxPriorityFeePerGas, 'average', scalars),
          }),
      },
      slow: {
        gasPrice: calcFee(gasPrice, 'slow', scalars),
        ...(maxFeePerGas &&
          maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(maxFeePerGas, 'slow', scalars),
            maxPriorityFeePerGas: calcFee(maxPriorityFeePerGas, 'slow', scalars),
          }),
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.AvalancheMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.AvalancheMainnet>> {
    const req = await this.buildEstimateGasRequest(input)

    const { gasLimit } = await this.api.estimateGas(req)
    const { fast, average, slow } = await this.getGasFeeData()

    const eip1559GasPrice = getEip1559GasPrice({ fast, average, slow })

    return {
      fast: {
        txFee: getTxFee(gasLimit, fast.gasPrice, eip1559GasPrice.fast),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: getTxFee(gasLimit, average.gasPrice, eip1559GasPrice.average),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: getTxFee(gasLimit, slow.gasPrice, eip1559GasPrice.slow),
        chainSpecific: { gasLimit, ...slow },
      },
    }
  }
}
