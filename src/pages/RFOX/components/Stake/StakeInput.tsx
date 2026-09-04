import { CardBody, CardFooter, Collapse, Skeleton, Stack, useMediaQuery } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { BigAmount, getChainShortName, isSome } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ChainNotSupported } from '../Shared/ChainNotSupported'
import { ConnectWallet } from '../Shared/ConnectWallet'
import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import { StakeSummary } from './components/StakeSummary'
import { useRfoxStake } from './hooks/useRfoxStake'
import type { RfoxStakingQuote, StakeInputValues, StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

import { InfoAcknowledgement } from '@/components/Acknowledgement/InfoAcknowledgement'
import { Amount } from '@/components/Amount/Amount'
import { TradeAssetSelect } from '@/components/AssetSelection/AssetSelection'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { useModal } from '@/hooks/useModal/useModal'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useCooldownPeriodQuery } from '@/pages/RFOX/hooks/useCooldownPeriodQuery'
import { useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataByFilter,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 4,
}

type StakeInputProps = {
  stakingAssetId?: AssetId
  l1AssetId?: AssetId
  setConfirmedQuote: (quote: RfoxStakingQuote | undefined) => void
}

const defaultFormValues = {
  amountFieldInput: '',
  amountCryptoPrecision: '',
  amountUserCurrency: '',
}

export const StakeInput: React.FC<StakeInputProps & StakeRouteProps> = ({
  l1AssetId = foxAssetId,
  headerComponent,
  setConfirmedQuote,
}) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const navigate = useNavigate()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const {
    state: { isConnected, wallet },
  } = useWallet()

  const { stakingAssetId, selectedAssetAccountId, stakingAssetAccountId } = useRFOXContext()

  // The asset the user funds the stake with, which is not necessarily the asset the selected staking
  // program takes - the Arbitrum FOX program can also be funded with mainnet FOX, by bridging first.
  const [fundingAssetId, setFundingAssetId] = useState<AssetId>(stakingAssetId)

  useEffect(() => {
    setFundingAssetId(stakingAssetId)
  }, [stakingAssetId])

  // Funding options are scoped to the selected staking program. The Ethereum program is funded with
  // mainnet FOX only - bridging Arbitrum FOX back to mainnet goes through the canonical bridge's 7
  // day challenge period, so it is not offered here.
  const fundingAssetIds = useMemo(() => {
    if (stakingAssetId === foxOnArbitrumOneAssetId) return [foxOnArbitrumOneAssetId, l1AssetId]
    return [stakingAssetId]
  }, [l1AssetId, stakingAssetId])

  const assets = useAppSelector(selectAssets)

  const fundingAssets = useMemo(() => {
    return fundingAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, fundingAssetIds])

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const isBridgeRequired = fundingAssetId !== stakingAssetId

  const isChainSupportedByWallet = useWalletSupportsChain(
    fromAssetId(fundingAssetId).chainId,
    wallet,
  )

  const methods = useForm<StakeInputValues>({
    defaultValues: defaultFormValues,
    mode: 'all',
    shouldUnregister: true,
  })

  const {
    formState: { errors },
    control,
    trigger,
    setValue,
  } = methods

  const selectedFundingAsset = useAppSelector(state =>
    selectAssetById(state, fundingAssetId),
  )
  const selectedFundingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, fundingAssetId),
  )
  const selectedFundingAssetBalanceFilter = useMemo(
    () => ({
      accountId: selectedAssetAccountId ?? '',
      assetId: fundingAssetId,
    }),
    [selectedAssetAccountId, fundingAssetId],
  )
  const selectedFundingAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, selectedFundingAssetBalanceFilter),
  ).toPrecision()
  const selectedFundingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(fundingAssetId).chainId),
  )

  const stakingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )
  const stakingAssetFeeAssetBalanceFilter = useMemo(
    () => ({
      accountId: stakingAssetAccountId ?? '',
      assetId: stakingAssetFeeAsset?.assetId,
    }),
    [stakingAssetAccountId, stakingAssetFeeAsset?.assetId],
  )
  const stakingAssetFeeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, stakingAssetFeeAssetBalanceFilter),
  )

  const [showWarning, setShowWarning] = useState(false)
  const [collapseIn, setCollapseIn] = useState(false)
  const percentOptions = useMemo(() => [1], [])

  const amountCryptoPrecision = useWatch<StakeInputValues, 'amountCryptoPrecision'>({
    control,
    name: 'amountCryptoPrecision',
  })
  const amountUserCurrency = useWatch<StakeInputValues, 'amountUserCurrency'>({
    control,
    name: 'amountUserCurrency',
  })

  const amountCryptoBaseUnit = useMemo(
    () =>
      BigAmount.fromPrecision({
        value: amountCryptoPrecision,
        precision: selectedFundingAsset?.precision ?? 0,
      }).toBaseUnit(),
    [amountCryptoPrecision, selectedFundingAsset?.precision],
  )

  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const isValidStakingAmount = useMemo(
    () => bnOrZero(amountUserCurrency).plus(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision, amountUserCurrency],
  )

  useEffect(() => {
    // hydrate market data in case the user doesn't hold it
    fundingAssetIds.forEach(assetId => {
      dispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
    })
  }, [dispatch, fundingAssetIds])

  useEffect(() => {
    // Only set this once, never collapse out
    if (collapseIn) return
    if (isValidStakingAmount) setCollapseIn(true)
  }, [collapseIn, isValidStakingAmount])

  const validateHasEnoughBalance = useCallback(
    (input: string) => {
      if (bnOrZero(input).lte(0)) return true

      const selectedFundingAssetFiatBalance = bnOrZero(selectedFundingAssetBalanceCryptoPrecision)
        .times(bnOrZero(selectedFundingAssetMarketData?.price))
        .toString()

      const hasEnoughBalance = bnOrZero(input).lte(
        bnOrZero(
          isFiat ? selectedFundingAssetFiatBalance : selectedFundingAssetBalanceCryptoPrecision,
        ),
      )

      return hasEnoughBalance
    },
    [isFiat, selectedFundingAssetBalanceCryptoPrecision, selectedFundingAssetMarketData],
  )

  const hasEnoughBalance = useMemo(
    () => validateHasEnoughBalance(isFiat ? amountUserCurrency : amountCryptoPrecision),
    [amountCryptoPrecision, amountUserCurrency, isFiat, validateHasEnoughBalance],
  )

  const {
    isGetApprovalFeesEnabled,
    isGetStakeFeesEnabled,
    stakeFeesQuery: {
      data: stakeFees,
      isLoading: isStakeFeesLoading,
      isSuccess: isStakeFeesSuccess,
    },
    approvalFeesQuery: {
      data: approvalFees,
      isLoading: isGetApprovalFeesLoading,
      isSuccess: isGetApprovalFeesSuccess,
    },
  } = useRfoxStake({
    amountCryptoBaseUnit,
    stakingAssetId,
    stakingAssetAccountId,
    hasEnoughBalance,
    // Not required at this stage just yet, we're only estimating fees
    setStakeTxid: undefined,
    methods,
  })

  const { data: cooldownPeriodData } = useCooldownPeriodQuery(stakingAssetId)

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (
      !(
        selectedAssetAccountId &&
        stakingAssetAccountId &&
        selectedFundingAsset &&
        isValidStakingAmount
      )
    )
      return

    const _confirmedQuote = {
      stakingAssetAccountId,
      stakingAssetId,
      stakingAmountCryptoBaseUnit: BigAmount.fromPrecision({
        value: amountCryptoPrecision,
        precision: selectedFundingAsset.precision,
      }).toBaseUnit(),
    }

    setConfirmedQuote(_confirmedQuote)

    if (isBridgeRequired) {
      const bridgeQuote: RfoxBridgeQuote = {
        sellAssetId: fundingAssetId,
        buyAssetId: stakingAssetId,
        bridgeAmountCryptoBaseUnit: BigAmount.fromPrecision({
          value: amountCryptoPrecision,
          precision: selectedFundingAsset.precision,
        }).toBaseUnit(),
        sellAssetAccountId: selectedAssetAccountId,
        buyAssetAccountId: stakingAssetAccountId,
      }
      return navigate(BridgeRoutePaths.Confirm, { state: bridgeQuote })
    }

    navigate(StakeRoutePaths.Confirm)
  }, [
    selectedAssetAccountId,
    stakingAssetAccountId,
    selectedFundingAsset,
    stakingAssetId,
    fundingAssetId,
    isValidStakingAmount,
    amountCryptoPrecision,
    setConfirmedQuote,
    isBridgeRequired,
    navigate,
  ])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleFundingAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: asset => setFundingAssetId(asset.assetId),
      title: 'common.selectAsset',
      assets: fundingAssets,
    })
  }, [fundingAssets, buyAssetSearch, setFundingAssetId])

  const handleAssetChange = useCallback(
    (asset: Asset) => setFundingAssetId(asset.assetId),
    [setFundingAssetId],
  )

  const assetSelectButtonProps = useMemo(() => {
    return {
      maxWidth: isSmallerThanMd ? '100%' : undefined,
    }
  }, [isSmallerThanMd])

  const assetSelectComponent = useMemo(() => {
    if (fundingAssetIds.length <= 1) {
      return (
        <TradeAssetSelect
          isReadOnly
          assetId={selectedFundingAsset?.assetId}
          assetIds={fundingAssetIds}
          onlyConnectedChains={true}
          buttonProps={assetSelectButtonProps}
          showChainDropdown={!isSmallerThanMd}
          px={6}
        />
      )
    }

    return (
      <TradeAssetSelect
        assetId={selectedFundingAsset?.assetId}
        onAssetClick={handleFundingAssetClick}
        onAssetChange={handleAssetChange}
        assetIds={fundingAssetIds}
        onlyConnectedChains={true}
        buttonProps={assetSelectButtonProps}
        showChainDropdown={!isSmallerThanMd}
        px={6}
      />
    )
  }, [
    assetSelectButtonProps,
    handleAssetChange,
    handleFundingAssetClick,
    isSmallerThanMd,
    selectedFundingAsset?.assetId,
    fundingAssetIds,
  ])

  const validateHasEnoughStakingAssetFeeBalance = useCallback(
    (input: string) => {
      // Do NOT do ETH.ARB balance checks here if the user is going to bridge.
      // Fees will be on mainnet, and estimate on the next step
      if (isBridgeRequired) return true
      // Staking asset fee asset still loading, assume enough balance not to have a flash of error state on first render
      if (!stakingAssetFeeAsset) return true
      if (bnOrZero(input).isZero()) return true
      if (stakingAssetFeeAssetBalance.isZero()) return false

      const fees = approvalFees || stakeFees

      const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
        stakingAssetFeeAssetBalance.toBaseUnit(),
      )

      if (!hasEnoughFeeBalance) return false

      return true
    },
    [stakingAssetFeeAsset, stakingAssetFeeAssetBalance, approvalFees, stakeFees, isBridgeRequired],
  )
  // Trigger re-validation since react-hook-form validation methods are fired onChange and not in a component-reactive manner
  useEffect(() => {
    trigger('amountFieldInput')
  }, [
    approvalFees,
    stakingAssetFeeAsset,
    stakingAssetFeeAssetBalance,
    amountCryptoPrecision,
    amountUserCurrency,
    stakeFees,
    trigger,
  ])

  const amountFieldInputRules = useMemo(() => {
    return {
      defaultValue: '',
      validate: {
        hasEnoughBalance: (input: string) =>
          validateHasEnoughBalance(input) || translate('common.insufficientFunds'),
        hasEnoughFeeBalance: (input: string) =>
          validateHasEnoughStakingAssetFeeBalance(input) ||
          translate('common.insufficientAmountForGas', {
            assetSymbol: stakingAssetFeeAsset?.symbol,
            chainSymbol: getChainShortName(stakingAssetFeeAsset?.chainId as KnownChainIds),
          }),
      },
    }
  }, [
    stakingAssetFeeAsset,
    translate,
    validateHasEnoughBalance,
    validateHasEnoughStakingAssetFeeBalance,
  ])

  const warningAcknowledgementMessage = useMemo(() => {
    if (!isBridgeRequired)
      return translate('RFOX.stakeWarning', {
        symbol: selectedFundingAsset?.symbol,
        cooldownPeriod: cooldownPeriodData?.cooldownPeriod,
      })

    return translate('RFOX.bridgeCta', {
      assetSymbol: selectedFundingAsset?.symbol,
      originNetwork: selectedFundingAssetFeeAsset?.networkName,
      destinationNetwork: stakingAssetFeeAsset?.networkName,
    })
  }, [
    cooldownPeriodData,
    isBridgeRequired,
    stakingAssetFeeAsset,
    selectedFundingAsset,
    selectedFundingAssetFeeAsset,
    translate,
  ])

  const marketData = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: fundingAssetId }),
  )
  const assetUserCurrencyRate = marketData?.price ?? '0'

  // Consumed by onMaxClick
  const handleAmountChange = useCallback(
    (value: string, isFiat: boolean | undefined) => {
      const amountCryptoPrecision = isFiat
        ? bnOrZero(value)
            .div(assetUserCurrencyRate)
            .decimalPlaces(selectedFundingAsset?.precision ?? 18, 1)
            .toFixed()
        : value
      const amountUserCurrency = !isFiat
        ? bnOrZero(value).times(assetUserCurrencyRate).toFixed()
        : value
      setValue('amountCryptoPrecision', amountCryptoPrecision, { shouldValidate: true })
      setValue('amountUserCurrency', amountUserCurrency, { shouldValidate: true })
    },
    [assetUserCurrencyRate, selectedFundingAsset?.precision, setValue],
  )

  const chainNotSupportedByWalletCopy = useMemo(() => {
    if (isChainSupportedByWallet) return
    return translate('RFOX.chainNotSupportedByWallet')
  }, [isChainSupportedByWallet, translate])

  const submitButtonText = useMemo(() => {
    if (isDiscoveringAccounts) return translate('common.accountsLoading')

    return (
      errors.amountFieldInput?.message || chainNotSupportedByWalletCopy || translate('RFOX.stake')
    )
  }, [chainNotSupportedByWalletCopy, errors.amountFieldInput, translate, isDiscoveringAccounts])

  if (!selectedFundingAsset) return null

  if (!isConnected)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ConnectWallet />
        </CardBody>
      </SlideTransition>
    )

  if (!stakingAssetAccountAddress && !isDiscoveringAccounts)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ChainNotSupported chainId={selectedFundingAsset?.chainId} />
        </CardBody>
      </SlideTransition>
    )

  return (
    <SlideTransition>
      <InfoAcknowledgement
        message={warningAcknowledgementMessage}
        onAcknowledge={handleSubmit}
        shouldShowAcknowledgement={showWarning}
        setShouldShowAcknowledgement={setShowWarning}
        buttonTranslation={'common.yes'}
      />
      <FormProvider {...methods}>
        <Stack>
          {headerComponent}
          <TradeAssetInput
            amountFieldInputRules={amountFieldInputRules}
            assetId={selectedFundingAsset?.assetId}
            accountId={selectedAssetAccountId}
            assetSymbol={selectedFundingAsset?.symbol ?? ''}
            assetIcon={selectedFundingAsset?.icon ?? ''}
            percentOptions={percentOptions}
            isAccountSelectionDisabled
            // Since we disable AccountId selection at asset-selection in profit of top-level page account dropdown,
            // this *is* effectively disabled, however, onAccountIdChange *needs* to be a noop, or else the top-level
            // dropdown will break, as this component calls onAccountIdChange once on first render - regardless of whether account selection is disabled or not
            onAccountIdChange={noop}
            onToggleIsFiat={handleToggleIsFiat}
            onChange={handleAmountChange}
            isFiat={isFiat}
            formControlProps={formControlProps}
            layout='stacked'
            placeholder={'0'}
            label={translate('transactionRow.amount')}
            labelPostFix={assetSelectComponent}
            isSendMaxDisabled={false}
            cryptoAmount={amountCryptoPrecision}
            fiatAmount={amountUserCurrency}
          />
          <Collapse in={collapseIn}>
            {stakingAssetAccountId && (
              <StakeSummary
                stakingAssetId={stakingAssetId}
                stakingAssetAccountId={stakingAssetAccountId}
                stakingAmountCryptoPrecision={amountCryptoPrecision}
              />
            )}
            <CardFooter
              borderTopWidth={1}
              borderColor='border.subtle'
              flexDir='column'
              gap={4}
              px={6}
              py={4}
              bg='background.surface.raised.accent'
            >
              {isGetApprovalFeesEnabled && (
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('common.approvalFee')}</Row.Label>
                  <Row.Value>
                    <Skeleton isLoaded={Boolean(!isGetApprovalFeesLoading && approvalFees)}>
                      <Amount.Fiat value={approvalFees?.txFeeFiat ?? 0} />
                    </Skeleton>
                  </Row.Value>
                </Row>
              )}
              {isGetStakeFeesEnabled && (
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('common.gasFee')}</Row.Label>
                  <Row.Value>
                    <Skeleton isLoaded={Boolean(!isStakeFeesLoading && stakeFees)}>
                      <Amount.Fiat value={stakeFees?.txFeeFiat ?? 0} />
                    </Skeleton>
                  </Row.Value>
                </Row>
              )}
            </CardFooter>
          </Collapse>
        </Stack>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <ButtonWalletPredicate
            isValidWallet={Boolean(isChainSupportedByWallet || isDiscoveringAccounts)}
            isDisabled={Boolean(
              errors.amountFieldInput ||
                !isValidStakingAmount ||
                !(isStakeFeesSuccess || isGetApprovalFeesSuccess) ||
                isDiscoveringAccounts ||
                !cooldownPeriodData?.cooldownPeriodSeconds,
            )}
            size='lg'
            mx={-2}
            onClick={handleWarning}
            isLoading={isGetApprovalFeesLoading || isStakeFeesLoading}
            colorScheme={
              Boolean(errors.amountFieldInput) && !isDiscoveringAccounts ? 'red' : 'blue'
            }
          >
            {submitButtonText}
          </ButtonWalletPredicate>
        </CardFooter>
      </FormProvider>
    </SlideTransition>
  )
}
