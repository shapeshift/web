import { Button, CardFooter, Collapse, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
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
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
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

import type { StakeValues } from '../AddressSelection'
import { AddressSelection } from '../AddressSelection'
import { StakeSummary } from './components/StakeSummary'
import type { RfoxStakingQuote } from './types'
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
  headerComponent,
  onRuneAddressChange,
  runeAddress,
  setConfirmedQuote,
}) => {
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const history = useHistory()

  const methods = useForm<StakeValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })

  const {
    formState: { errors },
    control,
    trigger,
  } = methods

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  // TODO(gomes): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )
  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: stakingAssetId,
      accountId: stakingAssetAccountId,
    }
  }, [stakingAssetAccountId, stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAsset?.assetId ?? ''),
  )
  const [showWarning, setShowWarning] = useState(false)
  const [collapseIn, setCollapseIn] = useState(false)
  const percentOptions = useMemo(() => [1], [])

  const amountCryptoPrecision = useWatch<StakeValues, 'amountCryptoPrecision'>({
    control,
    name: 'amountCryptoPrecision',
  })
  const amountUserCurrency = useWatch<StakeValues, 'amountUserCurrency'>({
    control,
    name: 'amountUserCurrency',
  })

  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const isValidStakingAmount = useMemo(
    () => bnOrZero(amountUserCurrency).plus(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision, amountUserCurrency],
  )

  useEffect(() => {
    // hydrate FOX market data in case the user doesn't hold it
    dispatch(marketApi.endpoints.findByAssetIds.initiate([stakingAssetId]))
  }, [dispatch, stakingAssetId])
  useEffect(() => {
    // Only set this once, never collapse out
    if (collapseIn) return
    if (isValidStakingAmount) setCollapseIn(true)
  }, [collapseIn, isValidStakingAmount])

  const stakingAssetBalanceFilter = useMemo(
    () => ({
      accountId: stakingAssetAccountId ?? '',
      assetId: stakingAssetId,
    }),
    [stakingAssetAccountId, stakingAssetId],
  )
  const stakingAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, stakingAssetBalanceFilter),
  )

  const stakingAssetFiatBalance = bnOrZero(stakingAssetBalanceCryptoPrecision)
    .times(stakingAssetMarketData.price)
    .toString()

  const validateHasEnoughBalance = useCallback(
    (input: string) => {
      if (bnOrZero(input).lte(0)) return true

      const hasEnoughBalance = bnOrZero(input).lte(
        bnOrZero(isFiat ? stakingAssetFiatBalance : stakingAssetBalanceCryptoPrecision),
      )

      return hasEnoughBalance
    },
    [isFiat, stakingAssetBalanceCryptoPrecision, stakingAssetFiatBalance],
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
    if (!(isValidStakingAmount && runeAddress)) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'stake',
      args: [BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0)), runeAddress],
    })
  }, [amountCryptoPrecision, isValidStakingAmount, runeAddress, stakingAsset?.precision])

  const { data: allowanceDataCryptoBaseUnit, isSuccess: isAllowanceDataSuccess } = useAllowance({
    assetId: stakingAsset?.assetId,
    spender: RFOX_PROXY_CONTRACT_ADDRESS,
    from: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined,
  })

  const allowanceCryptoPrecision = useMemo(() => {
    if (!allowanceDataCryptoBaseUnit) return
    if (!stakingAsset) return

    return fromBaseUnit(allowanceDataCryptoBaseUnit, stakingAsset?.precision)
  }, [allowanceDataCryptoBaseUnit, stakingAsset])

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
          stakingAsset &&
          runeAddress &&
          callData &&
          isAllowanceDataSuccess &&
          !isApprovalRequired &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.amountFieldInput),
      ),
    [
      hasEnoughBalance,
      stakingAssetAccountId,
      stakingAssetAccountNumber,
      isValidStakingAmount,
      wallet,
      stakingAsset,
      runeAddress,
      callData,
      isAllowanceDataSuccess,
      isApprovalRequired,
      feeAsset,
      feeAssetMarketData,
      errors.amountFieldInput,
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
      feeAsset: feeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetStakeFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const approvalCallData = useMemo(() => {
    return encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: [
        RFOX_PROXY_CONTRACT_ADDRESS,
        BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0)),
      ],
    })
  }, [amountCryptoPrecision, stakingAsset?.precision])

  const isGetApprovalFeesEnabled = useMemo(
    () =>
      Boolean(
        hasEnoughBalance &&
          stakingAssetAccountId &&
          isApprovalRequired &&
          stakingAssetAccountId &&
          wallet &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.amountFieldInput),
      ),
    [
      errors.amountFieldInput,
      feeAsset,
      feeAssetMarketData,
      hasEnoughBalance,
      isApprovalRequired,
      stakingAssetAccountId,
      wallet,
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
      feeAsset: feeAsset!, // see isGetApprovalFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetApprovalFeesEnabled
      to: fromAssetId(foxOnArbitrumOneAssetId).assetReference,
      from: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : '', // see isGetApprovalFeesEnabled
      data: approvalCallData,
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
    if (!(stakingAssetAccountId && runeAddress && isValidStakingAmount)) return

    setConfirmedQuote({
      stakingAssetAccountId,
      stakingAssetId,
      stakingAmountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0),

      runeAddress,
    })
    history.push(StakeRoutePaths.Confirm)
  }, [
    stakingAsset?.precision,
    amountCryptoPrecision,
    history,
    isValidStakingAmount,
    runeAddress,
    setConfirmedQuote,
    stakingAssetAccountId,
    stakingAssetId,
  ])

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect assetId={stakingAsset?.assetId} isReadOnly onlyConnectedChains={true} />
    )
  }, [stakingAsset?.assetId])

  const feeAssetBalanceFilter = useMemo(
    () => ({
      accountId: stakingAssetAccountId ?? '',
      assetId: feeAsset?.assetId,
    }),
    [feeAsset?.assetId, stakingAssetAccountId],
  )
  const feeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, feeAssetBalanceFilter),
  )

  const validateHasEnoughFeeBalance = useCallback(
    (input: string) => {
      if (bnOrZero(input).isZero()) return true
      if (bnOrZero(feeAssetBalanceCryptoPrecision).isZero()) return false

      const fees = approvalFees || stakeFees

      const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
        toBaseUnit(feeAssetBalanceCryptoPrecision, feeAsset?.precision ?? 0),
      )

      if (!hasEnoughFeeBalance) return false

      return true
    },
    [approvalFees, feeAsset?.precision, feeAssetBalanceCryptoPrecision, stakeFees],
  )
  // Trigger re-validation since react-hook-form validation methods are fired onChange and not in a component-reactive manner
  useEffect(() => {
    trigger('amountFieldInput')
  }, [
    approvalFees,
    feeAsset?.precision,
    feeAsset?.symbol,
    feeAssetBalanceCryptoPrecision,
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
          validateHasEnoughFeeBalance(input) ||
          translate('modals.send.errors.notEnoughNativeToken', { asset: feeAsset?.symbol }),
      },
    }
  }, [feeAsset?.symbol, translate, validateHasEnoughBalance, validateHasEnoughFeeBalance])

  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <WarningAcknowledgement
        message={translate('RFOX.stakeWarning', {
          cooldownPeriod,
        })}
        onAcknowledge={handleSubmit}
        shouldShowWarningAcknowledgement={showWarning}
        setShouldShowWarningAcknowledgement={setShowWarning}
      >
        <FormProvider {...methods}>
          <Stack>
            {headerComponent}
            <TradeAssetInput
              amountFieldInputRules={amountFieldInputRules}
              assetId={stakingAsset?.assetId}
              assetSymbol={stakingAsset?.symbol ?? ''}
              assetIcon={stakingAsset?.icon ?? ''}
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
                  stakingAssetId={stakingAsset.assetId}
                  stakingAssetAccountId={stakingAssetAccountId}
                  stakingAmountCryptoPrecision={amountCryptoPrecision}
                  stakingAssetAccountId={stakingAssetAccountId}
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
                      <Skeleton
                        isLoaded={Boolean(!isGetApprovalFeesLoading && approvalFees)}
                        height='14px'
                        width='50px'
                      >
                        <Amount.Fiat value={approvalFees?.txFeeFiat ?? 0} />
                      </Skeleton>
                    </Row.Value>
                  </Row>
                )}
                {isGetStakeFeesEnabled && (
                  <Row fontSize='sm' fontWeight='medium'>
                    <Row.Label>{translate('common.gasFee')}</Row.Label>
                    <Row.Value>
                      <Skeleton
                        isLoaded={Boolean(!isStakeFeesLoading && stakeFees)}
                        height='14px'
                        width='50px'
                      >
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
              colorScheme={Boolean(errors.amountFieldInput) ? 'red' : 'blue'}
            >
              {errors.amountFieldInput?.message || translate('RFOX.stake')}
            </Button>
          </CardFooter>
        </FormProvider>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
