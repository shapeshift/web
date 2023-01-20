import { ASSET_REFERENCE, AssetId, ethAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import { ChainAdapterDisplayName } from '../../types'
import {
  FeeDataEstimate,
  GetFeeDataInput,
  ValidAddressResult,
  ValidAddressResultType,
  ZrxGasApiResponse,
} from '../../types'
import { bn, bnOrZero } from '../../utils/bignumber'
import { calcFee, ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'
import { GasFeeDataEstimate } from '../types'

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
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

    this.api = args.providers.http
    this.assetId = ethAssetId
    this.parser = new unchained.ethereum.TransactionParser({
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
    })
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
    const medianFees = responseData.result.find((result) => result.source === 'MEDIAN')

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

  async validateEnsAddress(address: string): Promise<ValidAddressResult> {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
