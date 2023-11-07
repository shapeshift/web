import { ArrowDownIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Collapse,
  Divider,
  Flex,
  Heading,
  IconButton,
  Skeleton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { isSome } from 'lib/utils'
import { useLendingQuoteCloseQuery } from 'pages/Lending/hooks/useLendingCloseQuery'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

type RepayInputProps = {
  collateralAssetId: AssetId
  repaymentPercent: number
  onRepaymentPercentChange: (value: number) => void
  collateralAccountId: AccountId
  repaymentAccountId: AccountId
  onCollateralAccountIdChange: (accountId: AccountId) => void
  onRepaymentAccountIdChange: (accountId: AccountId) => void
  repaymentAsset: Asset | null
  setRepaymentAsset: (asset: Asset) => void
}
export const RepayInput = ({
  collateralAssetId,
  repaymentPercent,
  onRepaymentPercentChange: onRepayPercentChange,
  collateralAccountId,
  repaymentAccountId,
  onCollateralAccountIdChange: handleCollateralAccountIdChange,
  onRepaymentAccountIdChange,
  repaymentAsset,
  setRepaymentAsset,
}: RepayInputProps) => {
  console.log({ collateralAccountId, repaymentAccountId })
  const [seenNotice, setSeenNotice] = useState(false)
  const translate = useTranslate()
  const history = useHistory()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))

  const onSubmit = useCallback(() => {
    history.push(RepayRoutePaths.Confirm)
  }, [history])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const percentOptions = useMemo(() => [0], [])

  const assetsById = useAppSelector(selectAssets)

  const [repaymentSupportedAssets, setRepaymentSupportedAssets] = useState<Asset[]>([])

  useEffect(() => {
    ;(async () => {
      if (!repaymentAsset) setRepaymentAsset(assetsById[collateralAssetId] as Asset)

      const assets = Object.values(assetsById) as Asset[]
      const thorSellAssets = (await thorchainSwapper.filterAssetIdsBySellable(assets))
        .map(assetId => assetsById[assetId])
        .filter(isSome)
      setRepaymentSupportedAssets(thorSellAssets)
    })()
  }, [assetsById, collateralAssetId, repaymentAsset, setRepaymentAsset])

  const useLendingQuoteCloseQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      repaymentAssetId: repaymentAsset?.assetId ?? '',
      repaymentPercent,
      repaymentAccountId,
    }),
    [
      collateralAccountId,
      collateralAssetId,
      repaymentAccountId,
      repaymentAsset?.assetId,
      repaymentPercent,
    ],
  )

  const {
    data,
    isLoading: isLendingQuoteCloseLoading,
    isError: isLendingQuoteCloseError,
  } = useLendingQuoteCloseQuery(useLendingQuoteCloseQueryArgs)

  const buyAssetSearch = useModal('buyAssetSearch')
  const handleRepaymentAssetClick = useCallback(() => {
    if (!repaymentSupportedAssets.length) return

    buyAssetSearch.open({
      onClick: setRepaymentAsset,
      title: 'lending.borrow',
      assets: repaymentSupportedAssets, // TODO(gomes)
    })
  }, [buyAssetSearch, repaymentSupportedAssets, setRepaymentAsset])

  const handleAssetChange = useCallback((asset: Asset) => {
    return console.info(asset)
  }, [])

  const handleAccountIdChange = useCallback((_accountId: AccountId) => {}, [])

  const repaymentAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={repaymentAsset?.assetId ?? ''}
        onAssetClick={handleRepaymentAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        // Users have the possibility to repay in any supported asset, not only their collateral/borrowed asset
        // https://docs.thorchain.org/thorchain-finance/lending#loan-repayment-closeflow
        isReadOnly={false}
      />
    )
  }, [handleAccountIdChange, handleAssetChange, handleRepaymentAssetClick, repaymentAsset?.assetId])

  const collateralAssetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={btcAssetId}
        onAssetClick={handleRepaymentAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [handleAccountIdChange, handleAssetChange, handleRepaymentAssetClick])

  const handleSeenNotice = useCallback(() => setSeenNotice(true), [])

  const repaymentAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, repaymentAsset?.assetId ?? ''),
  )

  const { data: lendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const debtBalanceUserCurrency = useMemo(() => {
    return bnOrZero(lendingPositionData?.debtBalanceFiatUSD ?? 0)
      .times(userCurrencyToUsdRate)
      .toFixed()
  }, [lendingPositionData, userCurrencyToUsdRate])

  const repaymentAmountFiatUserCurrency = useMemo(() => {
    if (!lendingPositionData) return null

    const proratedCollateralFiatUserCurrency = bnOrZero(repaymentPercent)
      .times(debtBalanceUserCurrency)
      .div(100)

    return proratedCollateralFiatUserCurrency.toFixed()
  }, [debtBalanceUserCurrency, lendingPositionData, repaymentPercent])

  const repaymentAmountCryptoPrecision = useMemo(() => {
    if (!repaymentAmountFiatUserCurrency) return null

    return bnOrZero(repaymentAmountFiatUserCurrency).div(repaymentAssetMarketData.price).toFixed()
  }, [repaymentAmountFiatUserCurrency, repaymentAssetMarketData.price])

  if (!seenNotice) {
    return (
      <Stack spacing={6} px={4} py={6} textAlign='center' alignItems='center'>
        <WarningIcon color='text.warning' boxSize={12} />
        <Stack spacing={0} px={2}>
          <Heading as='h4'>{translate('lending.repayNoticeTitle')}</Heading>
          <Text color='text.subtle' translation='lending.repayNotice' />
        </Stack>
        <Button width='full' size='lg' colorScheme='blue' onClick={handleSeenNotice}>
          {translate('lending.repayNoticeCta')}
        </Button>
      </Stack>
    )
  }
  return (
    <Stack spacing={0}>
      <TradeAssetInput
        assetId={repaymentAsset?.assetId ?? ''}
        assetSymbol={repaymentAsset?.symbol ?? ''}
        assetIcon={''}
        cryptoAmount={repaymentAmountCryptoPrecision ?? '0'}
        fiatAmount={repaymentAmountFiatUserCurrency ?? '0'}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={'Repay Amount'}
        onAccountIdChange={onRepaymentAccountIdChange}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={repaymentAssetSelectComponent}
      >
        <Stack spacing={4} px={6} pb={4}>
          <Slider defaultValue={100} onChange={onRepayPercentChange}>
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <Tooltip label={translate('lending.repayNotice')}>
              <SliderThumb boxSize={4} />
            </Tooltip>
          </Slider>
          <Flex width='full' justifyContent='space-between' fontSize='xs' color='text.subtle'>
            <Amount.Fiat value={0} />
            <Amount.Fiat value={debtBalanceUserCurrency} />
          </Flex>
        </Stack>
      </TradeAssetInput>
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
        assetId={collateralAssetId}
        assetSymbol={collateralAsset?.symbol ?? ''}
        assetIcon={collateralAsset?.icon ?? ''}
        cryptoAmount={'0'}
        fiatAmount={'0'}
        isSendMaxDisabled={false}
        percentOptions={percentOptions}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={'Unlocked Collateral'}
        // TODO(gomes): implement me
        onAccountIdChange={onRepaymentAccountIdChange}
        isReadOnly
        hideAmounts
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={collateralAssetSelectComponent}
      />
      <Collapse in={true}>
        <LoanSummary
          collateralAssetId={collateralAssetId}
          repayAmountCryptoPrecision={repaymentAmountCryptoPrecision ?? ''}
          debtRepaidAmountUsd={data?.quoteDebtRepaidAmountUsd ?? '0'}
          repaymentAsset={repaymentAsset}
          repaymentPercent={repaymentPercent}
          collateralDecreaseAmountCryptoPrecision={
            data?.quoteLoanCollateralDecreaseCryptoPrecision ?? '0'
          }
          repaymentAccountId={repaymentAccountId}
          collateralAccountId={collateralAccountId}
        />
      </Collapse>
      <Stack
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
            <Skeleton isLoaded={!isLendingQuoteCloseLoading}>
              <Amount.Crypto
                value={data?.quoteSlippageBorrowedAssetCryptoPrecision ?? '0'}
                symbol='BTC'
              />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isLendingQuoteCloseLoading}>
              <Amount.Fiat value='TODO' />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.fees')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isLendingQuoteCloseLoading}>
              <Amount.Fiat value={data?.quoteTotalFeesFiatUserCurrency ?? '0'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Button
          size='lg'
          colorScheme={isLendingQuoteCloseError ? 'red' : 'blue'}
          mx={-2}
          onClick={onSubmit}
          isDisabled={isLendingQuoteCloseError}
        >
          {translate('lending.repay')}
        </Button>
      </Stack>
    </Stack>
  )
}
