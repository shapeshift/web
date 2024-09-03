import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import { Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import React, { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'
import {
  isLendingQuoteClose,
  isLendingQuoteOpen,
  type LendingQuoteClose,
  type LendingQuoteOpen,
} from 'lib/utils/thorchain/lending/types'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useRepaymentLockData } from 'pages/Lending/hooks/useRepaymentLockData'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
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
  confirmedQuote: LendingQuoteOpen | LendingQuoteClose | null
} & StackProps &
  (
    | {
        borrowAssetId: AssetId
        borrowAccountId: AccountId
        collateralAccountId: AccountId | null
        collateralDecreaseAmountCryptoPrecision?: never
        debtRepaidAmountUserCurrency?: never
        debtOccuredAmountUserCurrency: string
        depositAmountCryptoPrecision: string
        repayAmountCryptoPrecision?: never
        repaymentAccountId?: never
        repaymentAsset?: never
        repaymentPercent?: never
      }
    | {
        borrowAssetId?: never
        borrowAccountId?: never
        collateralAccountId: AccountId | null
        collateralDecreaseAmountCryptoPrecision: string
        debtRepaidAmountUserCurrency: string
        debtOccuredAmountUserCurrency?: never
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
  debtRepaidAmountUserCurrency,
  debtOccuredAmountUserCurrency,
  repaymentAsset,
  repaymentPercent,
  repaymentAccountId,
  collateralAccountId,
  borrowAccountId,
  confirmedQuote,
  collateralDecreaseAmountCryptoPrecision,
  ...rest
}) => {
  const translate = useTranslate()

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const accountId = collateralAccountId ?? ''

  const { data: lendingPositionData, isLoading: isLendingPositionDataLoading } =
    useLendingPositionData({
      accountId,
      assetId: collateralAssetId,
    })

  const useRepaymentLockDataArgs = useMemo(
    () => ({ assetId: collateralAssetId, accountId: collateralAccountId }),
    [collateralAccountId, collateralAssetId],
  )
  const { data: positionRepaymentLock, isLoading: isPositionRepaymentLockLoading } =
    useRepaymentLockData(useRepaymentLockDataArgs)
  const isRepaymentLocked = bnOrZero(positionRepaymentLock).gt(0)

  const useRepaymentLockNetworkDataArgs = useMemo(() => ({}), [])
  const { data: networkRepaymentLock, isLoading: isNetworkRepaymentLockLoading } =
    useRepaymentLockData(useRepaymentLockNetworkDataArgs)

  if (!collateralAsset || !confirmedQuote) return null

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
      {(bnOrZero(
        (confirmedQuote as LendingQuoteClose)?.quoteLoanCollateralDecreaseCryptoPrecision,
      ).gt(0) ||
        bnOrZero((confirmedQuote as LendingQuoteOpen)?.quoteCollateralAmountCryptoPrecision).gt(
          0,
        )) && (
        <Row>
          <HelperTooltip label={translate('lending.quote.collateral')}>
            <Row.Label>{translate('lending.collateral')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton
              isLoaded={Boolean(
                !isLoading &&
                  !isLendingPositionDataLoading &&
                  confirmedQuote &&
                  lendingPositionData &&
                  lendingPositionData?.collateralBalanceCryptoPrecision,
              )}
            >
              <FromToStack>
                <Amount.Crypto
                  color='text.subtle'
                  value={lendingPositionData?.collateralBalanceCryptoPrecision ?? '0'}
                  symbol={collateralAsset.symbol}
                />
                <Amount.Crypto
                  value={(isLendingQuoteClose(confirmedQuote)
                    ? bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision).minus(
                        confirmedQuote.quoteLoanCollateralDecreaseCryptoPrecision ?? '0',
                      )
                    : bnOrZero(lendingPositionData?.collateralBalanceCryptoPrecision).plus(
                        confirmedQuote.quoteCollateralAmountCryptoPrecision ?? '0',
                      )
                  ).toString()}
                  symbol={collateralAsset.symbol}
                />
              </FromToStack>
            </Skeleton>
          </Row.Value>
        </Row>
      )}
      <Row>
        <HelperTooltip label={translate('lending.quote.debt')}>
          <Row.Label>{translate('lending.debt')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton
            isLoaded={Boolean(!isLoading && !isLendingPositionDataLoading && confirmedQuote)}
          >
            <FromToStack>
              <Amount.Fiat
                color='text.subtle'
                value={lendingPositionData?.debtBalanceFiatUserCurrency ?? '0'}
              />
              <Amount.Fiat
                value={(isLendingQuoteClose(confirmedQuote)
                  ? BigNumber.max(
                      bnOrZero(lendingPositionData?.debtBalanceFiatUserCurrency).minus(
                        debtRepaidAmountUserCurrency ?? 0,
                      ),
                      0,
                    )
                  : bnOrZero(lendingPositionData?.debtBalanceFiatUserCurrency).plus(
                      debtOccuredAmountUserCurrency ?? 0,
                    )
                ).toString()}
              />
            </FromToStack>
          </Skeleton>
        </Row.Value>
      </Row>
      {isLendingQuoteOpen(confirmedQuote) && (
        // This doesn't make sense for repayments - repayment lock shouldn't change when repaying, and will be zero'd out when fully repaying
        <Row>
          <HelperTooltip label={translate('lending.quote.repaymentLock')}>
            <Row.Label>{translate('lending.repaymentLock')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!(isPositionRepaymentLockLoading || isNetworkRepaymentLockLoading)}>
              <FromToStack>
                <RawText color={isRepaymentLocked ? 'text.subtle' : 'green.500'}>
                  {isRepaymentLocked
                    ? translate('lending.repaymentDays', { numDays: positionRepaymentLock })
                    : translate('lending.unlocked')}
                </RawText>
                <RawText>{networkRepaymentLock} days</RawText>
              </FromToStack>
            </Skeleton>
          </Row.Value>
        </Row>
      )}
      {isLendingQuoteOpen(confirmedQuote) && (
        // This doesn't make sense for repayments - the collateralization ratio won't change here
        <Row>
          <HelperTooltip label={translate('lending.quote.collateralizationRatio')}>
            <Row.Label>{translate('lending.collateralizationRatio')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton
              isLoaded={Boolean(!isLoading && !isLendingPositionDataLoading && confirmedQuote)}
            >
              <Amount.Percent
                value={confirmedQuote?.quoteCollateralizationRatioPercentDecimal ?? '0'}
                color='text.success'
              />
            </Skeleton>
          </Row.Value>
        </Row>
      )}
      <Row>
        <HelperTooltip label={translate('lending.poolDepthDescription')}>
          <Row.Label>{translate('lending.poolDepth')}</Row.Label>
        </HelperTooltip>
        <Row.Value>
          <Skeleton
            isLoaded={Boolean(!isLoading && !isLendingPositionDataLoading && confirmedQuote)}
          >
            <RawText color='text.success'>{translate('lending.healthy')}</RawText>
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
