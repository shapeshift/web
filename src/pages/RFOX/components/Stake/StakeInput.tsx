import { Button, CardFooter, Collapse, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  foxAssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
} from '@shapeshiftoss/caip'
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

// The staking Asset on L2, and its matching L1 asset to be used for bridging
// Ideally, we'd like to use related assets to get the original L1 implementation of the asset but
// 1. we don't have FOX on Arb as a related asset on any list just yet and most importantly
// 2. this assumes that the only possible flow is a token on L2 and its original implementation on L1
// Given the facts that this may not hold true, we may never have this flow generalized like so, and this adds complexity,
// this is hardcoded for the sake of simplicity
const assetIds: [AssetId, AssetId] = [foxOnArbitrumOneAssetId, foxAssetId]

export const StakeInput: React.FC<StakeInputProps & StakeRouteProps> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  headerComponent,
  onRuneAddressChange,
  runeAddress,
  setConfirmedQuote,
}) => {
  const [assetId, setAssetId] = useState<AssetId>(stakingAssetId)
  const isBridgeRequired = stakingAssetId !== assetId
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

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const stakingAsset = useAppSelector(state => selectAssetById(state, assetIds[0]))
  const l1Asset = useAppSelector(state => selectAssetById(state, assetIds[1]))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(assetId).chainId),
  )

  // TODO(gomes): make this programmatic when we implement multi-account
  const assetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, asset?.chainId ?? ''),
  )
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )
  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId,
      accountId: assetAccountId,
    }
  }, [assetAccountId, assetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset?.assetId ?? ''),
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
    // hydrate FOX market data in case the user doesn't hold it
    dispatch(marketApi.endpoints.findByAssetIds.initiate([assetId]))
  }, [dispatch, assetId])
  useEffect(() => {
    // Only set this once, never collapse out
    if (collapseIn) return
    if (isValidStakingAmount) setCollapseIn(true)
  }, [collapseIn, isValidStakingAmount])

  const stakingAssetBalanceFilter = useMemo(
    () => ({
      accountId: assetAccountId ?? '',
      assetId,
    }),
    [assetAccountId, assetId],
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
      args: [BigInt(toBaseUnit(amountCryptoPrecision, asset?.precision ?? 0)), runeAddress],
    })
  }, [amountCryptoPrecision, isValidStakingAmount, runeAddress, asset?.precision])

  const { data: allowanceDataCryptoBaseUnit, isSuccess: isAllowanceDataSuccess } = useAllowance({
    assetId: asset?.assetId,
    spender: RFOX_PROXY_CONTRACT_ADDRESS,
    from: assetAccountId ? fromAccountId(assetAccountId).account : undefined,
  })

  const allowanceCryptoPrecision = useMemo(() => {
    if (!allowanceDataCryptoBaseUnit) return
    if (!asset) return

    return fromBaseUnit(allowanceDataCryptoBaseUnit, asset?.precision)
  }, [allowanceDataCryptoBaseUnit, asset])

  const isApprovalRequired = useMemo(
    () => isAllowanceDataSuccess && bnOrZero(allowanceCryptoPrecision).lt(amountCryptoPrecision),
    [allowanceCryptoPrecision, amountCryptoPrecision, isAllowanceDataSuccess],
  )

  const isGetStakeFeesEnabled = useMemo(
    () =>
      Boolean(
        hasEnoughBalance &&
          assetAccountId &&
          stakingAssetAccountNumber !== undefined &&
          isValidStakingAmount &&
          wallet &&
          asset &&
          runeAddress &&
          callData &&
          isAllowanceDataSuccess &&
          !isApprovalRequired &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.amountFieldInput || errors.manualRuneAddress),
      ),
    [
      hasEnoughBalance,
      assetAccountId,
      stakingAssetAccountNumber,
      isValidStakingAmount,
      wallet,
      asset,
      runeAddress,
      callData,
      isAllowanceDataSuccess,
      isApprovalRequired,
      feeAsset,
      feeAssetMarketData,
      errors.amountFieldInput,
      errors.manualRuneAddress,
    ],
  )

  const {
    data: stakeFees,
    isLoading: isStakeFeesLoading,
    isSuccess: isStakeFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: assetAccountId ? fromAccountId(assetAccountId).account : '', // see isGetStakeFeesEnabled
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
        BigInt(toBaseUnit(amountCryptoPrecision, asset?.precision ?? 0)),
      ],
    })
  }, [amountCryptoPrecision, asset?.precision])

  const isGetApprovalFeesEnabled = useMemo(
    () =>
      Boolean(
        hasEnoughBalance &&
          assetAccountId &&
          isApprovalRequired &&
          assetAccountId &&
          wallet &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.amountFieldInput || errors.manualRuneAddress),
      ),
    [
      errors.amountFieldInput,
      errors.manualRuneAddress,
      feeAsset,
      feeAssetMarketData,
      hasEnoughBalance,
      isApprovalRequired,
      assetAccountId,
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
      from: assetAccountId ? fromAccountId(assetAccountId).account : '', // see isGetApprovalFeesEnabled
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
    if (!(assetAccountId && stakingAssetAccountId && runeAddress && isValidStakingAmount)) return

    const _confirmedQuote = {
      stakingAssetAccountId,
      stakingAssetId,
      stakingAmountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, asset?.precision ?? 0),
      runeAddress,
    }

    setConfirmedQuote(_confirmedQuote)

    if (isBridgeRequired) {
      const bridgeQuote: RfoxBridgeQuote = {
        sellAssetId: assetId,
        buyAssetId: stakingAssetId,
        bridgeAmountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, asset?.precision ?? 0),
        sellAssetAccountId: assetAccountId,
        buyAssetAccountId: stakingAssetAccountId,
      }
      return history.push({ pathname: BridgeRoutePaths.Confirm, state: bridgeQuote })
    }

    history.push(StakeRoutePaths.Confirm)
  }, [
    assetAccountId,
    runeAddress,
    isValidStakingAmount,
    stakingAssetId,
    amountCryptoPrecision,
    asset?.precision,
    setConfirmedQuote,
    isBridgeRequired,
    history,
    assetId,
    stakingAssetAccountId,
  ])

  const buyAssetSearch = useModal('buyAssetSearch')

  const handleStakingAssetClick = useCallback(() => {
    if (!(stakingAsset && l1Asset)) return

    buyAssetSearch.open({
      onAssetClick: asset => setAssetId(asset.assetId),
      title: 'common.selectAsset',
      assets: [stakingAsset, l1Asset],
    })
  }, [stakingAsset, l1Asset, buyAssetSearch])

  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        assetId={asset?.assetId}
        onAssetClick={handleStakingAssetClick}
        // eslint-disable-next-line react-memo/require-usememo
        onAssetChange={asset => setAssetId(asset.assetId)}
        // eslint-disable-next-line react-memo/require-usememo
        assetIds={assetIds}
        onlyConnectedChains={true}
      />
    )
  }, [handleStakingAssetClick, asset?.assetId])

  const feeAssetBalanceFilter = useMemo(
    () => ({
      accountId: assetAccountId ?? '',
      assetId: feeAsset?.assetId,
    }),
    [feeAsset?.assetId, assetAccountId],
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

  const warningAcknowledgementMessage = useMemo(() => {
    if (!isBridgeRequired)
      return translate('RFOX.stakeWarning', {
        cooldownPeriod,
      })

    // TODO(gomes) programmatic copy
    return `You selected FOX on ETH mainnet, but you'll need FOX on Arbitrum to stake. We can help you bridge your to Arbitrum. Would you like us to guide you through the process?`
  }, [cooldownPeriod, isBridgeRequired, translate])

  if (!asset) return null

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
              assetId={asset?.assetId}
              assetSymbol={asset?.symbol ?? ''}
              assetIcon={asset?.icon ?? ''}
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
              {assetAccountId && (
                <StakeSummary
                  stakingAssetId={assetId}
                  stakingAssetAccountId={assetAccountId}
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
