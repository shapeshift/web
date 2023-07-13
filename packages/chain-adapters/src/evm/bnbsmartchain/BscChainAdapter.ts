import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, bscAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bnOrZero } from '../../utils/bignumber'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BnbSmartChainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BnbSmartChainMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BnbSmartChainMainnet> {
  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.BnbSmartChain),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs<unchained.bnbsmartchain.V1Api>) {
    super({
      assetId: bscAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.bnbsmartchain.TransactionParser({
        assetId: bscAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
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

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.BnbSmartChainMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.BnbSmartChainMainnet>> {
    const req = await this.buildEstimateGasRequest(input)

    const { gasLimit } = await this.providers.http.estimateGas(req)
    const { fast, average, slow } = await this.getGasFeeData()

    // Binance official JSON-RPC endpoint has a minimum enforced gas price of 3 Gwei
    const MIN_GAS_PRICE = '3000000000'

    const fastGasPriceOrMinimum = BigNumber.max(fast.gasPrice, MIN_GAS_PRICE)
    const averageGasPriceOrMinimum = BigNumber.max(average.gasPrice, MIN_GAS_PRICE)
    const slowGasPriceOrMinimum = BigNumber.max(slow.gasPrice, MIN_GAS_PRICE)

    return {
      fast: {
        txFee: bnOrZero(
          BigNumber.max(fastGasPriceOrMinimum, fast.maxFeePerGas ?? 0).times(gasLimit),
        ).toFixed(0),
        chainSpecific: { gasLimit, ...fast, gasPrice: fastGasPriceOrMinimum.toFixed(0) },
      },
      average: {
        txFee: bnOrZero(
          BigNumber.max(averageGasPriceOrMinimum, average.maxFeePerGas ?? 0).times(gasLimit),
        ).toFixed(0),
        chainSpecific: { gasLimit, ...average, gasPrice: averageGasPriceOrMinimum.toFixed(0) },
      },
      slow: {
        txFee: bnOrZero(
          BigNumber.max(slowGasPriceOrMinimum, slow.maxFeePerGas ?? 0).times(gasLimit),
        ).toFixed(0),
        chainSpecific: { gasLimit, ...slow, gasPrice: slowGasPriceOrMinimum.toFixed(0) },
      },
    } as FeeDataEstimate<KnownChainIds.BnbSmartChainMainnet>
  }
}
