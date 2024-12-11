import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, dogeAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs } from '../UtxoBaseAdapter'
import { UtxoBaseAdapter } from '../UtxoBaseAdapter'
import { utxoSelect } from '../utxoSelect'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.DogecoinMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.DogecoinMainnet
const SUPPORTED_ACCOUNT_TYPES = [UtxoAccountType.P2pkh]

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.DogecoinMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.P2pkh
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Dogecoin),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: dogeAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      defaultUtxoAccountType: ChainAdapter.defaultUtxoAccountType,
      parser: new unchained.dogecoin.TransactionParser({
        assetId: dogeAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        midgardUrl: args.midgardUrl,
      }),
      supportedAccountTypes: SUPPORTED_ACCOUNT_TYPES,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Dogecoin
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(
      ChainAdapterDisplayName.Dogecoin,
    )
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.DogecoinMainnet {
    return KnownChainIds.DogecoinMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { from, pubkey, opReturnData },
    sendMax = false,
  }: GetFeeDataInput<KnownChainIds.DogecoinMainnet>): Promise<
    FeeDataEstimate<KnownChainIds.DogecoinMainnet>
  > {
    if (!to) throw new Error('to is required')
    if (!value) throw new Error('value is required')
    if (!pubkey) throw new Error('pubkey is required')

    const { fast, average, slow } = await this.providers.http.getNetworkFees()

    if (!(fast?.satsPerKiloByte && average?.satsPerKiloByte && slow?.satsPerKiloByte)) {
      throw new Error('UtxoBaseAdapter: failed to get fee data')
    }

    // sane default for invalid fee data from the node
    // see: https://github.com/dogecoin/dogecoin/issues/3385
    if (fast.satsPerKiloByte <= 0) fast.satsPerKiloByte = 500000000 // 5 DOGE per kB
    if (average.satsPerKiloByte <= 0) average.satsPerKiloByte = 100000000 // 1 DOGE per kB
    if (slow.satsPerKiloByte <= 0) slow.satsPerKiloByte = 50000000 // .5 DOGE per kB

    // ensure higher confirmation speeds never have lower fees than lower confirmation speeds
    if (slow.satsPerKiloByte > average.satsPerKiloByte)
      average.satsPerKiloByte = slow.satsPerKiloByte
    if (average.satsPerKiloByte > fast.satsPerKiloByte)
      fast.satsPerKiloByte = average.satsPerKiloByte

    const utxos = await this.providers.http.getUtxos({ pubkey })

    const utxoSelectInput = { from, to, value, opReturnData, utxos, sendMax }

    // We have to round because coinselect library uses sats per byte which cant be decimals
    const fastPerByte = String(Math.round(fast.satsPerKiloByte / 1000))
    const averagePerByte = String(Math.round(average.satsPerKiloByte / 1000))
    const slowPerByte = String(Math.round(slow.satsPerKiloByte / 1000))

    const { fee: fastFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: fastPerByte })
    const { fee: averageFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: averagePerByte })
    const { fee: slowFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: slowPerByte })

    return {
      fast: { txFee: String(fastFee), chainSpecific: { satoshiPerByte: fastPerByte } },
      average: { txFee: String(averageFee), chainSpecific: { satoshiPerByte: averagePerByte } },
      slow: { txFee: String(slowFee), chainSpecific: { satoshiPerByte: slowPerByte } },
    }
  }
}
