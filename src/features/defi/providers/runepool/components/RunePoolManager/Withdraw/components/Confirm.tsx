import { Alert, AlertIcon, Box, Skeleton, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { RunePoolWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Confirm as ReusableConfirm } from '@/features/defi/components/Confirm/Confirm'
import { Summary } from '@/features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { BigNumber, bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { getWithdrawBps } from '@/lib/utils/thorchain'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFeeAssetById,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = state?.opportunity
  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )

  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(() => {
    const _accountId = accountId ?? highestBalanceAccountId
    if (!_accountId) return

    return {
      userStakingId: serializeUserStakingId(
        _accountId,
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference,
        }),
      ),
    }
  }, [accountId, assetNamespace, assetReference, chainId, highestBalanceAccountId])

  const opportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const userAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : ''),
    [accountId],
  )

  if (!asset) throw new Error(`Asset not found for AssetId ${opportunityData?.assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const {
    state: { wallet },
  } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const toast = useToast()

  const memo = useMemo(() => {
    if (!state || !opportunityData?.stakedAmountCryptoBaseUnit) return null

    const amountCryptoBaseUnit = BigAmount.fromPrecision({
      value: state?.withdraw.cryptoAmount,
      precision: asset.precision,
    }).toBaseUnit()
    const withdrawBps = getWithdrawBps({
      withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
      stakedAmountCryptoBaseUnit: opportunityData.stakedAmountCryptoBaseUnit,
      rewardsAmountCryptoBaseUnit: opportunityData?.rewardsCryptoBaseUnit?.amounts[0] ?? '0',
    })

    return `pool-:${withdrawBps}`
  }, [state, opportunityData, asset.precision])

  const { executeTransaction, estimatedFeesData } = useSendThorTx({
    accountId: accountId ?? null,
    assetId,
    // RUNEPool withdraws are dictated by the memo, not the amount
    amountCryptoBaseUnit: null,
    action: 'withdrawRunepool',
    memo,
    fromAddress: userAddress || null,
  })

  const estimatedGasCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData) return
    return BigAmount.fromBaseUnit({
      value: estimatedFeesData.txFeeCryptoBaseUnit,
      precision: feeAsset.precision,
    }).toPrecision()
  }, [estimatedFeesData, feeAsset.precision])

  useEffect(() => {
    if (!estimatedFeesData || !contextDispatch) return

    contextDispatch({
      type: RunePoolWithdrawActionType.SET_WITHDRAW,
      payload: {
        estimatedGasCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
        networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
      },
    })
  }, [contextDispatch, estimatedFeesData])

  const { isTradingActive, refetch: refetchIsTradingActive } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const handleConfirm = useCallback(async () => {
    if (!contextDispatch || !accountId || !assetId || !opportunityData) return
    try {
      if (!(userAddress && wallet && opportunity)) return

      contextDispatch({ type: RunePoolWithdrawActionType.SET_LOADING, payload: true })
      if (!state?.withdraw.cryptoAmount) return

      // Was the pool active when it was fetched at the time of the component mount
      // If it wasn't, it's definitely not going to become active again in the few seconds it takes to go from mount to sign click
      if (isTradingActive === false) {
        throw new Error(`THORChain pool halted for assetId: ${assetId}`)
      }

      // Refetch the trading active state JIT to ensure the pool didn't just become halted
      const _isTradingActive = await refetchIsTradingActive()
      if (_isTradingActive === false) {
        throw new Error(`THORChain pool halted for assetId: ${assetId}`)
      }

      const _txId = await executeTransaction()
      if (!_txId) throw new Error('No txId returned from onSignTx')

      contextDispatch({ type: RunePoolWithdrawActionType.SET_TXID, payload: _txId })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvent.WithdrawConfirm,
        {
          opportunity: opportunityData,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoPrecision: state.withdraw.cryptoAmount }],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      contextDispatch({ type: RunePoolWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    accountId,
    assetId,
    opportunityData,
    userAddress,
    wallet,
    opportunity,
    state?.withdraw.cryptoAmount,
    state?.withdraw.fiatAmount,
    isTradingActive,
    refetchIsTradingActive,
    executeTransaction,
    onNext,
    assets,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const missingBalanceForGasCryptoPrecision = useMemo(() => {
    return feeAssetBalance
      .minus(
        BigAmount.fromBaseUnit({
          value: bnOrZero(state?.withdraw.estimatedGasCryptoBaseUnit).toFixed(),
          precision: feeAsset.precision,
        }),
      )
      .negated()
      .toPrecision()
  }, [state?.withdraw.estimatedGasCryptoBaseUnit, feeAssetBalance, feeAsset.precision])

  const hasEnoughBalanceForGas = useMemo(
    () => bn(missingBalanceForGasCryptoPrecision).lte(0),
    [missingBalanceForGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const missingFundsForGasTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'modals.confirm.missingFundsForGas',
      {
        cryptoAmountHuman: bn(missingBalanceForGasCryptoPrecision).toFixed(6, BigNumber.ROUND_UP),
        assetSymbol: feeAsset.symbol,
      },
    ],
    [missingBalanceForGasCryptoPrecision, feeAsset.symbol],
  )

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      isDisabled={!hasEnoughBalanceForGas || !userAddress || isTradingActive === false}
      loading={state.loading || !userAddress}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('trade.tooltip.minerFee')}>
              <Text translation='trade.minerFee' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Skeleton isLoaded={!!estimatedFeesData}>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(estimatedGasCryptoPrecision)
                    .times(bnOrZero(feeMarketData?.price))
                    .toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={estimatedGasCryptoPrecision ?? '0'}
                  symbol={feeAsset.symbol}
                />
              </Skeleton>
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={missingFundsForGasTranslation} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
