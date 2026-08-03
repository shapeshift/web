import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import axios from 'axios'

import type { ThorchainRunepoolProviderResponseSuccess } from './types'

import { getConfig } from '@/config'
import { bnOrZero } from '@/lib/bignumber/bignumber'

export type RunePoolPosition = {
  address: string
  depositValueThorBaseUnit: string
  redeemValueThorBaseUnit: string
}

export const getRunePoolPosition = async (
  accountId: AccountId,
): Promise<RunePoolPosition | null> => {
  const address = fromAccountId(accountId).account

  const { data: runepoolInformation } = await axios.get<ThorchainRunepoolProviderResponseSuccess>(
    `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/rune_provider/${address}`,
  )

  if (bnOrZero(runepoolInformation.units).isZero()) return null

  return {
    address: runepoolInformation.rune_address,
    depositValueThorBaseUnit: bnOrZero(runepoolInformation.deposit_amount)
      .minus(runepoolInformation.withdraw_amount)
      .plus(runepoolInformation.pnl)
      .toFixed(),
    redeemValueThorBaseUnit: runepoolInformation.value,
  }
}
