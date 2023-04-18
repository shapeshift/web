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
import { bn, bnOrZero, calcFee } from '../../utils'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'
import { getEip1559GasPrice, getTxFee } from '../utils'

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

    const { maxFeePerGas, maxPriorityFeePerGas } = await this.api.getGasFees()

    const scalars = {
      fast: bnOrZero(bn(medianFees.fast).dividedBy(medianFees.standard)),
      average: bn(1),
      slow: bnOrZero(bn(medianFees.low).dividedBy(medianFees.standard)),
    }

    return {
      fast: {
        gasPrice: bnOrZero(medianFees.fast).toString(),
        ...(maxFeePerGas &&
          maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(maxFeePerGas, 'fast', scalars),
            maxPriorityFeePerGas: calcFee(maxPriorityFeePerGas, 'fast', scalars),
          }),
      },
      average: {
        gasPrice: bnOrZero(medianFees.standard).toString(),
        ...(maxFeePerGas &&
          maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(maxFeePerGas, 'average', scalars),
            maxPriorityFeePerGas: calcFee(maxPriorityFeePerGas, 'average', scalars),
          }),
      },
      slow: {
        gasPrice: bnOrZero(medianFees.low).toString(),
        ...(maxFeePerGas &&
          maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(maxFeePerGas, 'slow', scalars),
            maxPriorityFeePerGas: calcFee(maxPriorityFeePerGas, 'slow', scalars),
          }),
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.EthereumMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
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

  validateEnsAddress(address: string): ValidAddressResult {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
