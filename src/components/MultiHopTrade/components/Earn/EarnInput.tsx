import { Box, Flex, Stack, useMediaQuery } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { cosmosChainId, ethAssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import { useQuery } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { SideComponentProps } from '../SharedTradeInput/SharedTradeInput'
import { SharedTradeInput } from '../SharedTradeInput/SharedTradeInput'
import { SellAssetInput } from '../TradeInput/components/SellAssetInput'
import { EarnFooter } from './components/EarnFooter'
import { YieldSelector } from './components/YieldSelector'
import { EarnRoutePaths } from './types'

import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { FormDivider } from '@/components/FormDivider'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero, positiveOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { enterYield } from '@/lib/yieldxyz/api'
import { getDefaultValidatorForYield, isYieldDisabled } from '@/lib/yieldxyz/utils'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataByFilter,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import {
  selectHasUserEnteredAmount,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectIsInputtingFiatSellAmount,
  selectSelectedYieldId,
  selectSellAccountId,
} from '@/state/slices/tradeEarnInputSlice/selectors'
import { tradeEarnInput } from '@/state/slices/tradeEarnInputSlice/tradeEarnInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

export type EarnInputProps = {
  onChangeTab: (newTab: TradeInputTab) => void
  tradeInputRef: React.RefObject<HTMLDivElement | null>
  defaultSellAssetId?: string
  defaultYieldId?: string
  defaultSellAmountCryptoBaseUnit?: string
}

const SELL_AMOUNT_DEBOUNCE_MS = 500
const EmptySideComponent: React.FC<SideComponentProps> = () => null

export const EarnInput = memo(
  ({
    onChangeTab,
    tradeInputRef,
    defaultSellAssetId,
    defaultYieldId,
    defaultSellAmountCryptoBaseUnit,
  }: EarnInputProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
    const {
      number: { toFiat },
    } = useLocaleFormatter()

    const {
      state: { isConnected, wallet },
    } = useWallet()

    const sellAsset = useAppSelector(selectInputSellAsset)
    const sellAccountId = useAppSelector(selectSellAccountId)
    const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
    const sellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
    const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)
    const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
    const selectedYieldId = useAppSelector(selectSelectedYieldId)

    const { data: yieldsData, isLoading: isLoadingYields } = useYields()

    const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
    const defaultSellAsset = useAppSelector(state =>
      defaultSellAssetId ? selectAssetById(state, defaultSellAssetId as AssetId) : undefined,
    )

    useEffect(() => {
      if (defaultSellAsset && !sellAsset.assetId) {
        dispatch(tradeEarnInput.actions.setSellAssetWithYieldReset(defaultSellAsset))
      } else if (!sellAsset.assetId && ethAsset) {
        dispatch(tradeEarnInput.actions.setSellAssetWithYieldReset(ethAsset))
      }
    }, [sellAsset.assetId, ethAsset, defaultSellAsset, dispatch])

    // Set default accountId (account 0) on mount if not already set
    const sellAssetChainId = sellAsset?.chainId
    const defaultAccountId = useAppSelector(state => {
      if (!sellAssetChainId) return undefined
      return selectAccountIdByAccountNumberAndChainId(state)[0]?.[sellAssetChainId]
    })

    useEffect(() => {
      if (!sellAccountId && defaultAccountId) {
        dispatch(tradeEarnInput.actions.setSellAccountId(defaultAccountId))
      }
    }, [sellAccountId, defaultAccountId, dispatch])

    useEffect(() => {
      if (defaultYieldId && !selectedYieldId && yieldsData?.byId?.[defaultYieldId]) {
        dispatch(tradeEarnInput.actions.setSelectedYieldId(defaultYieldId))
      }
    }, [defaultYieldId, selectedYieldId, yieldsData?.byId, dispatch])

    useEffect(() => {
      if (defaultSellAmountCryptoBaseUnit && defaultSellAsset && !sellAmountCryptoPrecision) {
        const precision = defaultSellAsset.precision ?? 18
        const amountCryptoPrecision = fromBaseUnit(defaultSellAmountCryptoBaseUnit, precision)
        dispatch(tradeEarnInput.actions.setSellAmountCryptoPrecision(amountCryptoPrecision))
      }
    }, [defaultSellAmountCryptoBaseUnit, defaultSellAsset, sellAmountCryptoPrecision, dispatch])

    const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)

    useEffect(() => {
      if (!sellAsset.assetId || !selectedYieldId) return

      const encodedAssetId = encodeURIComponent(sellAsset.assetId)
      const encodedYieldId = encodeURIComponent(selectedYieldId)
      const baseUnit = sellAmountCryptoBaseUnit ?? '0'

      navigate(`/earn/${encodedAssetId}/${encodedYieldId}/${baseUnit}`, { replace: true })
    }, [sellAsset.assetId, selectedYieldId, sellAmountCryptoBaseUnit, navigate])

    const selectedYield = useMemo(() => {
      if (!selectedYieldId || !yieldsData?.byId) return undefined
      return yieldsData.byId[selectedYieldId]
    }, [selectedYieldId, yieldsData?.byId])

    const requiresValidatorSelection = useMemo(() => {
      return selectedYield?.mechanics.requiresValidatorSelection ?? false
    }, [selectedYield?.mechanics.requiresValidatorSelection])

    const { data: validators } = useYieldValidators(
      selectedYieldId ?? '',
      requiresValidatorSelection,
    )

    const selectedValidator = useMemo(() => {
      if (!requiresValidatorSelection || !validators?.length || !selectedYield) return undefined
      const defaultAddress = getDefaultValidatorForYield(selectedYield.id)
      if (defaultAddress) {
        return (
          validators.find(v => v.address === defaultAddress) ??
          validators.find(v => v.preferred) ??
          validators[0]
        )
      }
      return validators.find(v => v.preferred) ?? validators[0]
    }, [requiresValidatorSelection, validators, selectedYield])

    const selectedValidatorAddress = selectedValidator?.address

    const yieldChainId = selectedYield?.chainId

    const userAddress = useMemo(
      () => (sellAccountId ? fromAccountId(sellAccountId).account : ''),
      [sellAccountId],
    )

    const feeAsset = useAppSelector(state =>
      yieldChainId ? selectFeeAssetByChainId(state, yieldChainId) : undefined,
    )

    const feeAssetMarketData = useAppSelector(state =>
      feeAsset?.assetId
        ? selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId)
        : undefined,
    )

    const debouncedAmount = useDebounce(sellAmountCryptoPrecision, SELL_AMOUNT_DEBOUNCE_MS)

    const txArguments = useMemo(() => {
      if (!selectedYield || !userAddress || !yieldChainId || !debouncedAmount) return null
      if (!bnOrZero(debouncedAmount).gt(0)) return null

      const fields = selectedYield.mechanics.arguments.enter.fields
      const fieldNames = new Set(fields.map(field => field.name))
      const args: Record<string, unknown> = { amount: debouncedAmount }

      if (fieldNames.has('receiverAddress')) {
        args.receiverAddress = userAddress
      }

      if (fieldNames.has('validatorAddress') && selectedYield) {
        const validatorAddress =
          selectedValidatorAddress ?? getDefaultValidatorForYield(selectedYield.id)
        if (validatorAddress) {
          args.validatorAddress = validatorAddress
        }
      }

      if (fieldNames.has('cosmosPubKey') && yieldChainId === cosmosChainId) {
        args.cosmosPubKey = userAddress
      }

      return args
    }, [selectedYield, userAddress, yieldChainId, debouncedAmount, selectedValidatorAddress])

    const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
      queryKey: ['yieldxyz', 'quote', 'enter', selectedYield?.id, userAddress, txArguments],
      queryFn: () => {
        if (!txArguments || !userAddress || !selectedYield?.id) throw new Error('Missing arguments')
        return enterYield({
          yieldId: selectedYield.id,
          address: userAddress,
          arguments: txArguments,
        })
      },
      enabled:
        !!txArguments &&
        !!wallet &&
        !!sellAccountId &&
        !!selectedYield &&
        isConnected &&
        bnOrZero(debouncedAmount).gt(0),
      staleTime: 30_000,
      gcTime: 60_000,
      retry: false,
    })

    const networkFeeFiatUserCurrency = useMemo(() => {
      if (!quoteData?.transactions?.length || !feeAssetMarketData?.price) {
        return undefined
      }

      const totalGasCryptoPrecision = quoteData.transactions.reduce((acc, tx) => {
        if (!tx.gasEstimate) return acc
        try {
          const gasData = JSON.parse(tx.gasEstimate)
          return acc.plus(bnOrZero(gasData.amount))
        } catch {
          return acc
        }
      }, bnOrZero(0))

      if (totalGasCryptoPrecision.isZero()) return undefined
      return totalGasCryptoPrecision.times(feeAssetMarketData.price).toFixed(2)
    }, [quoteData?.transactions, feeAssetMarketData?.price])

    const { price: sellAssetUserCurrencyRate } =
      useAppSelector(state => selectMarketDataByFilter(state, { assetId: sellAsset?.assetId })) ||
      {}

    const balanceFilter = useMemo(
      () => ({ accountId: sellAccountId ?? '', assetId: sellAsset?.assetId ?? '' }),
      [sellAccountId, sellAsset?.assetId],
    )
    const sellAssetBalanceCryptoPrecision = useAppSelector(state =>
      isConnected ? fromBaseUnit(selectPortfolioCryptoBalanceByFilter(state, balanceFilter)) : '0',
    )

    const minDeposit = useMemo(
      () => selectedYield?.mechanics.entryLimits.minimum,
      [selectedYield?.mechanics.entryLimits.minimum],
    )

    const isBelowMinimum = useMemo(() => {
      if (!sellAmountCryptoPrecision || !minDeposit) return false
      return (
        bnOrZero(sellAmountCryptoPrecision).gt(0) &&
        bnOrZero(sellAmountCryptoPrecision).lt(minDeposit)
      )
    }, [sellAmountCryptoPrecision, minDeposit])

    const isInsufficientBalance = useMemo(() => {
      if (!sellAmountCryptoPrecision || !sellAssetBalanceCryptoPrecision) return false
      return bnOrZero(sellAmountCryptoPrecision).gt(sellAssetBalanceCryptoPrecision)
    }, [sellAmountCryptoPrecision, sellAssetBalanceCryptoPrecision])

    const sellAssetSearch = useModal('sellTradeAssetSearch')

    const availableAssetIds = useMemo(() => {
      if (!yieldsData?.byInputAssetId) return new Set<AssetId>()
      return new Set(Object.keys(yieldsData.byInputAssetId))
    }, [yieldsData?.byInputAssetId])

    const assetFilterPredicate = useCallback(
      (assetId: AssetId) => availableAssetIds.has(assetId),
      [availableAssetIds],
    )

    const handleSellAssetClick = useCallback(() => {
      sellAssetSearch.open({
        onAssetClick: (asset: Asset) => {
          dispatch(tradeEarnInput.actions.setSellAssetWithYieldReset(asset))
        },
        title: 'earn.enterFrom',
        assetFilterPredicate,
        chainIdFilterPredicate: () => true,
      })
    }, [assetFilterPredicate, dispatch, sellAssetSearch])

    const setSellAsset = useCallback(
      (asset: Asset) => {
        dispatch(tradeEarnInput.actions.setSellAssetWithYieldReset(asset))
      },
      [dispatch],
    )

    const setSellAccountId = useCallback(
      (accountId: AccountId) => {
        dispatch(tradeEarnInput.actions.setSellAccountId(accountId))
      },
      [dispatch],
    )

    const handleSellAmountChange = useCallback(
      (value: string) => {
        dispatch(
          tradeEarnInput.actions.setSellAmountCryptoPrecision(positiveOrZero(value).toString()),
        )
      },
      [dispatch],
    )

    const handleIsInputtingFiatSellAmountChange = useCallback(
      (isInputtingFiat: boolean) => {
        dispatch(tradeEarnInput.actions.setIsInputtingFiatSellAmount(isInputtingFiat))
      },
      [dispatch],
    )

    const handleYieldSelect = useCallback(
      (yieldId: string) => {
        dispatch(tradeEarnInput.actions.setSelectedYieldId(yieldId))
      },
      [dispatch],
    )

    const percentOptions = useMemo(() => {
      if (!sellAsset?.assetId) return []
      if (!isToken(sellAsset.assetId)) return []
      return [1]
    }, [sellAsset?.assetId])

    const assetSelectButtonProps = useMemo(
      () => ({
        maxWidth: isSmallerThanMd ? '100%' : undefined,
      }),
      [isSmallerThanMd],
    )

    const sellTradeAssetSelect = useMemo(
      () => (
        <TradeAssetSelect
          assetId={sellAsset?.assetId}
          onAssetClick={handleSellAssetClick}
          onAssetChange={setSellAsset}
          onlyConnectedChains={true}
          assetFilterPredicate={assetFilterPredicate}
          showChainDropdown={!isSmallerThanMd}
          buttonProps={assetSelectButtonProps}
          mb={isSmallerThanMd ? 0 : 4}
        />
      ),
      [
        sellAsset?.assetId,
        handleSellAssetClick,
        setSellAsset,
        assetFilterPredicate,
        isSmallerThanMd,
        assetSelectButtonProps,
      ],
    )

    const yieldsForAsset = useMemo(() => {
      if (!sellAsset?.assetId || !yieldsData?.byInputAssetId) return []
      const allYields = yieldsData.byInputAssetId[sellAsset.assetId] ?? []
      return allYields.filter(y => !isYieldDisabled(y))
    }, [sellAsset?.assetId, yieldsData?.byInputAssetId])

    const defaultYieldForAsset = useMemo(() => {
      if (yieldsForAsset.length === 0) return undefined

      const sortedByApy = [...yieldsForAsset].sort(
        (a, b) => (b.rewardRate?.total ?? 0) - (a.rewardRate?.total ?? 0),
      )

      const userBalance = bnOrZero(sellAssetBalanceCryptoPrecision)
      const actionableYield = sortedByApy.find(y => {
        if (!y.status.enter) return false
        const minDepositAmount = bnOrZero(y.mechanics?.entryLimits?.minimum)
        return minDepositAmount.lte(0) || userBalance.gte(minDepositAmount)
      })

      const enabledYield = actionableYield ?? sortedByApy.find(y => y.status.enter)
      return enabledYield ?? sortedByApy[0]
    }, [yieldsForAsset, sellAssetBalanceCryptoPrecision])

    useEffect(() => {
      if (defaultYieldForAsset && !selectedYieldId) {
        dispatch(tradeEarnInput.actions.setSelectedYieldId(defaultYieldForAsset.id))
      }
    }, [defaultYieldForAsset, selectedYieldId, dispatch])

    const handleSubmit = useCallback(
      (e: FormEvent<unknown>) => {
        e.preventDefault()
        if (!selectedYield || !hasUserEnteredAmount || !isConnected) return
        navigate(EarnRoutePaths.Confirm)
      },
      [selectedYield, hasUserEnteredAmount, isConnected, navigate],
    )

    const estimatedYearlyEarnings = useMemo(() => {
      if (!selectedYield || !sellAmountCryptoPrecision) return undefined
      const apy = selectedYield.rewardRate?.total ?? 0
      const amount = bnOrZero(sellAmountCryptoPrecision)
      if (amount.isZero()) return undefined
      return amount.times(apy).decimalPlaces(6).toString()
    }, [selectedYield, sellAmountCryptoPrecision])

    const estimatedYearlyEarningsUserCurrency = useMemo(() => {
      if (!estimatedYearlyEarnings || !sellAssetUserCurrencyRate) return undefined
      return bnOrZero(estimatedYearlyEarnings)
        .times(sellAssetUserCurrencyRate)
        .decimalPlaces(2)
        .toString()
    }, [estimatedYearlyEarnings, sellAssetUserCurrencyRate])

    const placeholder = useMemo(() => {
      return toFiat(0, { omitDecimalTrailingZeros: true })
    }, [toFiat])

    const bodyContent = useMemo(
      () => (
        <Flex flexDir='column' height='100%' minHeight={0} overflow='auto'>
          <Stack spacing={0} flex='0 0 auto'>
            <SellAssetInput
              accountId={sellAccountId}
              asset={sellAsset}
              isInputtingFiatSellAmount={isInputtingFiatSellAmount}
              isLoading={isLoadingYields}
              placeholder={isInputtingFiatSellAmount ? placeholder : '0'}
              label={translate('earn.stakeAmount')}
              labelPostFix={sellTradeAssetSelect}
              percentOptions={percentOptions}
              sellAmountCryptoPrecision={sellAmountCryptoPrecision}
              sellAmountUserCurrency={sellAmountUserCurrency}
              onChangeAccountId={setSellAccountId}
              onChangeIsInputtingFiatSellAmount={handleIsInputtingFiatSellAmountChange}
              onChangeSellAmountCryptoPrecision={handleSellAmountChange}
            />
            <FormDivider isLoading={isLoadingYields} mt={2} isDisabled />
            <Box px={4} pt={4}>
              <YieldSelector
                selectedYieldId={selectedYieldId}
                yields={yieldsForAsset}
                onYieldSelect={handleYieldSelect}
                isLoading={isLoadingYields}
                sellAsset={sellAsset}
                selectedValidator={selectedValidator}
              />
            </Box>
          </Stack>
        </Flex>
      ),
      [
        sellAccountId,
        sellAsset,
        isInputtingFiatSellAmount,
        isLoadingYields,
        placeholder,
        translate,
        sellTradeAssetSelect,
        percentOptions,
        sellAmountCryptoPrecision,
        sellAmountUserCurrency,
        setSellAccountId,
        handleIsInputtingFiatSellAmountChange,
        handleSellAmountChange,
        selectedYieldId,
        yieldsForAsset,
        handleYieldSelect,
        selectedValidator,
      ],
    )

    const footerContent = useMemo(
      () => (
        <EarnFooter
          selectedYield={selectedYield}
          hasUserEnteredAmount={hasUserEnteredAmount}
          isLoading={isLoadingYields}
          sellAsset={sellAsset}
          estimatedYearlyEarnings={estimatedYearlyEarnings}
          estimatedYearlyEarningsUserCurrency={estimatedYearlyEarningsUserCurrency}
          isConnected={isConnected}
          isBelowMinimum={isBelowMinimum}
          isInsufficientBalance={isInsufficientBalance}
          networkFeeFiatUserCurrency={networkFeeFiatUserCurrency}
          isQuoteLoading={isQuoteLoading}
        />
      ),
      [
        selectedYield,
        hasUserEnteredAmount,
        isLoadingYields,
        sellAsset,
        estimatedYearlyEarnings,
        estimatedYearlyEarningsUserCurrency,
        isConnected,
        isBelowMinimum,
        isInsufficientBalance,
        networkFeeFiatUserCurrency,
        isQuoteLoading,
      ],
    )

    return (
      <SharedTradeInput
        onChangeTab={onChangeTab}
        bodyContent={bodyContent}
        footerContent={footerContent}
        headerRightContent={<></>}
        isCompact={false}
        isLoading={isLoadingYields}
        SideComponent={EmptySideComponent}
        shouldOpenSideComponent={false}
        tradeInputTab={TradeInputTab.Earn}
        tradeInputRef={tradeInputRef}
        onSubmit={handleSubmit}
      />
    )
  },
)
