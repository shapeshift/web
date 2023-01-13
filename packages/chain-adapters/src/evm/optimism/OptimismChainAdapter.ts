import { ASSET_REFERENCE, AssetId, optimismAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName, GasFeeDataEstimate } from '../../types'
import { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { bn } from '../../utils/bignumber'
import { calcFee, ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.OptimismMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.OptimismMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.OptimismMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Optimism),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

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

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const feeData = await this.providers.http.getGasFees()

    const nc = { fast: bn(1.1), average: bn(1), slow: bn(0.9) }

    return {
      fast: {
        gasPrice: calcFee(feeData.gasPrice, 'fast', nc),
      },
      average: {
        gasPrice: calcFee(feeData.gasPrice, 'average', nc),
      },
      slow: {
        gasPrice: calcFee(feeData.gasPrice, 'slow', nc),
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.OptimismMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.OptimismMainnet>> {
    const gasFeeData = await this.getGasFeeData()
    return this.estimateFeeData({ ...input, gasFeeData })
  }
}
