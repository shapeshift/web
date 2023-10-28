import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import { Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { useLendingQuoteQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import {
  getMaybeThorchainLendingOpenQuote,
  getThorchainLendingPosition,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { fromThorBaseUnit } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectFirstAccountIdByChainId,
  selectMarketDataById,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
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
  borrowAssetId: AssetId
  depositAmountCryptoPrecision: string
} & StackProps

export const LoanSummary: React.FC<LoanSummaryProps> = ({
  isLoading,
  collateralAssetId,
  borrowAssetId,
  depositAmountCryptoPrecision,
  ...rest
}) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const borrowAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  // TODO(gomes): programmatic
  const destinationAccountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(borrowAssetId).chainId),
    ) ?? ''

  const destinationAccountMetadataFilter = useMemo(
    () => ({ accountId: destinationAccountId }),
    [destinationAccountId],
  )
  const destinationAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, destinationAccountMetadataFilter),
  )

  const [borrowAssetReceiveAddress, setBorrowAssetReceiveAddress] = useState<string | null>(null)

  const getBorrowAssetReceiveAddress = useCallback(async () => {
    if (!wallet || !destinationAccountId || !destinationAccountMetadata || !borrowAsset) return

    const deviceId = await wallet.getDeviceID()
    const pubKey = isLedger(wallet) ? fromAccountId(destinationAccountId).account : undefined

    return getReceiveAddress({
      asset: borrowAsset,
      wallet,
      deviceId,
      accountMetadata: destinationAccountMetadata,
      pubKey,
    })
  }, [borrowAsset, destinationAccountId, destinationAccountMetadata, wallet])

  useEffect(() => {
    ;(async () => {
      const address = await getBorrowAssetReceiveAddress()
      if (address) setBorrowAssetReceiveAddress(address)
    })()
  }, [getBorrowAssetReceiveAddress])

  // TODO(gomes): programmatic - this assumes account 0 for now
  const accountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(collateralAssetId).chainId),
    ) ?? ''

  const lendingPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = useMemo(
    () => ['thorchainLendingPosition', { accountId, assetId: collateralAssetId }],
    [accountId, collateralAssetId],
  )

  const lendingQuoteQueryKey: [
    string,
    {
      borrowAssetReceiveAddress: string | null
      collateralAssetId: AssetId
      borrowAssetId: AssetId
      depositAmountCryptoPrecision: string
    },
  ] = useDebounce(
    () => [
      'lendingQuoteQuery',
      { borrowAssetReceiveAddress, collateralAssetId, borrowAssetId, depositAmountCryptoPrecision },
    ],
    500,
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

  const { data: lendingQuoteData, isLoading: isLendingQuoteLoading } = useLendingQuoteQuery({
    borrowAssetReceiveAddress,
    collateralAssetId,
    borrowAssetId,
    depositAmountCryptoPrecision,
  })

  console.log({ lendingQuoteData })

  if (!collateralAsset) return null

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
          <Skeleton isLoaded={!isLoading && !isLendingPositionDataLoading}>
            <FromToStack>
              <Amount.Crypto
                color='text.subtle'
                value={lendingPositionData?.collateralBalanceCryptoPrecision ?? '0'}
                symbol={collateralAsset.symbol}
              />
              <Amount.Crypto
                value={bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision)
                  .plus(lendingQuoteData?.quoteCollateralAmountCryptoPrecision ?? '0')
                  .toString()}
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
          <Skeleton isLoaded={!isLoading && !isLendingPositionDataLoading}>
            <FromToStack>
              <Amount.Fiat
                color='text.subtle'
                value={lendingPositionData?.debtBalanceFiatUSD ?? '0'}
              />
              <Amount.Fiat
                value={bnOrZero(lendingPositionData?.debtBalanceFiatUSD)
                  .plus(lendingQuoteData?.quoteDebtAmountUsd ?? '0')
                  .toString()}
              />
            </FromToStack>
          </Skeleton>
        </Row.Value>
      </Row>
      <Row>
        <HelperTooltip label='TBD'>
          <Row.Label>{translate('lending.repaymentLock')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton isLoaded={!isLoading && !isLendingPositionDataLoading}>
            <FromToStack>
              <RawText color='text.subtle'>25 days</RawText>
              <RawText>30 days</RawText>
            </FromToStack>
          </Skeleton>
        </Row.Value>
      </Row>
      <Row>
        <HelperTooltip label='TBD'>
          <Row.Label>{translate('lending.collateralizationRatio')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Percent value='2.93' color='text.success' />
          </Skeleton>
        </Row.Value>
      </Row>
      <Row>
        <HelperTooltip label='TBD'>
          <Row.Label>{translate('lending.poolDepth')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <RawText color='text.success'>{translate('lending.healthy')}</RawText>
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
