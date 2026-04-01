import { Button, CardBody, CardFooter, Flex, Skeleton, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { DepositMachineCtx } from './DepositMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipMinimumDeposit } from '@/pages/ChainflipLending/hooks/useChainflipMinimumDeposit'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectAssets,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DepositInputProps = {
  assetId: AssetId
  onAssetChange: (assetId: AssetId) => void
}

export const DepositInput = ({ assetId, onAssetChange }: DepositInputProps) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const walletSupportsEth = useWalletSupportsChain(ethChainId, wallet)
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const [isFiat, toggleIsFiat] = useToggle(false)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const { accountNumber } = useChainflipLendingAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const actorRef = DepositMachineCtx.useActorRef()
  const depositAmountCryptoPrecision = DepositMachineCtx.useSelector(
    s => s.context.depositAmountCryptoPrecision,
  )

  const chainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])
  const walletSupportsAssetChain = useWalletSupportsChain(chainId, wallet)

  const poolChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const balanceFilter = useMemo(
    () => ({ assetId, accountId: poolChainAccountId ?? '' }),
    [assetId, poolChainAccountId],
  )
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  ).toBaseUnit()

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: balanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [balanceCryptoBaseUnit, asset?.precision],
  )

  const fiatAmount = useMemo(() => {
    if (!marketData?.price) return '0'
    return bnOrZero(depositAmountCryptoPrecision).times(marketData.price).toString()
  }, [depositAmountCryptoPrecision, marketData?.price])

  const availableFiat = useMemo(
    () =>
      bnOrZero(availableCryptoPrecision)
        .times(marketData?.price ?? 0)
        .toFixed(2),
    [availableCryptoPrecision, marketData?.price],
  )

  const { freeBalances } = useChainflipAccount()

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const freeBalanceCryptoPrecision = useMemo(() => {
    if (!freeBalances || !cfAsset || !asset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    if (!matching?.balance) return '0'
    return BigAmount.fromBaseUnit({
      value: matching.balance,
      precision: asset.precision,
    }).toPrecision()
  }, [freeBalances, cfAsset, asset])

  const assetIds = useMemo(() => Object.keys(CHAINFLIP_LENDING_ASSET_BY_ASSET_ID) as AssetId[], [])

  const assets = useAppSelector(selectAssets)

  const lendingAssets = useMemo(() => {
    return assetIds.reduce<Asset[]>((acc, assetId) => {
      const asset = assets[assetId]
      if (asset) acc.push(asset)
      return acc
    }, [])
  }, [assetIds, assets])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: (asset: Asset) => onAssetChange(asset.assetId),
      title: 'chainflipLending.depositToChainflip',
      assets: lendingAssets,
    })
  }, [buyAssetSearch, onAssetChange, lendingAssets])

  const handleAssetChange = useCallback(
    (asset: Asset) => onAssetChange(asset.assetId),
    [onAssetChange],
  )

  const minDeposit = useChainflipMinimumDeposit(assetId)

  const isBelowMinimum = useMemo(() => {
    if (!minDeposit) return false
    const amount = bnOrZero(depositAmountCryptoPrecision)
    return amount.gt(0) && amount.lt(minDeposit)
  }, [depositAmountCryptoPrecision, minDeposit])

  const exceedsBalance = useMemo(
    () => bnOrZero(depositAmountCryptoPrecision).gt(availableCryptoPrecision),
    [depositAmountCryptoPrecision, availableCryptoPrecision],
  )

  const handleInputChange = useCallback(
    (values: NumberFormatValues) => {
      if (isFiat) {
        const cryptoAmount =
          values.value && marketData?.price
            ? bnOrZero(values.value)
                .div(marketData.price)
                .decimalPlaces(asset?.precision ?? 18, 1)
                .toFixed()
            : ''
        actorRef.send({ type: 'SET_AMOUNT', amount: cryptoAmount })
      } else {
        actorRef.send({ type: 'SET_AMOUNT', amount: values.value })
      }
    },
    [actorRef, isFiat, marketData?.price, asset?.precision],
  )

  const inputValue = useMemo(() => {
    if (isFiat) return fiatAmount === '0' ? '' : fiatAmount
    return depositAmountCryptoPrecision
  }, [isFiat, fiatAmount, depositAmountCryptoPrecision])

  const handleMaxClick = useCallback(() => {
    actorRef.send({ type: 'SET_AMOUNT', amount: availableCryptoPrecision })
  }, [availableCryptoPrecision, actorRef])

  const handleSubmit = useCallback(() => {
    actorRef.send({ type: 'SUBMIT_INPUT' })
  }, [actorRef])

  const isPortfolioLoaded = Boolean(poolChainAccountId) && portfolioLoadingStatus !== 'loading'

  const isValidWallet = useMemo(
    () => Boolean(walletSupportsEth && walletSupportsAssetChain),
    [walletSupportsEth, walletSupportsAssetChain],
  )

  const isAmountZero = bnOrZero(depositAmountCryptoPrecision).isZero()

  const isSubmitDisabled = useMemo(() => {
    return isAmountZero || exceedsBalance || isBelowMinimum
  }, [isAmountZero, exceedsBalance, isBelowMinimum])

  const submitButtonColorScheme = useMemo(() => {
    if (!isAmountZero && (exceedsBalance || isBelowMinimum)) return 'red'
    return 'blue'
  }, [isAmountZero, exceedsBalance, isBelowMinimum])

  const submitButtonText = useMemo(() => {
    if (exceedsBalance) return translate('common.insufficientFunds')
    if (isBelowMinimum && minDeposit)
      return translate('chainflipLending.deposit.belowMinimumDeposit', {
        amount: minDeposit,
        symbol: asset?.symbol,
      })
    return translate('chainflipLending.deposit.openChannel')
  }, [exceedsBalance, isBelowMinimum, minDeposit, asset?.symbol, translate])

  if (!asset) return null

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={4} align='stretch'>
          <TradeAssetSelect
            assetId={assetId}
            assetIds={assetIds}
            onAssetClick={handleAssetClick}
            onAssetChange={handleAssetChange}
            onlyConnectedChains={false}
            px={0}
            mb={0}
          />

          <Stack spacing={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.deposit.amount')}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <NumericFormat
                data-testid='chainflip-deposit-amount-input'
                inputMode='decimal'
                valueIsNumericString={true}
                decimalScale={isFiat ? 2 : asset.precision}
                thousandSeparator={localeParts.group}
                decimalSeparator={localeParts.decimal}
                allowedDecimalSeparators={allowedDecimalSeparators}
                allowNegative={false}
                allowLeadingZeros={false}
                value={inputValue}
                placeholder='0.00'
                prefix={isFiat ? localeParts.prefix : ''}
                suffix={isFiat ? localeParts.postfix : ''}
                onValueChange={handleInputChange}
                style={{
                  flex: 1,
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0.5rem 0',
                }}
              />
              {!isFiat && (
                <RawText fontSize='lg' fontWeight='bold' color='text.subtle'>
                  {asset.symbol}
                </RawText>
              )}
            </Flex>
            {marketData?.price && (
              <Button
                variant='link'
                size='xs'
                color='text.subtle'
                fontWeight='medium'
                onClick={toggleIsFiat}
                alignSelf='flex-start'
                px={0}
              >
                {isFiat ? (
                  <Amount.Crypto
                    value={depositAmountCryptoPrecision || '0'}
                    symbol={asset.symbol}
                    fontSize='xs'
                  />
                ) : (
                  <Amount.Fiat value={fiatAmount} prefix='≈' fontSize='xs' />
                )}
              </Button>
            )}
          </Stack>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.deposit.available')}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <Skeleton isLoaded={isPortfolioLoaded}>
                <VStack spacing={0} align='flex-end'>
                  <Amount.Fiat value={availableFiat} fontSize='sm' fontWeight='medium' />
                  <Amount.Crypto
                    value={availableCryptoPrecision}
                    symbol={asset.symbol}
                    fontSize='xs'
                    color='text.subtle'
                  />
                </VStack>
              </Skeleton>
              <Button
                data-testid='chainflip-deposit-max'
                size='xs'
                variant='ghost'
                colorScheme='blue'
                onClick={handleMaxClick}
                isDisabled={!isPortfolioLoaded}
              >
                {translate('modals.send.sendForm.max')}
              </Button>
            </Flex>
          </Flex>

          {minDeposit && bnOrZero(minDeposit).gt(0) && (
            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.deposit.minimumDeposit')}
              </RawText>
              <RawText
                fontSize='sm'
                fontWeight='medium'
                color={isBelowMinimum ? 'red.500' : 'text.base'}
              >
                {minDeposit} {asset.symbol}
              </RawText>
            </Flex>
          )}

          <Flex justifyContent='space-between' alignItems='center'>
            <HelperTooltip
              label={translate('chainflipLending.deposit.freeBalanceTooltip', {
                asset: asset.symbol,
              })}
            >
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.deposit.freeBalance')}
              </RawText>
            </HelperTooltip>
            <Amount.Crypto
              value={freeBalanceCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>

          <RawText fontSize='xs' color='text.subtle'>
            {translate('chainflipLending.deposit.explainer')}
          </RawText>
        </VStack>
      </CardBody>

      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
      >
        <ButtonWalletPredicate
          data-testid='chainflip-deposit-submit'
          isValidWallet={isValidWallet}
          colorScheme={submitButtonColorScheme}
          size='lg'
          height={12}
          borderRadius='xl'
          width='full'
          fontWeight='bold'
          onClick={handleSubmit}
          isDisabled={isSubmitDisabled}
        >
          {submitButtonText}
        </ButtonWalletPredicate>
      </CardFooter>
    </SlideTransition>
  )
}
