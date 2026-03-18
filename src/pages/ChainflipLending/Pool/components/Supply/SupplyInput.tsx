import { Box, Button, CardBody, CardFooter, Divider, Flex, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { usdcAssetId, usdtAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { SupplyMachineCtx } from './SupplyMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { useChainflipMinimumSupply } from '@/pages/ChainflipLending/hooks/useChainflipMinimumSupply'
import { useChainflipSupplyPositions } from '@/pages/ChainflipLending/hooks/useChainflipSupplyPositions'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById, selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const STABLECOIN_ASSET_IDS: AssetId[] = [usdcAssetId, usdtAssetId]

type SupplyInputProps = {
  assetId: AssetId
  onAssetChange: (assetId: AssetId) => void
}

export const SupplyInput = ({ assetId, onAssetChange }: SupplyInputProps) => {
  const translate = useTranslate()
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const [isFiat, setIsFiat] = useToggle(false)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const actorRef = SupplyMachineCtx.useActorRef()
  const freeBalanceCryptoBaseUnit = SupplyMachineCtx.useSelector(
    s => s.context.freeBalanceCryptoBaseUnit,
  )
  const savedSupplyAmount = SupplyMachineCtx.useSelector(s => s.context.supplyAmountCryptoPrecision)

  const [inputValue, setInputValue] = useState(savedSupplyAmount || '')

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: freeBalanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [freeBalanceCryptoBaseUnit, asset?.precision],
  )

  const availableFiat = useMemo(() => {
    if (!marketData?.price) return undefined
    return bnOrZero(availableCryptoPrecision).times(marketData.price).toString()
  }, [availableCryptoPrecision, marketData?.price])

  const cryptoFromFiat = useMemo(() => {
    if (!inputValue || !marketData?.price) return ''
    return bnOrZero(inputValue)
      .div(marketData.price)
      .decimalPlaces(asset?.precision ?? 18, 1)
      .toFixed()
  }, [inputValue, marketData?.price, asset?.precision])

  const fiatFromCrypto = useMemo(() => {
    if (!inputValue || !marketData?.price) return '0'
    return bnOrZero(inputValue).times(marketData.price).toString()
  }, [inputValue, marketData?.price])

  const cryptoValue = isFiat ? cryptoFromFiat : inputValue
  const fiatValue = isFiat ? inputValue : fiatFromCrypto

  const { pools } = useChainflipLendingPools()
  const { supplyPositions } = useChainflipSupplyPositions()

  const poolForAsset = useMemo(() => pools.find(p => p.assetId === assetId), [pools, assetId])

  const currentPositionCrypto = useMemo(() => {
    const position = supplyPositions.find(p => p.assetId === assetId)
    return position?.totalAmountCryptoPrecision ?? '0'
  }, [supplyPositions, assetId])

  const currentPositionFiat = useMemo(() => {
    const position = supplyPositions.find(p => p.assetId === assetId)
    return position?.totalAmountFiat ?? '0'
  }, [supplyPositions, assetId])

  const supplyApyPercent = useMemo(
    () => (poolForAsset ? bnOrZero(poolForAsset.supplyApy).times(100).toFixed(2) : null),
    [poolForAsset],
  )

  const poolSharePercent = useMemo(() => {
    if (!poolForAsset) return '0.00'
    const totalPoolCrypto = bnOrZero(poolForAsset.totalAmountCryptoPrecision)
    if (totalPoolCrypto.isZero()) return '0.00'
    const userCrypto = bnOrZero(currentPositionCrypto).plus(bnOrZero(cryptoValue))
    return userCrypto
      .div(totalPoolCrypto.plus(bnOrZero(cryptoValue)))
      .times(100)
      .toFixed(2)
  }, [poolForAsset, currentPositionCrypto, cryptoValue])

  const isStablecoin = useMemo(() => STABLECOIN_ASSET_IDS.includes(assetId), [assetId])

  const estYearlyEarningsFiat = useMemo(() => {
    if (!poolForAsset || !marketData?.price) return null
    const apyDecimal = bnOrZero(poolForAsset.supplyApy)
    if (apyDecimal.isZero()) return null
    return bnOrZero(cryptoValue).times(marketData.price).times(apyDecimal).toFixed(2)
  }, [poolForAsset, cryptoValue, marketData?.price])

  const { minSupply, isLoading: isMinSupplyLoading } = useChainflipMinimumSupply(assetId)

  const isBelowMinimum = useMemo(() => {
    if (!minSupply) return false
    const amount = bnOrZero(cryptoValue)
    return amount.gt(0) && amount.lt(minSupply)
  }, [cryptoValue, minSupply])

  const exceedsBalance = useMemo(
    () => bnOrZero(cryptoValue).gt(availableCryptoPrecision),
    [cryptoValue, availableCryptoPrecision],
  )

  const hasFreeBalance = useMemo(
    () => bnOrZero(freeBalanceCryptoBaseUnit).gt(0),
    [freeBalanceCryptoBaseUnit],
  )

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
      title: 'chainflipLending.supply.title',
      assets: lendingAssets,
    })
  }, [buyAssetSearch, onAssetChange, lendingAssets])

  const handleInputChange = useCallback((values: NumberFormatValues) => {
    setInputValue(values.value)
  }, [])

  const handleToggleIsFiat = useCallback(() => {
    if (!marketData?.price) return
    setInputValue(prev => {
      if (!prev) return prev
      if (isFiat) {
        // switching fiat -> crypto: convert current fiat input to crypto
        return bnOrZero(prev)
          .div(marketData.price)
          .decimalPlaces(asset?.precision ?? 18, 1)
          .toFixed()
      } else {
        // switching crypto -> fiat: convert current crypto input to fiat
        return bnOrZero(prev).times(marketData.price).decimalPlaces(2, 1).toFixed()
      }
    })
    setIsFiat()
  }, [isFiat, marketData?.price, asset?.precision, setIsFiat])

  const handleMaxClick = useCallback(() => {
    if (isFiat && marketData?.price) {
      const fiatMax = bnOrZero(availableCryptoPrecision).times(marketData.price).toString()
      setInputValue(fiatMax)
    } else {
      setInputValue(availableCryptoPrecision)
    }
  }, [availableCryptoPrecision, isFiat, marketData?.price])

  const handleSubmit = useCallback(() => {
    if (!asset) return
    const effectiveCrypto = isFiat ? cryptoFromFiat : inputValue
    const baseUnit = BigAmount.fromPrecision({
      value: effectiveCrypto || '0',
      precision: asset.precision,
    }).toBaseUnit()

    actorRef.send({
      type: 'SUBMIT',
      supplyAmountCryptoPrecision: effectiveCrypto,
      supplyAmountCryptoBaseUnit: baseUnit,
    })
  }, [actorRef, inputValue, isFiat, cryptoFromFiat, asset])

  const isAmountZero = bnOrZero(cryptoValue).isZero()

  const isSubmitDisabled = useMemo(
    () => isMinSupplyLoading || isAmountZero || exceedsBalance || isBelowMinimum || !hasFreeBalance,
    [isMinSupplyLoading, isAmountZero, exceedsBalance, isBelowMinimum, hasFreeBalance],
  )

  const submitButtonColorScheme = useMemo(() => {
    if (!isAmountZero && (exceedsBalance || isBelowMinimum)) return 'red'
    return 'blue'
  }, [isAmountZero, exceedsBalance, isBelowMinimum])

  const submitButtonText = useMemo(() => {
    if (exceedsBalance) return translate('common.insufficientFunds')
    if (isBelowMinimum && minSupply)
      return translate('chainflipLending.supply.minimumSupply', {
        amount: `${bnOrZero(minSupply).decimalPlaces(2).toFixed()} ${asset?.symbol}`,
      })
    return translate('common.next')
  }, [exceedsBalance, isBelowMinimum, minSupply, asset?.symbol, translate])

  if (!asset) return null

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={4} align='stretch'>
          {/* Asset to supply label */}
          <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
            {translate('chainflipLending.supply.assetToSupply')}
          </RawText>

          {/* Asset card */}
          <Box
            borderWidth={1}
            borderColor='border.base'
            borderRadius='xl'
            px={4}
            py={3}
            cursor='pointer'
            _hover={{ borderColor: 'border.hover' }}
            onClick={handleAssetClick}
          >
            <Flex justifyContent='space-between' alignItems='center'>
              <Flex alignItems='center' gap={3}>
                <AssetIcon assetId={assetId} size='sm' />
                <VStack spacing={0} align='flex-start'>
                  <RawText fontSize='md' fontWeight='semibold'>
                    {asset.name}
                  </RawText>
                  <Amount.Crypto
                    value={availableCryptoPrecision}
                    symbol={asset.symbol}
                    fontSize='xs'
                    color='text.subtle'
                  />
                </VStack>
              </Flex>
              {availableFiat !== undefined && (
                <Amount.Fiat value={availableFiat} fontSize='sm' fontWeight='medium' />
              )}
            </Flex>
          </Box>

          {/* Stats row - Pool APY and Current Position in bordered boxes */}
          <Flex gap={3} width='full'>
            {supplyApyPercent !== null && (
              <Box
                flex={1}
                borderWidth={1}
                borderColor='border.base'
                borderRadius='xl'
                px={4}
                py={3}
              >
                <VStack spacing={0} align='flex-start'>
                  <RawText fontSize='xs' color='text.subtle'>
                    {translate('chainflipLending.supply.poolApy')}
                  </RawText>
                  <RawText fontSize='sm' fontWeight='bold' color='green.500'>
                    {supplyApyPercent}%
                  </RawText>
                </VStack>
              </Box>
            )}
            <Box flex={1} borderWidth={1} borderColor='border.base' borderRadius='xl' px={4} py={3}>
              <VStack spacing={0} align='flex-start'>
                <RawText fontSize='xs' color='text.subtle'>
                  {translate('chainflipLending.supply.currentPosition')}
                </RawText>
                {bnOrZero(currentPositionCrypto).gt(0) ? (
                  <Amount.Fiat value={currentPositionFiat} fontSize='sm' fontWeight='bold' />
                ) : (
                  <Amount.Fiat value='0' fontSize='sm' fontWeight='bold' />
                )}
              </VStack>
            </Box>
          </Flex>

          {/* Amount label */}
          <Stack spacing={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.supply.amount')}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <NumericFormat
                data-testid='chainflip-supply-amount-input'
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
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '0.5rem 0',
                }}
              />
              {!isFiat && (
                <Flex alignItems='center' gap={2}>
                  <AssetIcon assetId={assetId} size='xs' />
                  <RawText fontSize='lg' fontWeight='bold' color='text.subtle'>
                    {asset.symbol}
                  </RawText>
                </Flex>
              )}
            </Flex>

            {/* Fiat estimate + Balance/Max row */}
            <Flex justifyContent='space-between' alignItems='center'>
              {marketData?.price ? (
                <Button
                  variant='link'
                  size='xs'
                  color='text.subtle'
                  fontWeight='medium'
                  onClick={handleToggleIsFiat}
                  px={0}
                >
                  {isFiat ? (
                    <Amount.Crypto value={cryptoValue || '0'} symbol={asset.symbol} fontSize='xs' />
                  ) : (
                    <Amount.Fiat value={fiatValue} prefix='≈' fontSize='xs' />
                  )}
                </Button>
              ) : (
                <Box />
              )}
              <Flex alignItems='center' gap={1}>
                <RawText fontSize='xs' color='text.subtle'>
                  {translate('common.balance')}:
                </RawText>
                <Amount.Crypto
                  value={availableCryptoPrecision}
                  symbol={asset.symbol}
                  fontSize='xs'
                  color='text.subtle'
                />
                <Button
                  data-testid='chainflip-supply-max'
                  size='xs'
                  variant='ghost'
                  colorScheme='blue'
                  onClick={handleMaxClick}
                  isDisabled={!hasFreeBalance}
                  px={1}
                  height='auto'
                  minHeight={0}
                >
                  {translate('modals.send.sendForm.max')}
                </Button>
              </Flex>
            </Flex>
          </Stack>

          <Divider borderColor='border.subtle' />

          {/* Info rows */}
          <VStack spacing={3} align='stretch'>
            {estYearlyEarningsFiat !== null && !bnOrZero(cryptoValue).isZero() && (
              <Flex justifyContent='space-between' alignItems='center'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.dashboard.estimatedYearlyEarnings')}
                </RawText>
                <Amount.Fiat
                  value={estYearlyEarningsFiat}
                  fontSize='sm'
                  fontWeight='medium'
                  suffix={` / ${translate('chainflipLending.supply.year')}`}
                />
              </Flex>
            )}

            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.supply.poolShare')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium'>
                {poolSharePercent}%
              </RawText>
            </Flex>

            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.supply.autoCompounding')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium' color='green.500'>
                {translate('chainflipLending.supply.enabled')}
              </RawText>
            </Flex>

            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.supply.riskBand')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium'>
                {isStablecoin
                  ? translate('chainflipLending.supply.conservativeStablecoin')
                  : translate('chainflipLending.supply.volatileAsset')}
              </RawText>
            </Flex>
          </VStack>

          {!hasFreeBalance && (
            <RawText fontSize='xs' color='yellow.500'>
              {translate('chainflipLending.supply.noFreeBalance')}
            </RawText>
          )}
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
        <Button
          data-testid='chainflip-supply-submit'
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
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
