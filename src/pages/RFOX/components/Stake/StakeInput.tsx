import { Button, CardFooter, Collapse, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { arbitrum } from 'viem/chains'
import { useContractRead } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { FormDivider } from 'components/FormDivider'
import { estimateFees } from 'components/Modals/Send/utils'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { WarningAcknowledgement } from 'components/WarningAcknowledgement/WarningAcknowledgement'
import { useToggle } from 'hooks/useToggle/useToggle'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { formatDuration } from 'lib/utils/time'
import type { EstimatedFeesQueryKey } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  // TODO(gomes): add amountUserCurrency and setValue on em
  amountCryptoPrecision: '',
  manualRuneAddress: '',
}

export const StakeInput: React.FC<StakeInputProps & StakeRouteProps> = ({
  // FOX on Arbitrum: eip155:42161/erc20:0xf929de51d91c77e42f5090069e0ad7a09e513c73
  // In the meantime, just added it manually there
  // Now here's the fun one, this isn't part of our generatedAssetData.json yet, durr

  stakingAssetId = foxOnArbitrumOneAssetId,
  headerComponent,
  onRuneAddressChange,
  runeAddress,
  setConfirmedQuote,
}) => {
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
    setValue,
  } = methods

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  // TODO(gomes): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )
  const assetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )

  const [showWarning, setShowWarning] = useState(false)
  const percentOptions = useMemo(() => [1], [])
  const amountCryptoPrecision = useWatch<StakeValues, 'amountCryptoPrecision'>({
    control,
    name: 'amountCryptoPrecision',
  })

  const [fiatAmount, setFiatAmount] = useState('')
  const [isFiat, handleToggleIsFiat] = useToggle(false)

  const isValidStakingAmount = useMemo(
    () => bnOrZero(fiatAmount).plus(amountCryptoPrecision).gt(0),
    [amountCryptoPrecision, fiatAmount],
  )

  const { data: cooldownPeriod } = useContractRead({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    staleTime: Infinity,
    select: data => formatDuration(Number(data)),
  })

  const callData = useMemo(() => {
    if (!(isValidStakingAmount && runeAddress)) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'stake',
      args: [BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0)), runeAddress],
    })
  }, [amountCryptoPrecision, isValidStakingAmount, runeAddress, stakingAsset?.precision])

  const estimateFeesInput = useMemo(
    () => ({
      // This is a contract call i.e 0 value
      amountCryptoPrecision: '0',
      assetId: stakingAsset?.assetId ?? '',
      feeAssetId: feeAsset?.assetId ?? '',
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      sendMax: false,
      memo: callData,
      accountId: stakingAssetAccountId ?? '',
      contractAddress: undefined,
    }),
    [stakingAsset?.assetId, callData, feeAsset?.assetId, stakingAssetAccountId],
  )

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

  const isEstimatedFeesEnabled = useMemo(
    () =>
      Boolean(
        isValidStakingAmount &&
          stakingAsset &&
          runeAddress &&
          isAllowanceDataSuccess &&
          !isApprovalRequired &&
          !Boolean(errors.amountCryptoPrecision),
      ),
    [
      isValidStakingAmount,
      stakingAsset,
      runeAddress,
      isAllowanceDataSuccess,
      isApprovalRequired,
      errors.amountCryptoPrecision,
    ],
  )

  // TODO(gomes): move this queryFn out of lending
  const estimatedFeesQueryKey: EstimatedFeesQueryKey = useMemo(
    () => [
      'estimateFees',
      {
        enabled: isEstimatedFeesEnabled,
        asset: stakingAsset,
        feeAsset,
        feeAssetMarketData,
        estimateFeesInput,
      },
    ],
    [stakingAsset, estimateFeesInput, feeAsset, feeAssetMarketData, isEstimatedFeesEnabled],
  )

  const {
    data: estimatedFees,
    isLoading: isEstimatedFeesLoading,
    isSuccess: isEstimatedFeesSuccess,
  } = useQuery({
    queryKey: estimatedFeesQueryKey,
    staleTime: 30_000,
    queryFn: async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
      const { estimateFeesInput, feeAsset, feeAssetMarketData } = queryKey[1]

      // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
      if (!feeAsset || !estimateFeesInput?.to || !estimateFeesInput.accountId) return

      const estimatedFees = await estimateFees(estimateFeesInput)
      const txFeeFiat = bn(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
        .times(feeAssetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },

    enabled: isEstimatedFeesEnabled,
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

  const estimateApprovalFeesInput = useMemo(
    () => ({
      // This is a contract call i.e 0 value
      amountCryptoPrecision: '0',
      assetId: stakingAssetId,
      feeAssetId: feeAsset?.assetId ?? '',
      to: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : '',
      sendMax: false,
      memo: approvalCallData,
      accountId: stakingAssetAccountId ?? '',
      contractAddress: undefined,
    }),
    [stakingAssetId, feeAsset?.assetId, stakingAssetAccountId, approvalCallData],
  )

  // TODO(gomes): move this queryFn out of lending
  // and actually make one specific for approval estimations for QoL
  const estimatedApprovalFeesQueryKey: EstimatedFeesQueryKey = useMemo(
    () => [
      'estimateFees',
      {
        enabled: Boolean(
          isApprovalRequired && stakingAssetAccountId && !Boolean(errors.amountCryptoPrecision),
        ),
        asset: stakingAsset,
        feeAsset,
        feeAssetMarketData,
        estimateFeesInput: estimateApprovalFeesInput,
      },
    ],
    [
      errors.amountCryptoPrecision,
      isApprovalRequired,
      stakingAssetAccountId,
      stakingAsset,
      feeAsset,
      feeAssetMarketData,
      estimateApprovalFeesInput,
    ],
  )

  const isEstimatedApprovalFeesEnabled = useMemo(
    () =>
      !Boolean(errors.amountCryptoPrecision) &&
      Boolean(isApprovalRequired && stakingAssetAccountId),
    [errors.amountCryptoPrecision, isApprovalRequired, stakingAssetAccountId],
  )

  const {
    data: estimatedApprovalFees,
    isLoading: isEstimatedApprovalFeesLoading,
    isSuccess: isEstimatedApprovalFeesSuccess,
  } = useQuery({
    queryKey: estimatedApprovalFeesQueryKey,
    staleTime: 30_000,
    queryFn: async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
      const { estimateFeesInput, feeAsset, feeAssetMarketData } = queryKey[1]

      // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
      if (!feeAsset || !estimateFeesInput?.to || !estimateFeesInput.accountId) return

      const estimatedFees = await estimateFees(estimateFeesInput)
      const txFeeFiat = bn(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
        .times(feeAssetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },
    enabled: isEstimatedApprovalFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const handleAccountIdChange = useCallback(() => {}, [])

  const handleChange = useCallback(
    (value: string, isFiat?: boolean) => {
      if (isFiat) {
        setFiatAmount(value)
        const _cryptoAmount = bnOrZero(value).div(assetMarketDataUserCurrency.price).toFixed()
        setValue('amountCryptoPrecision', _cryptoAmount)
      } else {
        setFiatAmount(bnOrZero(value).times(assetMarketDataUserCurrency.price).toFixed())
      }
    },
    [assetMarketDataUserCurrency.price, setValue],
  )

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
              onChange={handleChange}
              fiatAmount={fiatAmount}
            />
            <FormDivider />
            <AddressSelection onRuneAddressChange={handleRuneAddressChange} />
            <Collapse in={isValidStakingAmount}>
              {stakingAssetAccountId && (
                <StakeSummary
                  assetId={stakingAsset.assetId}
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
                {isEstimatedApprovalFeesEnabled && (
                  <Row fontSize='sm' fontWeight='medium'>
                    <Row.Label>{translate('common.approvalFee')}</Row.Label>
                    <Row.Value>
                      <Skeleton
                        isLoaded={Boolean(!isEstimatedApprovalFeesLoading && estimatedApprovalFees)}
                        height='14px'
                        width='50px'
                      >
                        <Amount.Fiat value={estimatedApprovalFees?.txFeeFiat ?? 0} />
                      </Skeleton>
                    </Row.Value>
                  </Row>
                )}
                {isEstimatedFeesEnabled && (
                  <Row fontSize='sm' fontWeight='medium'>
                    <Row.Label>{translate('common.gasFee')}</Row.Label>
                    <Row.Value>
                      <Skeleton
                        isLoaded={Boolean(!isEstimatedFeesLoading && estimatedFees)}
                        height='14px'
                        width='50px'
                      >
                        <Amount.Fiat value={estimatedFees?.txFeeFiat ?? 0} />
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
                Boolean(errors.amountCryptoPrecision) ||
                !runeAddress ||
                !isValidStakingAmount ||
                !(isEstimatedFeesSuccess || isEstimatedApprovalFeesSuccess) ||
                !cooldownPeriod
              }
              isLoading={isEstimatedApprovalFeesLoading || isEstimatedFeesLoading}
              colorScheme={Boolean(errors.amountCryptoPrecision) ? 'red' : 'blue'}
            >
              {errors.amountCryptoPrecision?.message || translate('RFOX.stake')}
            </Button>
          </CardFooter>
        </FormProvider>
      </WarningAcknowledgement>
    </SlideTransition>
  )
}
