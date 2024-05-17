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
import { formatDuration } from 'lib/utils/time'
import {
  selectAccountNumberByAccountId,
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
  amountFieldInput: '',
  amountCryptoPrecision: '',
  amountUserCurrency: '',
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
  const wallet = useWallet().state.wallet
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
  const [showWarning, setShowWarning] = useState(false)
  const percentOptions = useMemo(() => [1], [])

  // TODO(gomes): wrong. This can be crypto or fiat.

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

  const { data: cooldownPeriod } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatDuration(Number(data)),
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

  const handleAccountIdChange = useCallback(() => {}, [])

  const handleChange = useCallback((value: string, isFiat?: boolean) => {
    // TODO(gomes): probably remove me
    // But before we do, make sure we implement gas fees estimation, perhaps as a separate validation method in TradeAmountInput
    // or maybe just here
    // But either way, validation methods will need to be passed as this won't work for unstaking - staking balance isn't in EOA, it is delegated, hence doing basic balance checks
    // there wouldn't work, which is why we want to always pass validation methods in
  }, [])

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
              fiatAmount={amountUserCurrency}
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
