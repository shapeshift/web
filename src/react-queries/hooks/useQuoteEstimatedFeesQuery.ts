import { type AccountId, type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds, MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { utils } from 'ethers'
import { useMemo } from 'react'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import type { LendingQuoteClose, LendingQuoteOpen } from 'lib/utils/thorchain/lending/types'
import type { LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'
import { selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type EstimatedFeesQueryKey = [
  'estimateFees',
  {
    enabled: boolean
    asset: Asset | undefined
    assetMarketData: MarketData
    estimateFeesInput: EstimateFeesInput | undefined
  },
]

type UseQuoteEstimatedFeesProps = {
  collateralAssetId: AssetId
} & (
  | {
      confirmedQuote: LendingQuoteOpen | null
      collateralAccountId: AccountId
      depositAmountCryptoPrecision: string
      repaymentAccountId?: never
      repaymentAsset?: never
    }
  | {
      confirmedQuote: LendingQuoteClose | null
      collateralAccountId: AccountId
      depositAmountCryptoPrecision?: never
      repaymentAccountId: AccountId
      repaymentAsset: Asset | null
    }
  | {
      confirmedQuote: LpConfirmedDepositQuote | null
      // Technically not a collateral, but this avoids weird branching, ternaries or ?? checks for now
      collateralAccountId: AccountId
      depositAmountCryptoPrecision: string
      repaymentAccountId?: never
      repaymentAsset?: never
    }
)

export const useQuoteEstimatedFeesQuery = ({
  collateralAssetId,
  collateralAccountId,
  depositAmountCryptoPrecision,
  repaymentAccountId,
  repaymentAsset,
  confirmedQuote,
}: UseQuoteEstimatedFeesProps) => {
  const repaymentAmountCryptoPrecision = useMemo(
    () => (confirmedQuote as LendingQuoteClose)?.repaymentAmountCryptoPrecision,
    [confirmedQuote],
  )
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, collateralAssetId))
  const feeAssetMarketData = useAppSelector(state => selectMarketDataById(state, collateralAssetId))
  const estimateFeesArgs = useMemo(() => {
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const cryptoAmount = depositAmountCryptoPrecision ?? repaymentAmountCryptoPrecision ?? '0'
    const assetId = repaymentAsset?.assetId ?? collateralAssetId
    const quoteMemo =
      confirmedQuote && 'quoteMemo' in confirmedQuote ? confirmedQuote.quoteMemo : ''
    const memo =
      assetId && supportedEvmChainIds.includes(fromAssetId(assetId).chainId as KnownChainIds)
        ? utils.hexlify(utils.toUtf8Bytes(quoteMemo))
        : quoteMemo
    const to =
      confirmedQuote && 'quoteInboundAddress' in confirmedQuote
        ? confirmedQuote.quoteInboundAddress
        : ''
    const accountId = repaymentAccountId ?? collateralAccountId

    return {
      cryptoAmount,
      assetId,
      memo,
      to,
      accountId,
      sendMax: false,
      contractAddress: undefined,
    } as const
  }, [
    depositAmountCryptoPrecision,
    repaymentAmountCryptoPrecision,
    repaymentAsset?.assetId,
    collateralAssetId,
    confirmedQuote,
    repaymentAccountId,
    collateralAccountId,
  ])

  // TODO(gomes): this is wrong, we should use a proper generated query for this
  const quoteEstimatedFeesQueryKey = useMemo(
    () => ['thorchainLendingQuoteEstimatedFees', estimateFeesArgs],
    [estimateFeesArgs],
  )

  const enabled = useMemo(
    () =>
      Boolean(
        feeAsset &&
          confirmedQuote &&
          (collateralAssetId || repaymentAsset) &&
          bnOrZero(depositAmountCryptoPrecision ?? repaymentAmountCryptoPrecision).gt(0),
      ),
    [
      collateralAssetId,
      confirmedQuote,
      depositAmountCryptoPrecision,
      feeAsset,
      repaymentAmountCryptoPrecision,
      repaymentAsset,
    ],
  )

  const useQuoteEstimatedFeesQuery = useQuery({
    queryKey: quoteEstimatedFeesQueryKey,
    queryFn: async () => {
      const estimatedFees = await estimateFees(estimateFeesArgs)
      const txFeeFiat = bnOrZero(estimatedFees.fast.txFee)
        .div(bn(10).pow(feeAsset!.precision)) // actually defined at runtime, see "enabled" below
        .times(feeAssetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },
    enabled,
    retry: false,
  })

  return useQuoteEstimatedFeesQuery
}
