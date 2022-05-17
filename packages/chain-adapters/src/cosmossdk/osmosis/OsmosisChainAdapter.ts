import {
  AssetId,
  AssetNamespace,
  AssetReference,
  fromChainId,
  toAssetId
} from '@shapeshiftoss/caip'
import { bip32ToAddressNList, OsmosisSignTx, supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, chainAdapters, ChainTypes } from '@shapeshiftoss/types'

import { ChainAdapter as IChainAdapter } from '../../api'
import { ErrorHandler } from '../../error/ErrorHandler'
import { toPath } from '../../utils'
import { ChainAdapterArgs, CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter'
export class ChainAdapter
  extends CosmosSdkBaseAdapter<ChainTypes.Osmosis>
  implements IChainAdapter<ChainTypes.Osmosis>
{
  protected readonly supportedChainIds = ['cosmos:osmosis-1', 'cosmos:osmo-testnet-1']
  protected readonly chainId = this.supportedChainIds[0]
  protected readonly assetId: AssetId

  public static readonly defaultBIP44Params: BIP44Params = {
    purpose: 44,
    coinType: 118,
    accountNumber: 0
  }

  constructor(args: ChainAdapterArgs) {
    super(args)

    const { chain, network } = fromChainId(this.chainId)

    this.assetId = toAssetId({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Osmosis
    })
  }

  getType(): ChainTypes.Osmosis {
    return ChainTypes.Osmosis
  }

  getFeeAssetId(): AssetId {
    return 'cosmos:osmosis-1/slip44:118'
  }

  async getAddress(input: chainAdapters.GetAddressInput): Promise<string> {
    const { wallet, bip44Params = ChainAdapter.defaultBIP44Params } = input
    const path = toPath(bip44Params)
    const addressNList = bip32ToAddressNList(path)
    try {
      if (supportsOsmosis(wallet)) {
        const osmosisAddress = await wallet.osmosisGetAddress({
          addressNList,
          showDisplay: Boolean(input.showOnDevice)
        })
        if (!osmosisAddress) {
          throw new Error('Unable to generate Osmosis address')
        }
        return osmosisAddress as string
      } else {
        throw new Error('Wallet does not support Osmosis.')
      }
    } catch (error) {
      return ErrorHandler(error)
    }
  }

  async signTransaction(signTxInput: chainAdapters.SignTxInput<OsmosisSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      if (supportsOsmosis(wallet)) {
        const signedTx = await wallet.osmosisSignTx(txToSign)

        if (!signedTx) throw new Error('Error signing tx')

        return signedTx.serialized
      } else {
        throw new Error('Wallet does not support Osmosis.')
      }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(
    // @ts-ignore: keep type signature with unimplemented state
    tx: chainAdapters.BuildSendTxInput<ChainTypes.Osmosis> // eslint-disable-line @typescript-eslint/no-unused-vars -- Disable no-unused-vars lint rule for unimplemented methods
  ): Promise<{ txToSign: chainAdapters.ChainTxType<ChainTypes.Osmosis> }> {
    throw new Error('Method not implemented.')
  }

  async getFeeData(
    // @ts-ignore: keep type signature with unimplemented state
    input: Partial<chainAdapters.GetFeeDataInput<ChainTypes.Osmosis>> // eslint-disable-line @typescript-eslint/no-unused-vars -- Disable no-unused-vars lint rule for unimplemented methods
  ): Promise<chainAdapters.FeeDataEstimate<ChainTypes.Osmosis>> {
    throw new Error('Method not implemented.')
  }

  async signAndBroadcastTransaction(
    // @ts-ignore: keep type signature with unimplemented state
    signTxInput: chainAdapters.SignTxInput<OsmosisSignTx> // eslint-disable-line @typescript-eslint/no-unused-vars -- Disable no-unused-vars lint rule for unimplemented methods
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
}
