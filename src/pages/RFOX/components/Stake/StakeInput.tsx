import { CardBody, CardFooter, Collapse, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
} from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import noop from 'lodash/noop'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { InfoAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { FormDivider } from 'components/FormDivider'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { selectRuneAddress } from 'pages/RFOX/helpers'
import { useCooldownPeriodQuery } from 'pages/RFOX/hooks/useCooldownPeriodQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectIsAccountMetadataLoading,
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import { ChainNotSupported } from '../Shared/ChainNotSupported'
import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import { StakeSummary } from './components/StakeSummary'
import { useRfoxStake } from './hooks/useRfoxStake'
import type { RfoxStakingQuote, StakeInputValues } from './types'
import { StakeRoutePaths, type StakeRouteProps } from './types'

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
  stakingAssetId = foxOnArbitrumOneAssetId,
  l1AssetId = foxAssetId,
  headerComponent,
  onRuneAddressChange,
  runeAddress,
  setConfirmedQuote,
  setStepIndex,
}) => {
  const assetIds = useMemo(() => [stakingAssetId, l1AssetId], [l1AssetId, stakingAssetId])
  const { selectedAssetId, setSelectedAssetId, selectedAssetAccountId, stakingAssetAccountId } =
    useRFOXContext()

  const { data: currentRuneAddress } = useStakingInfoQuery({
    stakingAssetAccountAddress: stakingAssetAccountId
      ? fromAccountId(stakingAssetAccountId).account
      : undefined,
    select: selectRuneAddress,
  })

  const isAccountMetadataLoading = useAppSelector(selectIsAccountMetadataLoading)
  const isBridgeRequired = stakingAssetId !== selectedAssetId
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const history = useHistory()
  const {
    state: { wallet },
  } = useWallet()
  const isChainSupportedByWallet = useWalletSupportsChain(
    fromAssetId(selectedAssetId).chainId,
    wallet,
  )

  const methods = useForm<StakeInputValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })

  const {
    formState: { errors },
    control,
    trigger,
    setValue,
  } = methods

  const selectedAsset = useAppSelector(state => selectAssetById(state, selectedAssetId))
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const l1Asset = useAppSelector(state => selectAssetById(state, l1AssetId))
  const selectedAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(selectedAssetId).chainId),
  )
  const stakingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  const selectedAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, selectedAsset?.assetId ?? ''),
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
    () => toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0),
    [amountCryptoPrecision, stakingAsset?.precision],
  )

  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const isValidStakingAmount = useMemo(
    () => bnOrZero(amountUserCurrency).plus(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision, amountUserCurrency],
  )

  useEffect(() => {
    // hydrate FOX.ARB market data in case the user doesn't hold it
    dispatch(marketApi.endpoints.findByAssetId.initiate(stakingAssetId))
  }, [dispatch, selectedAssetId, stakingAssetId])
  useEffect(() => {
    // Only set this once, never collapse out
    if (collapseIn) return
    if (isValidStakingAmount) setCollapseIn(true)
  }, [collapseIn, isValidStakingAmount])

  const selectedAssetBalanceFilter = useMemo(
    () => ({
      accountId: selectedAssetAccountId ?? '',
      assetId: selectedAssetId,
    }),
    [selectedAssetAccountId, selectedAssetId],
  )
  const selectedAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, selectedAssetBalanceFilter),
  )

  const selectedAssetFiatBalance = bnOrZero(selectedAssetBalanceCryptoPrecision)
    .times(selectedAssetMarketData.price)
    .toString()

  const validateHasEnoughBalance = useCallback(
    (input: string) => {
      if (bnOrZero(input).lte(0)) return true

      const hasEnoughBalance = bnOrZero(input).lte(
        bnOrZero(isFiat ? selectedAssetFiatBalance : selectedAssetBalanceCryptoPrecision),
      )

      return hasEnoughBalance
    },
    [isFiat, selectedAssetBalanceCryptoPrecision, selectedAssetFiatBalance],
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

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const { data: cooldownPeriod } = useCooldownPeriodQuery()

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
        selectedAsset &&
        stakingAsset &&
        isValidStakingAmount
      )
    )
      return

    const _confirmedQuote = {
      stakingAssetAccountId,
      stakingAssetId,
      stakingAmountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, stakingAsset.precision),
      // typescript is borked, one of them is defined because of the early return
      runeAddress: currentRuneAddress || runeAddress || '',
    }

    setConfirmedQuote(_confirmedQuote)

    if (isBridgeRequired) {
      const bridgeQuote: RfoxBridgeQuote = {
        sellAssetId: selectedAssetId,
        buyAssetId: stakingAssetId,
        bridgeAmountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, selectedAsset.precision ?? 0),
        sellAssetAccountId: selectedAssetAccountId,
        buyAssetAccountId: stakingAssetAccountId,
      }
      return history.push({ pathname: BridgeRoutePaths.Confirm, state: bridgeQuote })
    }

    history.push(StakeRoutePaths.Confirm)
  }, [
    selectedAssetAccountId,
    stakingAssetAccountId,
    runeAddress,
    selectedAsset,
    stakingAsset,
    isValidStakingAmount,
    stakingAssetId,
    amountCryptoPrecision,
    setConfirmedQuote,
    isBridgeRequired,
    history,
    selectedAssetId,
    currentRuneAddress,
  ])
  const buyAssetSearch = useModal('buyAssetSearch')

  const handleStakingAssetClick = useCallback(() => {
    if (!(stakingAsset && l1Asset)) return

    buyAssetSearch.open({
      onAssetClick: asset => setSelectedAssetId(asset.assetId),
      title: 'common.selectAsset',
      assets: [stakingAsset, l1Asset],
    })
  }, [stakingAsset, l1Asset, buyAssetSearch, setSelectedAssetId])

  const handleAssetChange = useCallback(
    (asset: Asset) => setSelectedAssetId(asset.assetId),
    [setSelectedAssetId],
  )

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={selectedAsset?.assetId}
        onAssetClick={handleStakingAssetClick}
        onAssetChange={handleAssetChange}
        assetIds={assetIds}
        onlyConnectedChains={true}
      />
    )
  }, [selectedAsset?.assetId, handleStakingAssetClick, handleAssetChange, assetIds])

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

  const validateHasEnoughStakingAssetFeeBalance = useCallback(
    (input: string) => {
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
    [stakingAssetFeeAsset, stakingAssetFeeAssetBalanceCryptoPrecision, approvalFees, stakeFees],
  )
  // Trigger re-validation since react-hook-form validation methods are fired onChange and not in a component-reactive manner
  useEffect(() => {
    trigger('amountFieldInput')
  }, [
    approvalFees,
    selectedAssetFeeAsset?.precision,
    selectedAssetFeeAsset?.symbol,
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
    stakingAssetFeeAsset?.chainId,
    stakingAssetFeeAsset?.symbol,
    translate,
    validateHasEnoughBalance,
    validateHasEnoughStakingAssetFeeBalance,
  ])

  const warningAcknowledgementMessage = useMemo(() => {
    if (!isBridgeRequired)
      return translate('RFOX.stakeWarning', {
        cooldownPeriod,
      })

    return translate('RFOX.bridgeCta', {
      assetSymbol: selectedAsset?.symbol,
      originNetwork: selectedAssetFeeAsset?.networkName,
      destinationNetwork: stakingAssetFeeAsset?.networkName,
    })
  }, [
    selectedAsset?.symbol,
    cooldownPeriod,
    selectedAssetFeeAsset?.networkName,
    isBridgeRequired,
    stakingAssetFeeAsset?.networkName,
    translate,
  ])

  const { price: assetUserCurrencyRate } = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: stakingAssetId }),
  )

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
    if (isAccountMetadataLoading) return translate('common.accountsLoading')

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
    isAccountMetadataLoading,
  ])

  if (!selectedAsset) return null

  if (!stakingAssetAccountAddress && !isAccountMetadataLoading)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ChainNotSupported chainId={stakingAsset?.chainId} />
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
      >
        <FormProvider {...methods}>
          <Stack>
            {headerComponent}
            <TradeAssetInput
              amountFieldInputRules={amountFieldInputRules}
              assetId={selectedAsset?.assetId}
              accountId={selectedAssetAccountId}
              assetSymbol={selectedAsset?.symbol ?? ''}
              assetIcon={selectedAsset?.icon ?? ''}
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
              isValidWallet={Boolean(isChainSupportedByWallet || isAccountMetadataLoading)}
              isDisabled={Boolean(
                errors.amountFieldInput ||
                  (!runeAddress && !currentRuneAddress) ||
                  !isValidStakingAmount ||
                  !(isStakeFeesSuccess || isGetApprovalFeesSuccess) ||
                  isAccountMetadataLoading ||
                  !cooldownPeriod,
              )}
              size='lg'
              mx={-2}
              onClick={handleWarning}
              isLoading={isGetApprovalFeesLoading || isStakeFeesLoading}
              colorScheme={
                Boolean(errors.amountFieldInput || errors.manualRuneAddress) &&
                !isAccountMetadataLoading
                  ? 'red'
                  : 'blue'
              }
            >
              {submitButtonText}
            </ButtonWalletPredicate>
          </CardFooter>
        </FormProvider>
      </InfoAcknowledgement>
    </SlideTransition>
  )
}
