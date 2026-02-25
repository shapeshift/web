import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET } from '@/lib/chainflip/constants'
import type { ChainflipAssetSymbol, ChainflipLoanAccount } from '@/lib/chainflip/types'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipOraclePrices } from '@/pages/ChainflipLending/hooks/useChainflipOraclePrices'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

export type CollateralWithFiat = {
  assetId: AssetId
  chain: string
  asset: string
  amountCryptoBaseUnit: string
  amountCryptoPrecision: string
  amountFiat: string
}

export type LoanWithFiat = {
  loanId: number
  assetId: AssetId
  chain: string
  asset: string
  principalAmountCryptoBaseUnit: string
  principalAmountCryptoPrecision: string
  principalAmountFiat: string
  createdAt: number
}

const FIFTEEN_SECONDS = 15_000

const hexToBaseUnit = (hex: string): string => {
  try {
    return BigInt(hex).toString()
  } catch {
    return '0'
  }
}

const baseUnitToPrecision = (baseUnit: string, precision: number): string =>
  bnOrZero(baseUnit).div(bnOrZero(10).pow(precision)).toFixed()

export const useChainflipLoanAccount = () => {
  const { scAccount } = useChainflipLendingAccount()
  const { oraclePriceByAssetId } = useChainflipOraclePrices()

  const { data: loanAccountsData, isLoading } = useQuery({
    ...reactQueries.chainflipLending.loanAccounts(scAccount ?? ''),
    enabled: !!scAccount,
    staleTime: FIFTEEN_SECONDS,
  })

  const loanAccount: ChainflipLoanAccount | undefined = useMemo(() => {
    if (!loanAccountsData || !scAccount) return undefined
    return loanAccountsData.find(account => account.account === scAccount)
  }, [loanAccountsData, scAccount])

  const rawCollateral = useMemo(() => loanAccount?.collateral ?? [], [loanAccount?.collateral])
  const rawLoans = useMemo(() => loanAccount?.loans ?? [], [loanAccount?.loans])

  const collateralAssetData = useAppSelector(state =>
    rawCollateral.map(c => {
      const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[c.asset as ChainflipAssetSymbol]
      if (!assetId) return { assetId: undefined, precision: 0 }
      const asset = selectAssetById(state, assetId)
      return { assetId, precision: asset?.precision ?? 0 }
    }),
  )

  const loanAssetData = useAppSelector(state =>
    rawLoans.map(l => {
      const assetId = CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET[l.asset.asset as ChainflipAssetSymbol]
      if (!assetId) return { assetId: undefined, precision: 0 }
      const asset = selectAssetById(state, assetId)
      return { assetId, precision: asset?.precision ?? 0 }
    }),
  )

  const collateralWithFiat: CollateralWithFiat[] = useMemo(() => {
    if (!rawCollateral.length) return []

    return rawCollateral.reduce<CollateralWithFiat[]>((acc, collateral, i) => {
      const { assetId, precision } = collateralAssetData[i]
      if (!assetId) return acc

      const price = oraclePriceByAssetId[assetId] ?? '0'
      const amountBaseUnit = hexToBaseUnit(collateral.amount)
      const amountCrypto = baseUnitToPrecision(amountBaseUnit, precision)
      const amountFiat = bnOrZero(amountCrypto).times(price).toFixed(2)

      acc.push({
        assetId,
        chain: collateral.chain,
        asset: collateral.asset,
        amountCryptoBaseUnit: amountBaseUnit,
        amountCryptoPrecision: amountCrypto,
        amountFiat,
      })

      return acc
    }, [])
  }, [rawCollateral, collateralAssetData, oraclePriceByAssetId])

  const loansWithFiat: LoanWithFiat[] = useMemo(() => {
    if (!rawLoans.length) return []

    return rawLoans.reduce<LoanWithFiat[]>((acc, loan, i) => {
      const { assetId, precision } = loanAssetData[i]
      if (!assetId) return acc

      const price = oraclePriceByAssetId[assetId] ?? '0'
      const principalBaseUnit = hexToBaseUnit(loan.principal_amount)
      const principalCrypto = baseUnitToPrecision(principalBaseUnit, precision)
      const principalFiat = bnOrZero(principalCrypto).times(price).toFixed(2)

      acc.push({
        loanId: loan.loan_id,
        assetId,
        chain: loan.asset.chain,
        asset: loan.asset.asset,
        principalAmountCryptoBaseUnit: principalBaseUnit,
        principalAmountCryptoPrecision: principalCrypto,
        principalAmountFiat: principalFiat,
        createdAt: loan.created_at,
      })

      return acc
    }, [])
  }, [rawLoans, loanAssetData, oraclePriceByAssetId])

  const totalCollateralFiat = useMemo(
    () => collateralWithFiat.reduce((sum, c) => sum.plus(c.amountFiat), bnOrZero(0)).toFixed(2),
    [collateralWithFiat],
  )

  const totalBorrowedFiat = useMemo(
    () => loansWithFiat.reduce((sum, l) => sum.plus(l.principalAmountFiat), bnOrZero(0)).toFixed(2),
    [loansWithFiat],
  )

  return useMemo(
    () => ({
      loanAccount,
      collateralWithFiat,
      loansWithFiat,
      totalCollateralFiat,
      totalBorrowedFiat,
      isLoading,
    }),
    [
      loanAccount,
      collateralWithFiat,
      loansWithFiat,
      totalCollateralFiat,
      totalBorrowedFiat,
      isLoading,
    ],
  )
}
