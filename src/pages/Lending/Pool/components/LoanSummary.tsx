import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import { Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'
import BigNumber from 'bignumber.js'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { useRepaymentLockData } from 'pages/Lending/hooks/useRepaymentLockData'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const FromToStack: React.FC<StackProps> = props => {
  const dividerIcon = useMemo(() => <ArrowForwardIcon color='text.subtle' borderLeft={0} />, [])
  return (
    <Stack
      alignItems='center'
      direction='row'
      fontWeight='medium'
      spacing={1}
      divider={dividerIcon}
      {...props}
    />
  )
}

type LoanSummaryProps = {
  isLoading?: boolean
  collateralAssetId: AssetId
} & StackProps &
  (
    | {
        borrowAssetId: AssetId
        borrowAccountId: AccountId
        collateralAccountId: AccountId
        collateralDecreaseAmountCryptoPrecision?: never
        debtRepaidAmountUsd?: never
        debtOccuredAmountUsd: string
        depositAmountCryptoPrecision: string
        repayAmountCryptoPrecision?: never
        repaymentAccountId?: never
        repaymentAsset?: never
        repaymentPercent?: never
      }
    | {
        borrowAssetId?: never
        borrowAccountId?: never
        collateralAccountId: AccountId
        collateralDecreaseAmountCryptoPrecision: string
        debtRepaidAmountUsd: string
        debtOccuredAmountUsd?: never
        depositAmountCryptoPrecision?: never
        repayAmountCryptoPrecision: string
        repaymentAccountId: AccountId
        repaymentAsset: Asset | null
        repaymentPercent: number
      }
  )

export const LoanSummary: React.FC<LoanSummaryProps> = ({
  isLoading,
  collateralAssetId,
  borrowAssetId,
  depositAmountCryptoPrecision,
  repayAmountCryptoPrecision,
  debtRepaidAmountUsd,
  debtOccuredAmountUsd,
  repaymentAsset,
  repaymentPercent,
  repaymentAccountId,
  collateralAccountId,
  borrowAccountId,
  ...rest
}) => {
  const isRepay = useMemo(() => Boolean(repayAmountCryptoPrecision), [repayAmountCryptoPrecision])
  const translate = useTranslate()

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  const accountId = collateralAccountId ?? ''

  const lendingPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = useMemo(
    () => ['thorchainLendingPosition', { accountId, assetId: collateralAssetId }],
    [accountId, collateralAssetId],
  )

  // Fetch the current lending position data
  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } = useQuery({
    // TODO(gomes): we may or may not want to change this, but this avoids spamming the API for the time being.
    // by default, there's a 5mn cache time, but a 0 stale time, meaning queries are considered stale immediately
    // Since react-query queries aren't persisted, and until we have an actual need for ensuring the data is fresh,
    // this is a good way to avoid spamming the API during develpment
    staleTime: Infinity,
    queryKey: lendingPositionQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { accountId, assetId }] = queryKey
      const position = await getThorchainLendingPosition({ accountId, assetId })
      return position
    },
    select: data => {
      // returns actual derived data, or zero's out fields in case there is no active position
      const collateralBalanceCryptoPrecision = fromThorBaseUnit(data?.collateral_current).toString()

      const collateralBalanceFiatUserCurrency = fromThorBaseUnit(data?.collateral_current)
        .times(collateralAssetMarketData.price)
        .toString()
      const debtBalanceFiatUSD = fromThorBaseUnit(data?.debt_current).toString()

      return {
        collateralBalanceCryptoPrecision,
        collateralBalanceFiatUserCurrency,
        debtBalanceFiatUSD,
      }
    },
    enabled: Boolean(accountId && collateralAssetId && collateralAssetMarketData.price !== '0'),
  })

  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      borrowAccountId: borrowAccountId ?? '',
      borrowAssetId: borrowAssetId ?? '',
      depositAmountCryptoPrecision: depositAmountCryptoPrecision ?? '0',
    }),
    [
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId,
      depositAmountCryptoPrecision,
    ],
  )
  const {
    data: lendingQuoteData,
    isLoading: isLendingQuoteLoading,
    isError: isLendingQuoteError,
  } = useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent: Number(repaymentPercent),
      repaymentAccountId: repaymentAccountId ?? '',
      collateralAccountId: collateralAccountId ?? '',
    }),
    [
      collateralAccountId,
      collateralAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      repaymentPercent,
    ],
  )

  const { data: lendingQuoteCloseData, isLoading: isLendingQuoteCloseLoading } =
    useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

  const useRepaymentLockDataArgs = useMemo(
    () => ({ assetId: collateralAssetId, accountId: collateralAccountId }),
    [collateralAccountId, collateralAssetId],
  )
  const { data: positionRepaymentLock, isLoading: isPositionRepaymentLockLoading } =
    useRepaymentLockData(useRepaymentLockDataArgs)

  const useRepaymentLockNetworkDataArgs = useMemo(() => ({}), [])
  const { data: networkRepaymentLock, isLoading: isNetworkRepaymentLockLoading } =
    useRepaymentLockData(useRepaymentLockNetworkDataArgs)

  if (!collateralAsset || isLendingQuoteError) return null

  return (
    <Stack
      fontSize='sm'
      px={6}
      py={4}
      spacing={4}
      fontWeight='medium'
      borderTopWidth={1}
      borderColor='border.subtle'
      mt={2}
      {...rest}
    >
      <RawText fontWeight='bold'>{translate('lending.loanInformation')}</RawText>
      <Row>
        <HelperTooltip label='TBD'>
          <Row.Label>{translate('lending.collateral')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton
            isLoaded={
              !isLoading &&
              !isLendingPositionDataLoading &&
              !isLendingQuoteLoading &&
              !isLendingQuoteCloseLoading
            }
          >
            <FromToStack>
              <Amount.Crypto
                color='text.subtle'
                value={lendingPositionData?.collateralBalanceCryptoPrecision ?? '0'}
                symbol={collateralAsset.symbol}
              />
              <Amount.Crypto
                value={(isRepay
                  ? bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision).minus(
                      lendingQuoteCloseData?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0',
                    )
                  : bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision).plus(
                      lendingQuoteData?.quoteCollateralAmountCryptoPrecision ?? '0',
                    )
                ).toString()}
                symbol={collateralAsset.symbol}
              />
            </FromToStack>
          </Skeleton>
        </Row.Value>
      </Row>
      <Row>
        <HelperTooltip label='TBD'>
          <Row.Label>{translate('lending.debt')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton
            isLoaded={
              !isLoading &&
              !isLendingPositionDataLoading &&
              !isLendingQuoteLoading &&
              !isLendingQuoteCloseLoading
            }
          >
            <FromToStack>
              <Amount.Fiat
                color='text.subtle'
                value={lendingPositionData?.debtBalanceFiatUSD ?? '0'}
              />
              <Amount.Fiat
                value={(isRepay
                  ? BigNumber.max(
                      bnOrZero(lendingPositionData?.debtBalanceFiatUSD).minus(
                        debtRepaidAmountUsd ?? 0,
                      ),
                      0,
                    )
                  : bnOrZero(lendingPositionData?.debtBalanceFiatUSD).plus(
                      debtOccuredAmountUsd ?? 0,
                    )
                ).toString()}
              />
            </FromToStack>
          </Skeleton>
        </Row.Value>
      </Row>
      {!isRepay && (
        // This doesn't make sense for repayments - repayment lock shouldn't change when repaying, and will be zero'd out when fully repaying
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.repaymentLock')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!(isPositionRepaymentLockLoading || isNetworkRepaymentLockLoading)}>
              <FromToStack>
                <RawText color='text.subtle'>{positionRepaymentLock} days</RawText>
                <RawText>{networkRepaymentLock} days</RawText>
              </FromToStack>
            </Skeleton>
          </Row.Value>
        </Row>
      )}
      {!isRepay && (
        // This doesn't make sense for repayments - the collateralization ratio won't change here
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.collateralizationRatio')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton
              isLoaded={
                !isLoading &&
                !isLendingPositionDataLoading &&
                !isLendingQuoteLoading &&
                !isLendingQuoteCloseLoading
              }
            >
              <Amount.Percent
                value={lendingQuoteData?.quoteCollateralizationRatioPercentDecimal ?? '0'}
                color='text.success'
              />
            </Skeleton>
          </Row.Value>
        </Row>
      )}
      <Row>
        <HelperTooltip label='TBD'>
          <Row.Label>{translate('lending.poolDepth')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton
            isLoaded={
              !isLoading &&
              !isLendingPositionDataLoading &&
              !isLendingQuoteLoading &&
              !isLendingQuoteCloseLoading
            }
          >
            <RawText color='text.success'>{translate('lending.healthy')}</RawText>
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
