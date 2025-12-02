import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, zecAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { ErrorHandler } from '../../error/ErrorHandler'
import type { FeeDataEstimate, GetFeeDataInput } from '../../types'
import { ChainAdapterDisplayName } from '../../types'
import type { ChainAdapterArgs as BaseChainAdapterArgs } from '../UtxoBaseAdapter'
import { UtxoBaseAdapter } from '../UtxoBaseAdapter'
import { utxoSelect } from '../utxoSelect'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.ZcashMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.ZcashMainnet
const SUPPORTED_ACCOUNT_TYPES = [UtxoAccountType.P2pkh]

export interface ChainAdapterArgs extends BaseChainAdapterArgs {
  mayaMidgardUrl: string
}

export class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.ZcashMainnet> {
  public static readonly defaultUtxoAccountType = UtxoAccountType.P2pkh
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Zcash),
    accountNumber: 0,
  }

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: zecAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      defaultUtxoAccountType: ChainAdapter.defaultUtxoAccountType,
      parser: new unchained.zcash.TransactionParser({
        assetId: zecAssetId,
        chainId: args.chainId ?? DEFAULT_CHAIN_ID,
        midgardUrl: args.mayaMidgardUrl,
      }),
      supportedAccountTypes: SUPPORTED_ACCOUNT_TYPES,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      ...args,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Zcash
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Zcash)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getType(): KnownChainIds.ZcashMainnet {
    return KnownChainIds.ZcashMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { from, pubkey, opReturnData },
    sendMax = false,
  }: GetFeeDataInput<KnownChainIds.ZcashMainnet>): Promise<
    FeeDataEstimate<KnownChainIds.ZcashMainnet>
  > {
    try {
      if (!to) throw new Error('to is required')
      if (!value) throw new Error('value is required')
      if (!pubkey) throw new Error('pubkey is required')

      const utxos = await this.providers.http.getUtxos({ pubkey })

      const utxoSelectInput = { from, to, value, opReturnData, utxos, sendMax }

      // TODO: convert zip317 fees to satsPerByte for proper utxo selection and fees
      const fastPerByte = '0'
      const averagePerByte = '0'
      const slowPerByte = '0'

      const { fee: fastFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: fastPerByte })
      const { fee: averageFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: averagePerByte })
      const { fee: slowFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: slowPerByte })

      return {
        fast: { txFee: String(fastFee), chainSpecific: { satoshiPerByte: fastPerByte } },
        average: { txFee: String(averageFee), chainSpecific: { satoshiPerByte: averagePerByte } },
        slow: { txFee: String(slowFee), chainSpecific: { satoshiPerByte: slowPerByte } },
      } as FeeDataEstimate<KnownChainIds.ZcashMainnet>
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }
}
