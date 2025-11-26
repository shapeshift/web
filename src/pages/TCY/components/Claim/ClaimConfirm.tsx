import {
  Alert,
  AlertIcon,
  Box,
  FormControl,
  FormLabel,
  HStack,
  ModalCloseButton,
} from '@chakra-ui/react'
import { fromAssetId, tcyAssetId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useMutation } from '@tanstack/react-query'
import noop from 'lodash/noop'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import { ClaimAddressInput } from './components/ClaimAddressInput'
import type { Claim } from './types'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'
import { RawText, Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useIsChainHalted } from '@/lib/utils/thorchain/hooks/useIsChainHalted'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { isUtxoChainId } from '@/lib/utils/utxo'
import { useIsSweepNeededQuery } from '@/pages/Lending/hooks/useIsSweepNeededQuery'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import {
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  claim: Claim
  setClaimTxid: (txId: string) => void
}

type AddressFormValues = {
  manualRuneAddress: string
}

const boxProps = {
  width: 'full',
  p: 0,
  m: 0,
}

const buttonProps = {
  width: 'full',
  variant: 'solid',
  height: '40px',
  px: 4,
}

const inlineCopyFlexProps = {
  flex: 1,
}

const headerRightComponent = <ModalCloseButton />

export const ClaimConfirm = ({ claim, setClaimTxid }: ClaimConfirmProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    state: { isConnected },
  } = useWallet()
  const dispatch = useAppDispatch()
  const { isChainHalted, isFetching: isChainHaltedFetching } = useIsChainHalted(thorchainChainId)
  const [runeAddress, setRuneAddress] = useState<string>()
  const methods = useForm<AddressFormValues>()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, tcyAssetId),
  )

  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(claim.amountThorBaseUnit ?? '0', THOR_PRECISION),
    [claim?.amountThorBaseUnit],
  )

  const amountUserCurrency = useMemo(() => {
    return bn(amountCryptoPrecision)
      .times(bnOrZero(tcyMarketData?.price))
      .toFixed(2)
  }, [tcyMarketData?.price, amountCryptoPrecision])

  const {
    dustAmountCryptoBaseUnit,
    isEstimatedFeesDataLoading,
    estimatedFeesData,
    executeTransaction,
  } = useSendThorTx({
    accountId: claim.accountId,
    action: 'claimTcy',
    amountCryptoBaseUnit: '0',
    assetId: claim.assetId,
    fromAddress: claim.l1_address,
    memo: runeAddress ? `tcy:${runeAddress}` : '',
    enableEstimateFees: Boolean(runeAddress && claim.accountId),
  })

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: claim.assetId,
      address: claim.l1_address ?? '',
      amountCryptoBaseUnit: dustAmountCryptoBaseUnit,
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit,
      enabled: Boolean(
        isUtxoChainId(fromAssetId(claim.assetId).chainId) &&
          claim.l1_address &&
          estimatedFeesData &&
          runeAddress,
      ),
    }),
    [claim.assetId, claim.l1_address, estimatedFeesData, runeAddress, dustAmountCryptoBaseUnit],
  )

  const { data: isSweepNeeded, isFetching: isSweepNeededFeching } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const { mutateAsync: handleClaim, isPending: isClaimMutationPending } = useMutation({
    mutationFn: async () => {
      if (!runeAddress) return

      const txid = await executeTransaction()
      if (!txid) throw new Error('Failed to broadcast transaction')

      return txid
    },
    onSuccess: (txid: string | undefined) => {
      if (!txid) return

      setClaimTxid(txid)

      dispatch(
        actionSlice.actions.upsertAction({
          id: claim.l1_address,
          status: ActionStatus.Pending,
          type: ActionType.TcyClaim,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tcyClaimActionMetadata: {
            claim,
            txHash: txid,
          },
        }),
      )
      navigate(TCYClaimRoute.Status, { state: { selectedClaim: claim } })
    },
  })

  const handleConfirm = useCallback(async () => {
    if (isSweepNeeded) {
      return navigate(TCYClaimRoute.Sweep, { state: { selectedClaim: claim } })
    }
    await handleClaim()
  }, [handleClaim, isSweepNeeded, navigate, claim])

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, claim.assetId))

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId ?? '', accountId: claim.accountId }),
    [feeAsset?.assetId, claim.accountId],
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const dustAmountUserCurrency = useMemo(() => {
    if (!dustAmountCryptoBaseUnit) return
    if (!feeAsset) return

    const dustAmountCryptoPrecision = fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision)

    return bn(dustAmountCryptoPrecision)
      .times(bnOrZero(feeAssetMarketData?.price))
      .toString()
  }, [dustAmountCryptoBaseUnit, feeAssetMarketData?.price, feeAsset])

  const feeAssetBalanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, feeAssetBalanceFilter),
  )

  const requiredAmountCryptoBaseUnit = useMemo(
    () => bnOrZero(dustAmountCryptoBaseUnit).plus(estimatedFeesData?.txFeeCryptoBaseUnit ?? '0'),
    [dustAmountCryptoBaseUnit, estimatedFeesData?.txFeeCryptoBaseUnit],
  )

  const requiredAmountCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData?.txFeeCryptoBaseUnit || !dustAmountCryptoBaseUnit || !feeAsset)
      return '0'

    return fromBaseUnit(requiredAmountCryptoBaseUnit, feeAsset.precision)
  }, [estimatedFeesData, dustAmountCryptoBaseUnit, feeAsset, requiredAmountCryptoBaseUnit])

  const hasEnoughBalanceForDustAndFees = useMemo(() => {
    if (!estimatedFeesData?.txFeeCryptoBaseUnit || !dustAmountCryptoBaseUnit) return true

    return bnOrZero(feeAssetBalanceCryptoBaseUnit).gte(requiredAmountCryptoBaseUnit)
  }, [
    feeAssetBalanceCryptoBaseUnit,
    dustAmountCryptoBaseUnit,
    estimatedFeesData?.txFeeCryptoBaseUnit,
    requiredAmountCryptoBaseUnit,
  ])

  const isError = useMemo(() => {
    return estimatedFeesData && !hasEnoughBalanceForDustAndFees
  }, [hasEnoughBalanceForDustAndFees, estimatedFeesData])

  const confirmCopy = useMemo(() => {
    if (isChainHalted) return translate('common.chainHalted')
    if (isError) return translate('common.insufficientFunds')
    return translate('TCY.claimConfirm.confirmAndClaim')
  }, [isError, translate, isChainHalted])

  const confirmAlert = useMemo(() => {
    if (hasEnoughBalanceForDustAndFees) return null
    if (!feeAsset) return null

    return (
      <Alert status='error' variant='subtle' mt={2}>
        <AlertIcon />
        <RawText fontSize='sm'>
          {translate('TCY.claimConfirm.missingFundsForGasAlert', {
            symbol: feeAsset.symbol,
            amount: requiredAmountCryptoPrecision,
          })}
        </RawText>
      </Alert>
    )
  }, [feeAsset, hasEnoughBalanceForDustAndFees, requiredAmountCryptoPrecision, translate])

  const assetAccountHelper = useMemo(() => {
    if (!feeAsset) return null

    const label: [string, InterpolationOptions] = [
      'TCY.assetAddressInput.label',
      { symbol: feeAsset.symbol },
    ]

    return (
      <Box mb={6}>
        <FormControl>
          <HStack gap={4} mb={4} justifyContent='space-between'>
            <HelperTooltip label={translate('TCY.assetAddressInput.helperText')}>
              <FormLabel m={0} fontSize='sm'>
                <Text translation={label} />
              </FormLabel>
            </HelperTooltip>
          </HStack>
          <InlineCopyButton value={claim.l1_address} flexProps={inlineCopyFlexProps}>
            <AccountDropdown
              assetId={claim.assetId}
              onChange={noop}
              disabled
              boxProps={boxProps}
              buttonProps={buttonProps}
              defaultAccountId={claim.accountId}
            />
          </InlineCopyButton>
        </FormControl>
      </Box>
    )
  }, [claim.accountId, claim.assetId, claim.l1_address, translate, feeAsset])

  const amountFooterComponent = useMemo(() => {
    return (
      <Alert
        status='info'
        variant='subtle'
        bg='background.surface.raised.base'
        borderTopRadius={0}
        mt={-2}
        borderTopWidth={1}
        borderColor='border.subtle'
      >
        <AlertIcon boxSize='14px' />
        <RawText fontSize='sm'>
          {translate('TCY.claimConfirm.notice', { amount: amountCryptoPrecision })}
        </RawText>
      </Alert>
    )
  }, [amountCryptoPrecision, translate])
  if (!tcyAsset) return null

  return (
    <FormProvider {...methods}>
      <ReusableConfirm
        isDisabled={
          !isConnected ||
          !runeAddress ||
          isSweepNeededFeching ||
          !estimatedFeesData ||
          !hasEnoughBalanceForDustAndFees ||
          Boolean(isChainHalted)
        }
        isLoading={
          isClaimMutationPending ||
          isSweepNeededFeching ||
          isEstimatedFeesDataLoading ||
          isChainHaltedFetching
        }
        dustAmountUserCurrency={dustAmountUserCurrency}
        isError={isError}
        assetId={thorchainAssetId}
        feeAssetId={claim.assetId}
        headerText={translate('TCY.claimConfirm.confirmTitle')}
        cryptoAmount={amountCryptoPrecision}
        cryptoSymbol={tcyAsset.symbol}
        fiatAmount={amountUserCurrency}
        feeAmountFiat={estimatedFeesData?.txFeeFiat}
        confirmText={confirmCopy}
        onConfirm={handleConfirm}
        headerRightComponent={headerRightComponent}
        confirmAlert={confirmAlert}
        amountFooterComponent={amountFooterComponent}
      >
        {assetAccountHelper}
        <ClaimAddressInput
          onActiveAddressChange={setRuneAddress}
          address={runeAddress}
          matchingRuneAccountId={claim.matchingRuneAccountId}
        />
      </ReusableConfirm>
    </FormProvider>
  )
}
