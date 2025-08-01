import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'
import { convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'

import { isUtxoChainId } from '../../utxo'
import type {
  Borrower,
  BorrowersResponse,
  BorrowersResponseSuccess,
  LendingDepositQuoteResponse,
  LendingDepositQuoteResponseSuccess,
  LendingWithdrawQuoteResponse,
  LendingWithdrawQuoteResponseSuccess,
} from './types'

import { getConfig } from '@/config'
import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bn } from '@/lib/bignumber/bignumber'
import { getAccountAddresses, toThorBaseUnit } from '@/lib/utils/thorchain'
import { selectAssetById } from '@/state/slices/selectors'
import { store } from '@/state/store'

// Note, this isn't exhaustive. These are the minimum viable fields for this to work
// but we might need e.g min_out and affiliate_bps
// see https://thornode.ninerealms.com/thorchain/doc
export const getMaybeThorchainLendingOpenQuote = async ({
  collateralAssetId,
  collateralAmountCryptoBaseUnit,
  receiveAssetId,
  receiveAssetAddress,
}: {
  collateralAssetId: AssetId
  collateralAmountCryptoBaseUnit: BigNumber.Value | null | undefined
  receiveAssetId: AssetId
  receiveAssetAddress: string
}): Promise<Result<LendingDepositQuoteResponseSuccess, string>> => {
  if (!collateralAmountCryptoBaseUnit) return Err('Amount is required')
  const collateralAsset = selectAssetById(store.getState(), collateralAssetId)
  if (!collateralAsset) return Err(`Asset not found for assetId ${collateralAssetId}`)
  const amountCryptoThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: collateralAmountCryptoBaseUnit,
    asset: collateralAsset,
  })

  const from_asset = assetIdToThorPoolAssetId({ assetId: collateralAssetId })
  if (!from_asset) return Err(`Pool asset not found for assetId ${collateralAssetId}`)
  const to_asset = assetIdToThorPoolAssetId({ assetId: receiveAssetId })
  if (!to_asset) return Err(`Pool asset not found for assetId ${receiveAssetId}`)

  const { VITE_THORCHAIN_NODE_URL } = getConfig()
  if (!VITE_THORCHAIN_NODE_URL) return Err('THORChain node URL is not configured')

  // The THORChain quote endpoint expects BCH receiveAddress's to be stripped of the "bitcoincash:" prefix
  const parsedReceiveAddress = receiveAssetAddress.replace('bitcoincash:', '')

  const url =
    `${VITE_THORCHAIN_NODE_URL}/thorchain/quote/loan/open` +
    `?from_asset=${from_asset}` +
    `&amount=${amountCryptoThorBaseUnit.toString()}` +
    `&to_asset=${to_asset}` +
    `&destination=${parsedReceiveAddress}`

  const { data } = await axios.get<LendingDepositQuoteResponse>(url)
  if (!data) return Err('Could not get quote data')
  if ('error' in data) return Err(data.error)

  return Ok(data)
}

// Note, this isn't exhaustive. These are the minimum viable fields for this to work
// but we might need e.g min_out and affiliate_bps
// see https://thornode.ninerealms.com/thorchain/doc
export const getMaybeThorchainLendingCloseQuote = async ({
  collateralAssetId,
  repaymentPercent,
  repaymentAssetId,
  collateralAssetAddress,
}: {
  collateralAssetId: AssetId
  repaymentPercent: number
  repaymentAssetId: AssetId
  collateralAssetAddress: string
}): Promise<Result<LendingWithdrawQuoteResponseSuccess, string>> => {
  if (!repaymentPercent) return Err('A non-zero amount is required')

  const repaymentAsset = selectAssetById(store.getState(), repaymentAssetId)
  if (!repaymentAsset) return Err(`Asset not found for assetId ${repaymentAsset}`)
  const repayBps = convertDecimalPercentageToBasisPoints(bn(repaymentPercent).div(100).toNumber())

  const from_asset = assetIdToThorPoolAssetId({ assetId: repaymentAssetId })
  if (!from_asset) return Err(`Pool asset not found for assetId ${repaymentAssetId}`)
  const to_asset = assetIdToThorPoolAssetId({ assetId: collateralAssetId })
  if (!to_asset) return Err(`Pool asset not found for assetId ${collateralAssetId}`)

  const { VITE_THORCHAIN_NODE_URL } = getConfig()
  if (!VITE_THORCHAIN_NODE_URL) return Err('THORChain node URL is not configured')

  // The THORChain quote endpoint expects BCH receiveAddress's to be stripped of the "bitcoincash:" prefix
  const parsedCollateralAssetAddress = collateralAssetAddress.replace('bitcoincash:', '')

  const url =
    `${VITE_THORCHAIN_NODE_URL}/thorchain/quote/loan/close` +
    `?from_asset=${from_asset}` +
    `&repay_bps=${repayBps.toString()}` +
    `&to_asset=${to_asset}` +
    `&loan_owner=${parsedCollateralAssetAddress}`

  const { data } = await axios.get<LendingWithdrawQuoteResponse>(url)
  // TODO(gomes): handle "loan hasn't reached maturity" which is a legit flow, not an actual error
  // i.e
  // "failed to simulate handler: loan repayment is unavailable: loan hasn't reached maturity"
  if (!data) return Err('Could not get quote data')
  if ('error' in data) return Err(data.error)

  return Ok(data)
}

export const getAllThorchainLendingPositions = async (
  assetId: AssetId,
): Promise<BorrowersResponseSuccess> => {
  const poolAssetId = assetIdToThorPoolAssetId({ assetId })

  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<BorrowersResponse>(
    `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/pool/${poolAssetId}/borrowers`,
  )

  if (!data || 'error' in data) return []

  return data
}

export const getThorchainLendingPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId | null
  assetId: AssetId
}): Promise<Borrower | null> => {
  if (!accountId) return null

  const address = fromAccountId(accountId).account
  const poolAssetId = assetIdToThorPoolAssetId({ assetId })

  const accountPosition = await (async () => {
    if (!isUtxoChainId(fromAssetId(assetId).chainId))
      return (
        await axios.get<Borrower>(
          `${
            getConfig().VITE_THORCHAIN_NODE_URL
          }/thorchain/pool/${poolAssetId}/borrower/${address}`,
        )
      ).data

    const lendingPositionsResponse = await getAllThorchainLendingPositions(assetId)

    const allPositions = lendingPositionsResponse
    if (!allPositions.length) {
      return null
    }

    const accountAddresses = await getAccountAddresses(accountId)

    return allPositions.find(position => accountAddresses.includes(position.owner))
  })()

  return accountPosition || null
}

export const getThorchainPoolInfo = async (assetId: AssetId): Promise<ThornodePoolResponse> => {
  const { VITE_THORCHAIN_NODE_URL } = getConfig()

  if (!VITE_THORCHAIN_NODE_URL) {
    throw new Error('THORChain node URL is not configured')
  }

  const poolAssetId = assetIdToThorPoolAssetId({ assetId })
  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<ThornodePoolResponse>(
    `${VITE_THORCHAIN_NODE_URL}/thorchain/pool/${poolAssetId}`,
  )

  if (!data) {
    throw new Error('No data received from THORChain')
  }

  return data
}
