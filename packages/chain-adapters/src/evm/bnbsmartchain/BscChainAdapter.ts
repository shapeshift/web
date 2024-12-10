import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, bscAssetId } from '@shapeshiftoss/caip'
import type { DefaultBIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'

import { ErrorHandler } from '../../error/ErrorHandler'
import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import { bn, bnOrZero } from '../../utils/bignumber'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BnbSmartChainMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BnbSmartChainMainnet

export interface ChainAdapterArgs extends BaseChainAdapterArgs<unchained.bnbsmartchain.V1Api> {
  midgardUrl: string
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BnbSmartChainMainnet> {
  public static readonly defaultBIP44Params: DefaultBIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.BnbSmartChain),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: bscAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.bnbsmartchain.TransactionParser({
        assetId: bscAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
        midgardUrl: args.midgardUrl,
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

  async getGasFeeData(): Promise<GasFeeDataEstimate & { baseFeePerGas?: string }> {
    try {
      const { fast, average, slow, baseFeePerGas } = await this.providers.http.getGasFees()
      return { fast, average, slow, baseFeePerGas }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getGasFeeData',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.BnbSmartChainMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.BnbSmartChainMainnet>> {
    try {
      const req = await this.buildEstimateGasRequest(input)

      const { gasLimit } = await this.providers.http.estimateGas(req)
      const { fast, average, slow, baseFeePerGas } = await this.getGasFeeData()

      // Binance official JSON-RPC endpoint has a minimum enforced gas price of 3 Gwei
      const MIN_GAS_PRICE = '3000000000'

      ;[fast, average, slow].forEach(estimate => {
        estimate.gasPrice = BigNumber.max(estimate.gasPrice, MIN_GAS_PRICE).toFixed(0)

        if (estimate.maxFeePerGas) {
          estimate.maxFeePerGas = BigNumber.max(estimate.maxFeePerGas, MIN_GAS_PRICE).toFixed(0)
        }

        if (estimate.maxPriorityFeePerGas) {
          estimate.maxPriorityFeePerGas = BigNumber.max(
            bn(estimate.maxPriorityFeePerGas).plus(bnOrZero(baseFeePerGas)),
            MIN_GAS_PRICE,
          )
            .minus(bnOrZero(baseFeePerGas))
            .toFixed(0)
        }
      })

      return {
        fast: {
          txFee: bnOrZero(
            BigNumber.max(fast.gasPrice, fast.maxFeePerGas ?? 0).times(gasLimit),
          ).toFixed(0),
          chainSpecific: { gasLimit, ...fast, gasPrice: fast.gasPrice },
        },
        average: {
          txFee: bnOrZero(
            BigNumber.max(average.gasPrice, average.maxFeePerGas ?? 0).times(gasLimit),
          ).toFixed(0),
          chainSpecific: { gasLimit, ...average, gasPrice: average.gasPrice },
        },
        slow: {
          txFee: bnOrZero(
            BigNumber.max(slow.gasPrice, slow.maxFeePerGas ?? 0).times(gasLimit),
          ).toFixed(0),
          chainSpecific: { gasLimit, ...slow, gasPrice: slow.gasPrice },
        },
      } as FeeDataEstimate<KnownChainIds.BnbSmartChainMainnet>
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }
}
