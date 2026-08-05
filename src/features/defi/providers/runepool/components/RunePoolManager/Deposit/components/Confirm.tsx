import { Alert, AlertIcon, Box, Skeleton, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { RunePoolDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

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
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { RUNEPOOL_DEPOSIT_MEMO } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = useMemo(() => state?.opportunity, [state])
  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset.assetId),
  )

  const {
    state: { wallet },
  } = useWallet()

  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset.assetId, accountId }),
    [accountId, feeAsset.assetId],
  )

  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoBalanceByFilter(s, feeAssetBalanceFilter),
  )

  // RUNE is not a UTXO asset - the account address *is* the from address
  const fromAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : undefined),
    [accountId],
  )

  const { isEstimatedFeesDataLoading, estimatedFeesData } = useSendThorTx({
    accountId: accountId ?? null,
    assetId,
    amountCryptoBaseUnit: BigAmount.fromPrecision({
      value: state?.deposit.cryptoAmount,
      precision: asset.precision,
    }).toBaseUnit(),
    action: 'depositRunepool',
    memo: RUNEPOOL_DEPOSIT_MEMO,
    fromAddress: fromAddress ?? null,
  })

  const { amountMinusFeesCryptoBaseUnit, amountMinusFeesCryptoPrecision } = useMemo(() => {
    const depositAmount = BigAmount.fromPrecision({
      value: state?.deposit.cryptoAmount,
      precision: asset.precision,
    })

    if (!estimatedFeesData)
      return {
        amountMinusFeesCryptoBaseUnit: undefined,
        amountMinusFeesCryptoPrecision: undefined,
      }

    // RUNE is its own fee asset, so a max deposit needs fees deducted from the sent amount
    if (state?.deposit.sendMax) {
      const amountMinusFees = depositAmount.minus(
        BigAmount.fromBaseUnit({
          value: estimatedFeesData.txFeeCryptoBaseUnit,
          precision: asset.precision,
        }),
      )
      return {
        amountMinusFeesCryptoBaseUnit: amountMinusFees,
        amountMinusFeesCryptoPrecision: amountMinusFees.toPrecision(),
      }
    }

    return {
      amountMinusFeesCryptoBaseUnit: depositAmount,
      amountMinusFeesCryptoPrecision: state?.deposit.cryptoAmount,
    }
  }, [state?.deposit.cryptoAmount, state?.deposit.sendMax, asset.precision, estimatedFeesData])

  const { executeTransaction } = useSendThorTx({
    accountId: accountId ?? null,
    assetId,
    amountCryptoBaseUnit: amountMinusFeesCryptoBaseUnit?.toBaseUnit() ?? null,
    action: 'depositRunepool',
    memo: RUNEPOOL_DEPOSIT_MEMO,
    fromAddress: fromAddress ?? null,
    enableEstimateFees: Boolean(!state?.deposit.sendMax),
  })

  const estimatedGasCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData) return
    return BigAmount.fromBaseUnit({
      value: estimatedFeesData.txFeeCryptoBaseUnit,
      precision: feeAsset.precision,
    }).toPrecision()
  }, [estimatedFeesData, feeAsset.precision])

  useEffect(() => {
    if (!contextDispatch) return
    if (!estimatedFeesData) return
    if (!estimatedGasCryptoPrecision) return

    contextDispatch({
      type: RunePoolDepositActionType.SET_DEPOSIT,
      payload: {
        estimatedGasCryptoPrecision,
        networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
      },
    })
  }, [contextDispatch, estimatedFeesData, estimatedGasCryptoPrecision])

  const { isTradingActive, refetch: refetchIsTradingActive } = useIsTradingActive({
    assetId,
    swapperName: SwapperName.Thorchain,
  })

  const handleDeposit = useCallback(async () => {
    if (!contextDispatch || !accountId || !assetId) return
    try {
      if (!(fromAddress && wallet && opportunity)) return

      if (!state?.deposit.cryptoAmount) {
        throw new Error('Cannot send 0-value RUNEPool Tx')
      }

      contextDispatch({ type: RunePoolDepositActionType.SET_LOADING, payload: true })

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
      if (!_txId) throw new Error('failed to broadcast transaction')

      contextDispatch({ type: RunePoolDepositActionType.SET_TXID, payload: _txId })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvent.DepositConfirm,
        {
          opportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoPrecision: state.deposit.cryptoAmount }],
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
      contextDispatch({ type: RunePoolDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    accountId,
    assetId,
    fromAddress,
    wallet,
    opportunity,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
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

  const hasEnoughBalanceForGas = useMemo(
    () =>
      feeAssetBalance
        .minus(
          BigAmount.fromPrecision({
            value: state?.deposit.estimatedGasCryptoPrecision ?? 0,
            precision: feeAsset.precision,
          }),
        )
        .gte(0),
    [feeAssetBalance, state?.deposit.estimatedGasCryptoPrecision, feeAsset],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const notEnoughGasTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [feeAsset.symbol],
  )

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      isDisabled={!hasEnoughBalanceForGas || !fromAddress || isTradingActive === false}
      loading={state.loading || !amountMinusFeesCryptoBaseUnit || !fromAddress}
      loadingText={translate('common.confirm')}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Skeleton isLoaded={!!amountMinusFeesCryptoPrecision}>
                <Amount.Crypto value={amountMinusFeesCryptoPrecision} symbol={asset.symbol} />
              </Skeleton>
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
            <Skeleton isLoaded={!isEstimatedFeesDataLoading}>
              <Box textAlign='right'>
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
              </Box>
            </Skeleton>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
