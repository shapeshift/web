import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_REFERENCE,
  fromAssetId,
  tempoAssetId,
  tempoPathUsdAssetId,
} from '@shapeshiftoss/caip'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getAddress } from 'viem'

import type { Account, BuildSendApiTxInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import type { TokenInfo } from '../SecondClassEvmAdapter'
import { SecondClassEvmAdapter } from '../SecondClassEvmAdapter'
import type { BuildCustomApiTxInput } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.TempoMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.TempoMainnet

export type ChainAdapterArgs = {
  rpcUrl: string
  getKnownTokens: () => TokenInfo[]
}

export const isTempoChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.TempoMainnet
}

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.TempoMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Tempo),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: tempoAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    })
  }

  getDisplayName(): ChainAdapterDisplayName.Tempo {
    return ChainAdapterDisplayName.Tempo
  }

  getName(): string {
    return 'Tempo'
  }

  getType(): KnownChainIds.TempoMainnet {
    return KnownChainIds.TempoMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  private getTempoFeeTokenAddress({
    txTo,
    contractAddress,
    feeToken,
  }: {
    txTo: string
    contractAddress?: string
    feeToken?: string
  }): NonNullable<ETHSignTx['feeToken']> {
    if (feeToken) return getAddress(feeToken)
    if (contractAddress) return getAddress(contractAddress)

    const knownToken = this.getKnownTokens().find(
      token => getAddress(token.contractAddress) === getAddress(txTo),
    )
    if (knownToken) return getAddress(knownToken.contractAddress)

    return getAddress(fromAssetId(tempoPathUsdAssetId).assetReference)
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.TempoMainnet>,
  ): Promise<ETHSignTx> {
    const txToSign = await super.buildSendApiTransaction(input)

    return {
      ...txToSign,
      feeToken: this.getTempoFeeTokenAddress({
        txTo: txToSign.to,
        contractAddress: input.chainSpecific.contractAddress,
      }),
    }
  }

  async buildCustomApiTx(input: BuildCustomApiTxInput): Promise<ETHSignTx> {
    const txToSign = await super.buildCustomApiTx(input)

    return {
      ...txToSign,
      feeToken: this.getTempoFeeTokenAddress({
        txTo: input.to,
        feeToken: input.feeToken,
      }),
    }
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.TempoMainnet>> {
    const account = await super.getAccount(pubkey)

    return {
      ...account,
      balance: '0',
    }
  }
}

export type { TokenInfo }
