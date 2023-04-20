import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, ethAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import type {
  FeeDataEstimate,
  GetFeeDataInput,
  ValidAddressResult,
  ZrxGasApiResponse,
} from '../../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../../types'
import { bnOrZero } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'
import { getTxFee } from '../utils'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.EthereumMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.EthereumMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ethereum),
    accountNumber: 0,
  }

  private readonly api: unchained.ethereum.V1Api

  constructor(args: ChainAdapterArgs<unchained.ethereum.V1Api>) {
    super({
      assetId: ethAssetId,
      chainId: DEFAULT_CHAIN_ID,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      parser: new unchained.ethereum.TransactionParser({
        assetId: ethAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.api = args.providers.http
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Ethereum
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Ethereum,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.EthereumMainnet {
    return KnownChainIds.EthereumMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const { data: responseData } = await axios.get<ZrxGasApiResponse>('https://gas.api.0x.org/')
    const medianFees = responseData.result.find(result => result.source === 'MEDIAN')

    if (!medianFees) throw new TypeError('ETH Gas Fees should always exist')

    const { fast, average, slow } = await this.api.getGasFees()

    return {
      fast: {
        gasPrice: bnOrZero(medianFees.fast).toString(),
        maxFeePerGas: fast.maxFeePerGas,
        maxPriorityFeePerGas: fast.maxPriorityFeePerGas,
      },
      average: {
        gasPrice: bnOrZero(medianFees.standard).toString(),
        maxFeePerGas: average.maxFeePerGas,
        maxPriorityFeePerGas: average.maxPriorityFeePerGas,
      },
      slow: {
        gasPrice: bnOrZero(medianFees.low).toString(),
        maxFeePerGas: slow.maxFeePerGas,
        maxPriorityFeePerGas: slow.maxPriorityFeePerGas,
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.EthereumMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const req = await this.buildEstimateGasRequest(input)

    const { gasLimit } = await this.api.estimateGas(req)
    const { fast, average, slow } = await this.getGasFeeData()

    return {
      fast: {
        txFee: getTxFee({ gasLimit, ...fast }),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: getTxFee({ gasLimit, ...average }),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: getTxFee({ gasLimit, ...slow }),
        chainSpecific: { gasLimit, ...slow },
      },
    }
  }

  validateEnsAddress(address: string): ValidAddressResult {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
