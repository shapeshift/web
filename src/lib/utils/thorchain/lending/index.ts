import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getAccountAddresses, toThorBaseUnit } from 'lib/utils/thorchain'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import type {
  Borrower,
  BorrowersResponse,
  BorrowersResponseSuccess,
  LendingDepositQuoteResponse,
  LendingDepositQuoteResponseSuccess,
  LendingWithdrawQuoteResponse,
  LendingWithdrawQuoteResponseSuccess,
} from './types'

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

  const from_asset = assetIdToPoolAssetId({ assetId: collateralAssetId })
  if (!from_asset) return Err(`Pool asset not found for assetId ${collateralAssetId}`)
  const to_asset = assetIdToPoolAssetId({ assetId: receiveAssetId })
  if (!to_asset) return Err(`Pool asset not found for assetId ${receiveAssetId}`)

  const { REACT_APP_THORCHAIN_NODE_URL } = getConfig()
  if (!REACT_APP_THORCHAIN_NODE_URL) return Err('THORChain node URL is not configured')

  const url =
    `${REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/quote/loan/open` +
    `?from_asset=${from_asset}` +
    `&amount=${amountCryptoThorBaseUnit.toString()}` +
    `&to_asset=${to_asset}` +
    `&destination=${receiveAssetAddress}`

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
  repaymentAmountCryptoBaseUnit: collateralAmountCryptoBaseUnit,
  repaymentAssetId,
  collateralAssetAddress,
}: {
  collateralAssetId: AssetId
  repaymentAmountCryptoBaseUnit: BigNumber.Value | null | undefined
  repaymentAssetId: AssetId
  collateralAssetAddress: string
}): Promise<Result<LendingWithdrawQuoteResponseSuccess, string>> => {
  if (!collateralAmountCryptoBaseUnit) return Err('Amount is required')
  const collateralAsset = selectAssetById(store.getState(), collateralAssetId)
  if (!collateralAsset) return Err(`Asset not found for assetId ${collateralAssetId}`)
  const amountCryptoThorBaseUnit = toThorBaseUnit({
    valueCryptoBaseUnit: collateralAmountCryptoBaseUnit,
    asset: collateralAsset,
  })

  const from_asset = assetIdToPoolAssetId({ assetId: repaymentAssetId })
  if (!from_asset) return Err(`Pool asset not found for assetId ${repaymentAssetId}`)
  const to_asset = assetIdToPoolAssetId({ assetId: collateralAssetId })
  if (!to_asset) return Err(`Pool asset not found for assetId ${collateralAssetId}`)

  const { REACT_APP_THORCHAIN_NODE_URL } = getConfig()
  if (!REACT_APP_THORCHAIN_NODE_URL) return Err('THORChain node URL is not configured')

  const url =
    `${REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/quote/loan/close` +
    `?from_asset=${from_asset}` +
    `&amount=${amountCryptoThorBaseUnit.toString()}` +
    `&to_asset=${to_asset}` +
    `&loan_owner=${collateralAssetAddress}`

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
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<BorrowersResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}/borrowers`,
  )

  if (!data || 'error' in data) return []

  return data
}

export const getThorchainLendingPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<Borrower | null> => {
  const lendingPositionsResponse = await getAllThorchainLendingPositions(assetId)

  const allPositions = lendingPositionsResponse
  if (!allPositions.length) {
    throw new Error(`No lending positions found for asset ID: ${assetId}`)
  }

  const accountAddresses = await getAccountAddresses(accountId)

  const accountPosition = allPositions.find(position => accountAddresses.includes(position.owner))

  return accountPosition || null
}
export const getThorchainPoolInfo = async (assetId: AssetId): Promise<ThornodePoolResponse> => {
  const { REACT_APP_THORCHAIN_NODE_URL } = getConfig()

  if (!REACT_APP_THORCHAIN_NODE_URL) {
    throw new Error('THORChain node URL is not configured')
  }

  const poolAssetId = assetIdToPoolAssetId({ assetId })
  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<ThornodePoolResponse>(
    `${REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
  )

  if (!data) {
    throw new Error('No data received from THORChain')
  }

  return data
}

export const getLtvFromCollateralizationRatio = (
  collateralizationRatio: BigNumber.Value,
): string => {
  const crDecimal = bnOrZero(collateralizationRatio).div(100)
  const ltvPercentage = bn(1).div(crDecimal).times(100).toFixed(2)
  return ltvPercentage
}
