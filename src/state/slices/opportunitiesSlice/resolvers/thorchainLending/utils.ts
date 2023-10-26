import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import { getAccountAddresses, toThorBaseUnit } from '../thorchainsavers/utils'
import type {
  Borrower,
  BorrowersResponse,
  BorrowersResponseSuccess,
  LendingDepositQuoteResponse,
  LendingWithdrawQuoteResponse,
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
}): Promise<Result<LendingDepositQuoteResponse, string>> => {
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

  try {
    const url =
      `${REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/quote/loan/open` +
      `?from_asset=${collateralAssetId}` +
      `&amount=${amountCryptoThorBaseUnit.toString()}` +
      `&to_asset=${receiveAssetId}` +
      `&destination=${receiveAssetAddress}`

    const { data } = await axios.get<LendingDepositQuoteResponse>(url)
    if (!data || 'error' in data)
      return Err('Error fetching Thorchain lending deposit quote: no data received')

    return Ok(data)
  } catch (error) {
    console.error('Error fetching Thorchain lending deposit quote:', error)
    return Err(
      `Error fetching Thorchain lending deposit quote: ${
        error instanceof Error ? error.message : error
      }`,
    )
  }
}

// Note, this isn't exhaustive. These are the minimum viable fields for this to work
// but we might need e.g min_out
// see https://thornode.ninerealms.com/thorchain/doc
export const getMaybeThorchainLendingCloseQuote = async ({
  repaymentAssetId,
  repaymentAmountBaseUnit,
  collateralAssetId,
  loanOwner,
}: {
  repaymentAssetId: AssetId
  repaymentAmountBaseUnit: BigNumber.Value | null | undefined
  collateralAssetId: AssetId
  loanOwner: string
}): Promise<Result<LendingWithdrawQuoteResponse, string>> => {
  if (!repaymentAmountBaseUnit) {
    return Err('Repayment amount is required')
  }

  const repaymentAsset = selectAssetById(store.getState(), repaymentAssetId)
  if (!repaymentAsset) return Err(`Asset not found for assetId ${repaymentAssetId}`)
  const from_asset = assetIdToPoolAssetId({ assetId: repaymentAssetId })
  if (!from_asset) return Err(`Pool asset not found for assetId ${repaymentAssetId}`)
  const to_asset = assetIdToPoolAssetId({ assetId: collateralAssetId })
  if (!to_asset) return Err(`Pool asset not found for assetId ${collateralAssetId}`)

  const amount = toThorBaseUnit({
    valueCryptoBaseUnit: repaymentAmountBaseUnit,
    asset: repaymentAsset,
  })

  const url =
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/quote/loan/close` +
    `?from_asset=${from_asset}` +
    `&amount=${amount.toString()}` +
    `&to_asset=${to_asset}` +
    `&loan_owner=${loanOwner}`

  try {
    const { data: quoteData } = await axios.get<LendingWithdrawQuoteResponse>(url)
    if (!quoteData) {
      return Err('No data received from THORChain')
    }
    if ('error' in quoteData) {
      return Err(quoteData.error)
    }
    return Ok(quoteData)
  } catch (error) {
    return Err(`Error fetching THORChain lending withdraw quote: ${error}`)
  }
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
