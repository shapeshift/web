import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, baseAssetId } from '@shapeshiftoss/caip'
import { viemBaseClient } from '@shapeshiftoss/contracts'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import type { Hex } from 'viem'

import { ErrorHandler } from '../../error/ErrorHandler'
import type { BroadcastTransactionInput, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION } from '../../types'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import type { ChainAdapterArgs } from '../EvmBaseAdapter'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate, GasLimitEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.BaseMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.BaseMainnet

export const isBaseChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.BaseMainnet
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BaseMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Base),
    accountNumber: 0,
  }

  private readonly api: unchained.base.V1Api

  constructor(args: ChainAdapterArgs<unchained.base.V1Api>) {
    super({
      assetId: baseAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: new unchained.base.TransactionParser({
        assetId: baseAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        rpcUrl: args.rpcUrl,
        api: args.providers.http,
      }),
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })

    this.api = args.providers.http
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Base
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Base)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.BaseMainnet {
    return KnownChainIds.BaseMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    try {
      const { fast, average, slow, l1GasPrice } = await this.api.getGasFees()

      return {
        fast: { ...fast, l1GasPrice },
        average: { ...average, l1GasPrice },
        slow: { ...slow, l1GasPrice },
      }
    } catch (err) {
      return this.getGasFeeDataRpcFallback(err)
    }
  }

  async getGasLimit(input: GetFeeDataInput<KnownChainIds.BaseMainnet>): Promise<GasLimitEstimate> {
    const estimateGasBody = this.buildEstimateGasBody(input)

    try {
      const { gasLimit, l1GasLimit } = await this.api.estimateGas({ estimateGasBody })
      return { gasLimit, l1GasLimit }
    } catch (err) {
      // RPC fallback has no L1 data, so the L1 fee reads 0 until unchained recovers
      return { gasLimit: await this.estimateGasRpcFallback(estimateGasBody, err) }
    }
  }

  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const txHash = await viemBaseClient.sendRawTransaction({
        serializedTransaction: hex as Hex,
      })

      return txHash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }
}
