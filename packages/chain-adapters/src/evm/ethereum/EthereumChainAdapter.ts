import { ASSET_REFERENCE, AssetId, ethAssetId } from '@shapeshiftoss/caip'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import axios from 'axios'

import { ChainAdapterDisplayName, GasFeeDataEstimate } from '../../types'
import {
  FeeDataEstimate,
  GetFeeDataInput,
  ValidAddressResult,
  ValidAddressResultType,
  ZrxGasApiResponse,
} from '../../types'
import { bn, bnOrZero } from '../../utils/bignumber'
import { calcFee, ChainAdapterArgs, EvmBaseAdapter } from '../EvmBaseAdapter'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.EthereumMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.EthereumMainnet

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.EthereumMainnet> {
  static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Ethereum),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      chainId: DEFAULT_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      defaultBIP44Params: ChainAdapter.defaultBIP44Params,
      ...args,
    })

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

    const feeData = await this.providers.http.getGasFees()

    const nc = {
      fast: bnOrZero(bn(medianFees.fast).dividedBy(medianFees.standard)),
      average: bn(1),
      slow: bnOrZero(bn(medianFees.low).dividedBy(medianFees.standard)),
    }

    return {
      fast: {
        gasPrice: bnOrZero(medianFees.fast).toString(),
        ...(feeData.maxFeePerGas &&
          feeData.maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(feeData.maxFeePerGas, 'fast', nc),
            maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'fast', nc),
          }),
      },
      average: {
        gasPrice: bnOrZero(medianFees.standard).toString(),
        ...(feeData.maxFeePerGas &&
          feeData.maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(feeData.maxFeePerGas, 'average', nc),
            maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'average', nc),
          }),
      },
      slow: {
        gasPrice: bnOrZero(medianFees.low).toString(),
        ...(feeData.maxFeePerGas &&
          feeData.maxPriorityFeePerGas && {
            maxFeePerGas: calcFee(feeData.maxFeePerGas, 'slow', nc),
            maxPriorityFeePerGas: calcFee(feeData.maxPriorityFeePerGas, 'slow', nc),
          }),
      },
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.EthereumMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.EthereumMainnet>> {
    const gasFeeData = await this.getGasFeeData()
    return this.estimateFeeData({ ...input, gasFeeData })
  }

  async validateEnsAddress(address: string): Promise<ValidAddressResult> {
    const isValidEnsAddress = /^([0-9A-Z]([-0-9A-Z]*[0-9A-Z])?\.)+eth$/i.test(address)
    if (isValidEnsAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }
}
