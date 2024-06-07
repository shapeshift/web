import { Button, CardFooter, Collapse, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
} from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { FormDivider } from 'components/FormDivider'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { formatSecondsToDuration } from 'lib/utils/time'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import type { RfoxBridgeQuote } from './Bridge/types'
import { BridgeRoutePaths } from './Bridge/types'
import { StakeSummary } from './components/StakeSummary'
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
}) => {
  const assetIds = useMemo(() => [stakingAssetId, l1AssetId], [l1AssetId, stakingAssetId])
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(stakingAssetId)
  const isBridgeRequired = stakingAssetId !== selectedAssetId
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const history = useHistory()

  const methods = useForm<StakeInputValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })

  const {
    formState: { errors },
    control,
    trigger,
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

  // TODO(gomes): make this programmatic when we implement multi-account
  const selectedAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, selectedAsset?.chainId ?? ''),
  )
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )
  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: stakingAssetId,
      accountId: stakingAssetAccountId,
    }
  }, [stakingAssetId, stakingAssetAccountId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const stakingAssetFeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetFeeAsset?.assetId ?? ''),
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

  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const isValidStakingAmount = useMemo(
    () => bnOrZero(amountUserCurrency).plus(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision, amountUserCurrency],
  )

  useEffect(() => {
    // hydrate FOX.ARB market data in case the user doesn't hold it
    dispatch(marketApi.endpoints.findByAssetIds.initiate([stakingAssetId]))
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

  const { data: cooldownPeriod } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatSecondsToDuration(Number(data)),
    },
  })

  const callData = useMemo(() => {
    if (!(isValidStakingAmount && runeAddress && stakingAsset)) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'stake',
      args: [BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset.precision)), runeAddress],
    })
  }, [amountCryptoPrecision, isValidStakingAmount, runeAddress, stakingAsset])

  const { data: allowanceDataCryptoBaseUnit, isSuccess: isAllowanceDataSuccess } = useAllowance({
    assetId: stakingAsset?.assetId,
    spender: RFOX_PROXY_CONTRACT_ADDRESS,
    from: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined,
  })

  const allowanceCryptoPrecision = useMemo(() => {
    if (!allowanceDataCryptoBaseUnit) return
    if (!stakingAssetFeeAsset) return

    return fromBaseUnit(allowanceDataCryptoBaseUnit, stakingAssetFeeAsset.precision)
  }, [allowanceDataCryptoBaseUnit, stakingAssetFeeAsset])

  const isApprovalRequired = useMemo(
    () => isAllowanceDataSuccess && bnOrZero(allowanceCryptoPrecision).lt(amountCryptoPrecision),
    [allowanceCryptoPrecision, amountCryptoPrecision, isAllowanceDataSuccess],
  )

  const isGetStakeFeesEnabled = useMemo(
    () =>
      Boolean(
        hasEnoughBalance &&
          stakingAssetAccountId &&
          stakingAssetAccountNumber !== undefined &&
          isValidStakingAmount &&
          wallet &&
          runeAddress &&
          callData &&
          stakingAssetFeeAsset &&
          stakingAssetFeAssetMarketData &&
          !Boolean(errors.amountFieldInput || errors.manualRuneAddress) &&
          isAllowanceDataSuccess &&
          !isApprovalRequired,
      ),
    [
      hasEnoughBalance,
      stakingAssetAccountId,
      stakingAssetAccountNumber,
      isValidStakingAmount,
      wallet,
      runeAddress,
      callData,
      stakingAssetFeeAsset,
      stakingAssetFeAssetMarketData,
      errors.amountFieldInput,
      errors.manualRuneAddress,
      isAllowanceDataSuccess,
      isApprovalRequired,
    ],
  )

  const {
    data: stakeFees,
    isLoading: isStakeFeesLoading,
    isSuccess: isStakeFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : '', // see isGetStakeFeesEnabled
      accountNumber: stakingAssetAccountNumber!, // see isGetStakeFeesEnabled
      data: callData!, // see isGetStakeFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetStakeFeesEnabled
      feeAsset: stakingAssetFeeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: stakingAssetFeAssetMarketData!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetStakeFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const approvalCallData = useMemo(() => {
    if (!stakingAsset) return

    return encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: [
        RFOX_PROXY_CONTRACT_ADDRESS,
        BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset.precision)),
      ],
    })
  }, [amountCryptoPrecision, stakingAsset])

  const isGetApprovalFeesEnabled = useMemo(
    () =>
      Boolean(
        approvalCallData &&
          hasEnoughBalance &&
          stakingAssetAccountId &&
          isApprovalRequired &&
          stakingAssetAccountId &&
          wallet &&
          stakingAssetFeeAsset &&
          stakingAssetFeAssetMarketData &&
          !Boolean(errors.manualRuneAddress),
      ),
    [
      approvalCallData,
      hasEnoughBalance,
      stakingAssetAccountId,
      isApprovalRequired,
      wallet,
      stakingAssetFeeAsset,
      stakingAssetFeAssetMarketData,
      errors.manualRuneAddress,
    ],
  )

  const {
    data: approvalFees,
    isLoading: isGetApprovalFeesLoading,
    isSuccess: isGetApprovalFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      value: '0',
      accountNumber: stakingAssetAccountNumber!, // see isGetApprovalFeesEnabled
      feeAsset: stakingAssetFeeAsset!, // see isGetApprovalFeesEnabled
      feeAssetMarketData: stakingAssetFeAssetMarketData!, // see isGetApprovalFeesEnabled
      to: fromAssetId(foxOnArbitrumOneAssetId).assetReference,
      from: selectedAssetAccountId ? fromAccountId(selectedAssetAccountId).account : '', // see isGetApprovalFeesEnabled
      data: approvalCallData!, // see isGetApprovalFeesEnabled
      wallet: wallet!, // see isGetApprovalFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetApprovalFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  // TODO(gomes): implement me when we have multi-account here
  const handleAccountIdChange = useCallback(() => {}, [])

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
        runeAddress &&
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
      runeAddress,
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
  ])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleStakingAssetClick = useCallback(() => {
    if (!(stakingAsset && l1Asset)) return

    buyAssetSearch.open({
      onAssetClick: asset => setSelectedAssetId(asset.assetId),
      title: 'common.selectAsset',
      assets: [stakingAsset, l1Asset],
    })
  }, [stakingAsset, l1Asset, buyAssetSearch])

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={selectedAsset?.assetId}
        onAssetClick={handleStakingAssetClick}
        // eslint-disable-next-line react-memo/require-usememo
        onAssetChange={asset => setSelectedAssetId(asset.assetId)}
        // eslint-disable-next-line react-memo/require-usememo
        assetIds={assetIds}
        onlyConnectedChains={true}
      />
    )
  }, [selectedAsset?.assetId, handleStakingAssetClick, assetIds])

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

  if (!selectedAsset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={warningAcknowledgementMessage}
        onAcknowledge={handleSubmit}
        shouldShowWarningAcknowledgement={showWarning}
        setShouldShowWarningAcknowledgement={setShowWarning}
      >
        <FormProvider {...methods}>
          <Stack>
            {headerComponent}
            <TradeAssetInput
              amountFieldInputRules={amountFieldInputRules}
              assetId={selectedAsset?.assetId}
              assetSymbol={selectedAsset?.symbol ?? ''}
              assetIcon={selectedAsset?.icon ?? ''}
              percentOptions={percentOptions}
              onAccountIdChange={handleAccountIdChange}
              // TODO: remove me when implementing multi-account
              isAccountSelectionDisabled={true}
              onToggleIsFiat={handleToggleIsFiat}
              isFiat={isFiat}
              formControlProps={formControlProps}
              layout='inline'
              label={translate('transactionRow.amount')}
              labelPostFix={assetSelectComponent}
              isSendMaxDisabled={false}
              cryptoAmount={amountCryptoPrecision}
              fiatAmount={amountUserCurrency}
            />
            <FormDivider />
            <AddressSelection onRuneAddressChange={handleRuneAddressChange} />
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
            <Button
              size='lg'
              mx={-2}
              onClick={handleWarning}
              isDisabled={
                Boolean(errors.amountFieldInput) ||
                !runeAddress ||
                !isValidStakingAmount ||
                !(isStakeFeesSuccess || isGetApprovalFeesSuccess) ||
                !cooldownPeriod
              }
              isLoading={isGetApprovalFeesLoading || isStakeFeesLoading}
              colorScheme={
                Boolean(errors.amountFieldInput || errors.manualRuneAddress) ? 'red' : 'blue'
              }
            >
              {errors.amountFieldInput?.message ||
                errors.manualRuneAddress?.message ||
                translate('RFOX.stake')}
            </Button>
          </CardFooter>
        </FormProvider>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
