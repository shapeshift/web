import { CardBody, CardFooter, Collapse, Skeleton, Stack, useMediaQuery } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
} from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName, isSome } from '@shapeshiftoss/utils'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AddressSelection } from '../AddressSelection'
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
import { FormDivider } from '@/components/FormDivider'
import { TradeAssetInput } from '@/components/MultiHopTrade/components/TradeAssetInput'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { useModal } from '@/hooks/useModal/useModal'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import { selectRuneAddress } from '@/pages/RFOX/helpers'
import { useCooldownPeriodQuery } from '@/pages/RFOX/hooks/useCooldownPeriodQuery'
import { supportedStakingAssetIds, useRFOXContext } from '@/pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}

type StakeInputProps = {
  stakingAssetId?: AssetId
  l1AssetId?: AssetId
  onRuneAddressChange: (address: string | undefined) => void
  runeAddress: string | undefined
  setConfirmedQuote: (quote: RfoxStakingQuote | undefined) => void
}

const defaultFormValues = {
  amountFieldInput: '',
  amountCryptoPrecision: '',
  amountUserCurrency: '',
  manualRuneAddress: '',
}

export const StakeInput: React.FC<StakeInputProps & StakeRouteProps> = ({
  l1AssetId = foxAssetId,
  headerComponent,
  onRuneAddressChange,
  runeAddress,
  setConfirmedQuote,
  setStepIndex,
}) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const navigate = useNavigate()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })

  const {
    state: { isConnected, wallet },
  } = useWallet()

  const {
    stakingAssetId: selectedStakingAssetId,
    setStakingAssetId: setSelectedStakingAssetId,
    selectedAssetAccountId,
    stakingAssetAccountId,
  } = useRFOXContext()

  const stakingAssetIds = useMemo(() => {
    return supportedStakingAssetIds.concat(l1AssetId)
  }, [l1AssetId])

  const assets = useAppSelector(selectAssets)

  const stakingAssets = useMemo(() => {
    return stakingAssetIds.map(stakingAssetId => assets[stakingAssetId]).filter(isSome)
  }, [assets, stakingAssetIds])

  const stakingAssetId = useMemo(() => {
    if (selectedStakingAssetId === foxAssetId) return foxOnArbitrumOneAssetId
    return selectedStakingAssetId
  }, [selectedStakingAssetId])

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const { data: currentRuneAddress } = useStakingInfoQuery({
    accountId: stakingAssetAccountId,
    stakingAssetId,
    select: selectRuneAddress,
  })

  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const isBridgeRequired = selectedStakingAssetId === l1AssetId

  const isChainSupportedByWallet = useWalletSupportsChain(
    fromAssetId(selectedStakingAssetId).chainId,
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

  const selectedStakingAsset = useAppSelector(state =>
    selectAssetById(state, selectedStakingAssetId),
  )
  const selectedStakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, selectedStakingAssetId),
  )
  const selectedStakingAssetBalanceFilter = useMemo(
    () => ({
      accountId: selectedAssetAccountId ?? '',
      assetId: selectedStakingAssetId,
    }),
    [selectedAssetAccountId, selectedStakingAssetId],
  )
  const selectedStakingAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, selectedStakingAssetBalanceFilter),
  )
  const selectedStakingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(selectedStakingAssetId).chainId),
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
  const stakingAssetFeeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, stakingAssetFeeAssetBalanceFilter),
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
    () => toBaseUnit(amountCryptoPrecision, selectedStakingAsset?.precision ?? 0),
    [amountCryptoPrecision, selectedStakingAsset?.precision],
  )

  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const isValidStakingAmount = useMemo(
    () => bnOrZero(amountUserCurrency).plus(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision, amountUserCurrency],
  )

  useEffect(() => {
    // hydrate market data in case the user doesn't hold it
    stakingAssetIds.forEach(stakingAssetId => {
      dispatch(marketApi.endpoints.findByAssetId.initiate(stakingAssetId))
    })
  }, [dispatch, stakingAssetIds])

  useEffect(() => {
    // Only set this once, never collapse out
    if (collapseIn) return
    if (isValidStakingAmount) setCollapseIn(true)
  }, [collapseIn, isValidStakingAmount])

  const validateHasEnoughBalance = useCallback(
    (input: string) => {
      if (bnOrZero(input).lte(0)) return true

      const selectedStakingAssetFiatBalance = bnOrZero(selectedStakingAssetBalanceCryptoPrecision)
        .times(bnOrZero(selectedStakingAssetMarketData?.price))
        .toString()

      const hasEnoughBalance = bnOrZero(input).lte(
        bnOrZero(
          isFiat ? selectedStakingAssetFiatBalance : selectedStakingAssetBalanceCryptoPrecision,
        ),
      )

      return hasEnoughBalance
    },
    [isFiat, selectedStakingAssetBalanceCryptoPrecision, selectedStakingAssetMarketData],
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
    runeAddress: currentRuneAddress || runeAddress,
    stakingAssetId,
    stakingAssetAccountId,
    hasEnoughBalance,
    // Not required at this stage just yet, we're only estimating fees
    setStakeTxid: undefined,
    methods,
  })

  const { data: cooldownPeriodData } = useCooldownPeriodQuery(stakingAssetId)

  const handleRuneAddressChange = useCallback(
    (address: string | undefined) => {
      onRuneAddressChange(address)
    },
    [onRuneAddressChange],
  )

  const handleWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (
      !(
        selectedAssetAccountId &&
        stakingAssetAccountId &&
        (runeAddress || currentRuneAddress) &&
        selectedStakingAsset &&
        isValidStakingAmount
      )
    )
      return

    const _confirmedQuote = {
      stakingAssetAccountId,
      stakingAssetId,
      stakingAmountCryptoBaseUnit: toBaseUnit(
        amountCryptoPrecision,
        selectedStakingAsset.precision,
      ),
      // typescript is borked, one of them is defined because of the early return
      runeAddress: currentRuneAddress || runeAddress || '',
    }

    setConfirmedQuote(_confirmedQuote)

    if (isBridgeRequired) {
      const bridgeQuote: RfoxBridgeQuote = {
        sellAssetId: selectedStakingAssetId,
        buyAssetId: stakingAssetId,
        bridgeAmountCryptoBaseUnit: toBaseUnit(
          amountCryptoPrecision,
          selectedStakingAsset.precision,
        ),
        sellAssetAccountId: selectedAssetAccountId,
        buyAssetAccountId: stakingAssetAccountId,
      }
      return navigate(BridgeRoutePaths.Confirm, { state: bridgeQuote })
    }

    navigate(StakeRoutePaths.Confirm)
  }, [
    selectedAssetAccountId,
    stakingAssetAccountId,
    runeAddress,
    selectedStakingAsset,
    stakingAssetId,
    selectedStakingAssetId,
    isValidStakingAmount,
    amountCryptoPrecision,
    setConfirmedQuote,
    isBridgeRequired,
    navigate,
    currentRuneAddress,
  ])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleStakingAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onAssetClick: asset => setSelectedStakingAssetId(asset.assetId),
      title: 'common.selectAsset',
      assets: stakingAssets,
    })
  }, [stakingAssets, buyAssetSearch, setSelectedStakingAssetId])

  const handleAssetChange = useCallback(
    (asset: Asset) => setSelectedStakingAssetId(asset.assetId),
    [setSelectedStakingAssetId],
  )

  const assetSelectButtonProps = useMemo(() => {
    return {
      maxWidth: isSmallerThanMd ? '100%' : undefined,
    }
  }, [isSmallerThanMd])

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={selectedStakingAsset?.assetId}
        onAssetClick={handleStakingAssetClick}
        onAssetChange={handleAssetChange}
        assetIds={stakingAssetIds}
        onlyConnectedChains={true}
        buttonProps={assetSelectButtonProps}
        showChainDropdown={!isSmallerThanMd}
      />
    )
  }, [
    assetSelectButtonProps,
    handleAssetChange,
    handleStakingAssetClick,
    isSmallerThanMd,
    selectedStakingAsset?.assetId,
    stakingAssetIds,
  ])

  const validateHasEnoughStakingAssetFeeBalance = useCallback(
    (input: string) => {
      // Do NOT do ETH.ARB balance checks here if the user is going to bridge.
      // Fees will be on mainnet, and estimate on the next step
      if (isBridgeRequired) return true
      // Staking asset fee asset still loading, assume enough balance not to have a flash of error state on first render
      if (!stakingAssetFeeAsset) return true
      if (bnOrZero(input).isZero()) return true
      if (bnOrZero(stakingAssetFeeAssetBalanceCryptoPrecision).isZero()) return false

      const fees = approvalFees || stakeFees

      const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
        toBaseUnit(stakingAssetFeeAssetBalanceCryptoPrecision, stakingAssetFeeAsset.precision),
      )

      if (!hasEnoughFeeBalance) return false

      return true
    },
    [
      stakingAssetFeeAsset,
      stakingAssetFeeAssetBalanceCryptoPrecision,
      approvalFees,
      stakeFees,
      isBridgeRequired,
    ],
  )
  // Trigger re-validation since react-hook-form validation methods are fired onChange and not in a component-reactive manner
  useEffect(() => {
    trigger('amountFieldInput')
  }, [
    approvalFees,
    stakingAssetFeeAsset,
    stakingAssetFeeAssetBalanceCryptoPrecision,
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
        symbol: selectedStakingAsset?.symbol,
        cooldownPeriod: cooldownPeriodData?.cooldownPeriod,
      })

    return translate('RFOX.bridgeCta', {
      assetSymbol: selectedStakingAsset?.symbol,
      originNetwork: selectedStakingAssetFeeAsset?.networkName,
      destinationNetwork: stakingAssetFeeAsset?.networkName,
    })
  }, [
    cooldownPeriodData,
    isBridgeRequired,
    stakingAssetFeeAsset,
    selectedStakingAsset,
    selectedStakingAssetFeeAsset,
    translate,
  ])

  const marketData = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: selectedStakingAssetId }),
  )
  const assetUserCurrencyRate = marketData?.price ?? '0'

  // Consumed by onMaxClick
  const handleAmountChange = useCallback(
    (value: string, isFiat: boolean | undefined) => {
      const amountCryptoPrecision = isFiat
        ? bnOrZero(value).div(assetUserCurrencyRate).toFixed()
        : value
      const amountUserCurrency = !isFiat
        ? bnOrZero(value).times(assetUserCurrencyRate).toFixed()
        : value
      setValue('amountCryptoPrecision', amountCryptoPrecision, { shouldValidate: true })
      setValue('amountUserCurrency', amountUserCurrency, { shouldValidate: true })
    },
    [assetUserCurrencyRate, setValue],
  )

  const chainNotSupportedByWalletCopy = useMemo(() => {
    if (isChainSupportedByWallet) return
    return translate('RFOX.chainNotSupportedByWallet')
  }, [isChainSupportedByWallet, translate])

  const submitButtonText = useMemo(() => {
    if (isDiscoveringAccounts) return translate('common.accountsLoading')

    if (errors.manualRuneAddress?.type === 'required') return translate('RFOX.selectRuneAddress')

    return (
      errors.amountFieldInput?.message ||
      errors.manualRuneAddress?.message ||
      chainNotSupportedByWalletCopy ||
      translate('RFOX.stake')
    )
  }, [
    chainNotSupportedByWalletCopy,
    errors.amountFieldInput,
    errors.manualRuneAddress,
    translate,
    isDiscoveringAccounts,
  ])

  if (!selectedStakingAsset) return null

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
          <ChainNotSupported chainId={selectedStakingAsset?.chainId} />
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
            assetId={selectedStakingAsset?.assetId}
            accountId={selectedAssetAccountId}
            assetSymbol={selectedStakingAsset?.symbol ?? ''}
            assetIcon={selectedStakingAsset?.icon ?? ''}
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
          <FormDivider />
          <AddressSelection
            selectedAddress={runeAddress}
            onRuneAddressChange={handleRuneAddressChange}
            setStepIndex={setStepIndex}
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
                (!runeAddress && !currentRuneAddress) ||
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
              Boolean(
                errors.amountFieldInput ||
                  // Required rewards input isn't an error per se
                  (errors.manualRuneAddress && errors.manualRuneAddress.type !== 'required'),
              ) && !isDiscoveringAccounts
                ? 'red'
                : 'blue'
            }
          >
            {submitButtonText}
          </ButtonWalletPredicate>
        </CardFooter>
      </FormProvider>
    </SlideTransition>
  )
}
