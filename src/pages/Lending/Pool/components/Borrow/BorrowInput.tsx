import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, CardFooter, Collapse, Divider, Flex, IconButton, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useLendingQuoteQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import {
  selectAssetById,
  selectFirstAccountIdByChainId,
  selectMarketDataById,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type BorrowInputProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  onDepositAmountChange: (value: string) => void
}

export const BorrowInput = ({
  collateralAssetId,
  depositAmount,
  onDepositAmountChange,
}: BorrowInputProps) => {
  const translate = useTranslate()
  const history = useHistory()

  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const percentOptions = useMemo(() => [0], [])

  const onSubmit = useCallback(() => {
    history.push(BorrowRoutePaths.Confirm)
  }, [history])

  const handleAccountIdChange = useCallback((accountId: AccountId) => {
    console.info(accountId)
  }, [])

  const handleAssetClick = useCallback(() => {
    console.info('clicked Asset')
  }, [])

  const handleAssetChange = useCallback((asset: Asset) => {
    return console.info(asset)
  }, [])

  const handleDepositInputChange = useCallback(
    (value: string) => {
      onDepositAmountChange(value)
    },
    [onDepositAmountChange],
  )

  // TODO(gomes): programmatic
  const depositAccountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(collateralAssetId).chainId),
    ) ?? ''
  const balanceFilter = useMemo(
    () => ({ assetId: collateralAssetId, accountId: depositAccountId }),
    [collateralAssetId, depositAccountId],
  )
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, balanceFilter),
  )
  const amountAvailableCryptoPrecision = useMemo(
    () => bnOrZero(balance).div(bn(10).pow(collateralAsset?.precision ?? '0')),
    [balance, collateralAsset?.precision],
  )

  // TODO(gomes): include gas checks
  const hasEnoughBalance = useMemo(
    () => bnOrZero(depositAmount).lte(amountAvailableCryptoPrecision),
    [amountAvailableCryptoPrecision, depositAmount],
  )

  const quoteErrorTranslation = useMemo(() => {
    if (!hasEnoughBalance) return 'common.insufficientFunds'
    return null
  }, [hasEnoughBalance])

  const depositAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={collateralAssetId}
        onAssetClick={handleAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [collateralAssetId, handleAccountIdChange, handleAssetChange, handleAssetClick])

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={btcAssetId}
        onAssetClick={handleAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [handleAccountIdChange, handleAssetChange, handleAssetClick])

  const { data: lendingQuoteData, isLoading: isLendingQuoteLoading } = useLendingQuoteQuery({
    collateralAssetId,
    borrowAssetId: btcAssetId, // TODO(gomes): programmatic
    depositAmountCryptoPrecision: depositAmount ?? '0',
  })

  console.log({ lendingQuoteData, isLendingQuoteLoading })

  if (!collateralAsset) return null
  return (
    <SlideTransition>
      <Stack spacing={0}>
        <TradeAssetInput
          assetId={collateralAssetId}
          assetSymbol={collateralAsset.symbol}
          assetIcon={collateralAsset.icon}
          onChange={handleDepositInputChange}
          cryptoAmount={depositAmount ?? '0'}
          fiatAmount={bnOrZero(depositAmount)
            .times(collateralAssetMarketData?.price ?? '0')
            .toString()}
          isSendMaxDisabled={false}
          percentOptions={percentOptions}
          showInputSkeleton={false}
          showFiatSkeleton={false}
          label={`Deposit ${collateralAsset.symbol}`}
          onAccountIdChange={handleAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          labelPostFix={depositAssetSelectComponent}
        />
        <Flex alignItems='center' justifyContent='center' my={-2}>
          <Divider />
          <IconButton
            isRound
            size='sm'
            position='relative'
            variant='outline'
            borderColor='border.base'
            zIndex={1}
            aria-label='Switch Assets'
            icon={swapIcon}
          />
          <Divider />
        </Flex>
        <TradeAssetInput
          assetId={btcAssetId}
          assetSymbol={'BTC'} // TODO(gomes): programmatic
          assetIcon={''}
          cryptoAmount={lendingQuoteData?.quoteBorrowedAmountCryptoPrecision ?? '0'}
          fiatAmount={lendingQuoteData?.quoteBorrowedAmountUserCurrency ?? '0'}
          isSendMaxDisabled={false}
          percentOptions={percentOptions}
          showInputSkeleton={false}
          showFiatSkeleton={false}
          label={'Borrow'}
          onAccountIdChange={handleAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          labelPostFix={assetSelectComponent}
        />
        <Collapse in={true}>
          <LoanSummary
            collateralAssetId={collateralAssetId}
            depositAmountCryptoPrecision={depositAmount ?? '0'}
            borrowAssetId={btcAssetId} // TODO(gomes): programmatic
          />
        </Collapse>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Amount.Crypto
                value={lendingQuoteData?.quoteSlippageBorrowedAssetCryptoPrecision ?? '0'}
                symbol='BTC'
              />
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value='TODO' />
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.fees')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value='0' />
            </Row.Value>
          </Row>
          <Button
            size='lg'
            colorScheme={quoteErrorTranslation ? 'red' : 'blue'}
            mx={-2}
            onClick={onSubmit}
            disabled={Boolean(quoteErrorTranslation)}
          >
            {quoteErrorTranslation ? translate(quoteErrorTranslation) : 'Borrow'}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
