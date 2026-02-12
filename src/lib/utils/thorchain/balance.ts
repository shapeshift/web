import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'

import { isUtxoChainId } from '../utxo'
import { fromThorBaseUnit } from '.'
import type { GetThorchainSaversDepositQuoteQueryKey } from './hooks/useGetThorchainSaversDepositQuoteQuery'
import { fetchThorchainDepositQuote } from './hooks/useGetThorchainSaversDepositQuoteQuery'
import type { GetThorchainSaversWithdrawQuoteQueryKey } from './hooks/useGetThorchainSaversWithdrawQuoteQuery'
import { fetchThorchainWithdrawQuote } from './hooks/useGetThorchainSaversWithdrawQuoteQuery'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import type { EstimatedFeesQueryKey } from '@/pages/Lending/hooks/useGetEstimatedFeesQuery'
import { queryFn as getEstimatedFeesQueryFn } from '@/pages/Lending/hooks/useGetEstimatedFeesQuery'
import type { IsSweepNeededQueryKey } from '@/pages/Lending/hooks/useIsSweepNeededQuery'
import {
  getIsSweepNeeded,
  isGetSweepNeededInput,
} from '@/pages/Lending/hooks/useIsSweepNeededQuery'
import { selectPortfolioCryptoBalanceByFilter } from '@/state/slices/common-selectors'
import type { ThorchainSaversWithdrawQuoteResponseSuccess } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/types'
import { selectFeeAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { store } from '@/state/store'

// TODO(gomes): this will work for UTXO but is invalid for tokens since they use diff. denoms
// the current workaround is to not do fee deduction for non-UTXO chains,
// but for consistency, we should for native EVM assets, and ensure this is a no-op for tokens
// Note when implementing this, fee checks/deduction will need to either be done for *native* assets only
// or handle different denoms for tokens/native assets and display insufficientFundsForProtocolFee copy
const getHasEnoughBalanceForTxPlusFees = ({
  balanceCryptoBaseUnit,
  amountCryptoPrecision,
  txFeeCryptoBaseUnit,
  precision,
}: {
  balanceCryptoBaseUnit: string
  amountCryptoPrecision: string
  txFeeCryptoBaseUnit: string
  precision: number
}) => {
  const balanceCryptoBaseUnitBn = bnOrZero(balanceCryptoBaseUnit)
  if (balanceCryptoBaseUnitBn.isZero()) return false

  return bnOrZero(amountCryptoPrecision)
    .plus(BigAmount.fromBaseUnit({ value: txFeeCryptoBaseUnit, precision }).toPrecision())
    .lte(BigAmount.fromBaseUnit({ value: balanceCryptoBaseUnitBn, precision }).toPrecision())
}

const getHasEnoughBalanceForTxPlusFeesPlusSweep = ({
  balanceCryptoBaseUnit,
  amountCryptoPrecision,
  txFeeCryptoBaseUnit,
  precision,
  sweepTxFeeCryptoBaseUnit,
}: {
  balanceCryptoBaseUnit: string
  amountCryptoPrecision: string
  txFeeCryptoBaseUnit: string
  precision: number
  sweepTxFeeCryptoBaseUnit: string
}) => {
  const balanceCryptoBaseUnitBn = bnOrZero(balanceCryptoBaseUnit)
  if (balanceCryptoBaseUnitBn.isZero()) return { hasEnoughBalance: false, missingFunds: bn(0) }

  return {
    hasEnoughBalance: bnOrZero(amountCryptoPrecision)
      .plus(BigAmount.fromBaseUnit({ value: txFeeCryptoBaseUnit, precision }).toPrecision())
      .plus(BigAmount.fromBaseUnit({ value: sweepTxFeeCryptoBaseUnit, precision }).toPrecision())
      .lte(BigAmount.fromBaseUnit({ value: balanceCryptoBaseUnitBn, precision }).toPrecision()),
    missingFunds: bnOrZero(amountCryptoPrecision)
      .plus(BigAmount.fromBaseUnit({ value: txFeeCryptoBaseUnit, precision }).toPrecision())
      .plus(BigAmount.fromBaseUnit({ value: sweepTxFeeCryptoBaseUnit, precision }).toPrecision())
      .minus(BigAmount.fromBaseUnit({ value: balanceCryptoBaseUnitBn, precision }).toPrecision()),
  }
}

export const fetchHasEnoughBalanceForTxPlusFeesPlusSweep = async ({
  amountCryptoPrecision: _amountCryptoPrecision,
  accountId,
  asset,
  type,
  fromAddress,
}: {
  asset: Asset
  fromAddress: string | undefined
  amountCryptoPrecision: string
  accountId: AccountId
  type: 'deposit' | 'withdraw'
}) => {
  const isUtxoChain = isUtxoChainId(asset.chainId)
  const estimateFeesQueryEnabled = Boolean(fromAddress && accountId && isUtxoChain)

  const balanceCryptoBaseUnit = toBaseUnit(
    selectPortfolioCryptoBalanceByFilter(store.getState(), {
      assetId: asset.assetId,
      accountId,
    }),
  )
  const feeAsset = selectFeeAssetById(store.getState(), asset.assetId)
  const feeAssetMarketData = selectMarketDataByAssetIdUserCurrency(
    store.getState(),
    feeAsset?.assetId ?? '',
  )
  const quote = await (async () => {
    switch (type) {
      case 'withdraw': {
        const withdrawAmountCryptoBaseUnit = toBaseUnit(
          BigAmount.fromPrecision({
            value: _amountCryptoPrecision,
            precision: asset.precision,
          }),
        )

        const thorchainSaversWithdrawQuoteQueryKey: GetThorchainSaversWithdrawQuoteQueryKey = [
          'thorchainSaversWithdrawQuote',
          { asset, accountId, amountCryptoBaseUnit: withdrawAmountCryptoBaseUnit },
        ]

        return queryClient.fetchQuery({
          queryKey: thorchainSaversWithdrawQuoteQueryKey,
          queryFn: () =>
            fetchThorchainWithdrawQuote({
              asset,
              accountId,
              amountCryptoBaseUnit: withdrawAmountCryptoBaseUnit,
            }),
          staleTime: 5000,
        })
      }
      case 'deposit': {
        const amountCryptoBaseUnit = toBaseUnit(
          BigAmount.fromPrecision({
            value: _amountCryptoPrecision,
            precision: asset.precision,
          }),
        )

        const thorchainSaversDepositQuoteQueryKey: GetThorchainSaversDepositQuoteQueryKey = [
          'thorchainSaversDepositQuote',
          { asset, amountCryptoBaseUnit },
        ]

        return await queryClient.fetchQuery({
          queryKey: thorchainSaversDepositQuoteQueryKey,
          queryFn: () => fetchThorchainDepositQuote({ asset, amountCryptoBaseUnit }),
          staleTime: 5000,
        })
      }
      default:
        throw new Error('Invalid type')
    }
  })()

  const amountCryptoPrecision =
    type === 'deposit'
      ? _amountCryptoPrecision
      : fromThorBaseUnit(
          (quote as ThorchainSaversWithdrawQuoteResponseSuccess).dust_amount,
        ).toFixed()

  const amountCryptoBaseUnit = toBaseUnit(
    BigAmount.fromPrecision({
      value: amountCryptoPrecision,
      precision: type === 'deposit' ? asset.precision : feeAsset?.precision ?? 0,
    }),
  )

  const estimatedFeesQueryArgs = {
    estimateFeesInput: {
      amountCryptoPrecision,
      assetId: asset.assetId,
      feeAssetId: feeAsset?.assetId ?? '',
      to: quote?.inbound_address ?? '',
      sendMax: false,
      accountId: accountId ?? '',
      contractAddress: undefined,
    },
    feeAsset,
    feeAssetMarketData,
    enabled: Boolean(feeAsset && estimateFeesQueryEnabled),
  }

  const estimatedFeesQueryKey: EstimatedFeesQueryKey = ['estimateFees', estimatedFeesQueryArgs]

  const _estimatedFeesData = estimateFeesQueryEnabled
    ? await queryClient.fetchQuery({
        queryKey: estimatedFeesQueryKey,
        queryFn: getEstimatedFeesQueryFn,
      })
    : undefined

  const _hasEnoughBalanceForTxPlusFees = getHasEnoughBalanceForTxPlusFees({
    precision: asset.precision,
    balanceCryptoBaseUnit,
    amountCryptoPrecision,
    txFeeCryptoBaseUnit: _estimatedFeesData?.txFeeCryptoBaseUnit ?? '',
  })

  const isSweepNeededQueryEnabled = Boolean(
    bnOrZero(amountCryptoPrecision).gt(0) && _estimatedFeesData && _hasEnoughBalanceForTxPlusFees,
  )

  const isSweepNeededQueryArgs = {
    assetId: asset.assetId,
    address: fromAddress,
    txFeeCryptoBaseUnit: _estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
    amountCryptoBaseUnit,
  }

  const isSweepNeededQueryKey: IsSweepNeededQueryKey = ['isSweepNeeded', isSweepNeededQueryArgs]

  const _isSweepNeeded =
    isSweepNeededQueryEnabled && isGetSweepNeededInput(isSweepNeededQueryArgs)
      ? await queryClient.fetchQuery({
          queryKey: isSweepNeededQueryKey,
          queryFn: () => getIsSweepNeeded(isSweepNeededQueryArgs),
          staleTime: 60_000,
        })
      : undefined

  const isEstimateSweepFeesQueryEnabled = Boolean(_isSweepNeeded && accountId && isUtxoChain)

  const estimatedSweepFeesQueryArgs = {
    feeAsset,
    feeAssetMarketData,
    estimateFeesInput: {
      amountCryptoPrecision: '0',
      assetId: asset.assetId,
      feeAssetId: feeAsset?.assetId ?? '',
      to: fromAddress ?? '',
      sendMax: true,
      accountId: accountId ?? '',
      contractAddress: undefined,
    },
    enabled: isEstimateSweepFeesQueryEnabled,
  }

  const estimatedSweepFeesQueryKey: EstimatedFeesQueryKey = [
    'estimateFees',
    estimatedSweepFeesQueryArgs,
  ]

  const _estimatedSweepFeesData = isEstimateSweepFeesQueryEnabled
    ? await queryClient.fetchQuery({
        queryKey: estimatedSweepFeesQueryKey,
        queryFn: getEstimatedFeesQueryFn,
      })
    : undefined

  const { hasEnoughBalance, missingFunds } = getHasEnoughBalanceForTxPlusFeesPlusSweep({
    precision: asset.precision,
    balanceCryptoBaseUnit,
    amountCryptoPrecision,
    txFeeCryptoBaseUnit: _estimatedFeesData?.txFeeCryptoBaseUnit ?? '0',
    sweepTxFeeCryptoBaseUnit: _estimatedSweepFeesData?.txFeeCryptoBaseUnit ?? '0',
  })

  const hasEnoughBalanceForTxPlusFeesPlusSweep =
    bnOrZero(balanceCryptoBaseUnit).gt(0) && hasEnoughBalance

  return { hasEnoughBalance: hasEnoughBalanceForTxPlusFeesPlusSweep, missingFunds }
}
