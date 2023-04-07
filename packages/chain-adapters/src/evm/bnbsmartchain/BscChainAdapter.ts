import { ASSET_REFERENCE, AssetId, bscAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ChainAdapterDisplayName } from '../../types'
import { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { bn, bnOrZero, calcFee } from '../../utils'
import { ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'
import { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BnbSmartChainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BnbSmartChainMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BnbSmartChainMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.BnbSmartChain),
    accountNumber: 0,
  }

  private readonly api: unchained.bnbsmartchain.V1Api

  constructor(args: ChainAdapterArgs<unchained.bnbsmartchain.V1Api>) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.api = args.providers.http
    this.assetId = bscAssetId
    this.parser = new unchained.bnbsmartchain.TransactionParser({
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.BnbSmartChain
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.BnbSmartChain,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.BnbSmartChainMainnet {
    return KnownChainIds.BnbSmartChainMainnet
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
    input: GetFeeDataInput<KnownChainIds.BnbSmartChainMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.BnbSmartChainMainnet>> {
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
