import { ASSET_REFERENCE, AssetId, avalancheAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName, GasFeeDataEstimate } from '../../types'
import { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { bn } from '../../utils/bignumber'
import { calcFee, ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'

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
    const feeData = await this.providers.http.getGasFees()

    const nc = { fast: bn(1.2), average: bn(1), slow: bn(0.8) }

    return {
      fast: {
        gasPrice: calcFee(feeData.gasPrice, 'fast', nc),
        ...(feeData.maxFeePerGas &&
          feeData.maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(feeData.maxFeePerGas, 'fast', nc),
            maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'fast', nc),
          }),
      },
      average: {
        gasPrice: calcFee(feeData.gasPrice, 'average', nc),
        ...(feeData.maxFeePerGas &&
          feeData.maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(feeData.maxFeePerGas, 'average', nc),
            maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'average', nc),
          }),
      },
      slow: {
        gasPrice: calcFee(feeData.gasPrice, 'slow', nc),
        ...(feeData.maxFeePerGas &&
          feeData.maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(feeData.maxFeePerGas, 'slow', nc),
            maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'slow', nc),
          }),
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.AvalancheMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.AvalancheMainnet>> {
    const gasFeeData = await this.getGasFeeData()
    return this.estimateFeeData({ ...input, gasFeeData })
  }
}
