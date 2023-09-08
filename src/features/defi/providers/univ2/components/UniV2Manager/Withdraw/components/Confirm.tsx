import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UniV2WithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm = ({ accountId, onNext }: ConfirmProps) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const lpAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const lpOpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const lpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, lpOpportunityFilter),
  )

  const translate = useTranslate()

  const assetId0 = lpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = lpOpportunity?.underlyingAssetIds[1] ?? ''
  const { removeLiquidity } = useUniV2LiquidityPool({
    accountId: accountId ?? '',
    lpAssetId,
    assetId0,
    assetId1,
  })

  const feeAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const ethMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))
  const asset1 = useAppSelector(state => {
    return selectAssetById(state, assetId1)
  })
  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))
  const assets = useAppSelector(selectAssets)

  if (!feeAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${lpAssetId}`)

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: ethAssetId, accountId: accountId ?? '' }),
    [accountId],
  )
  const feeAssetBalanceCryptoHuman = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalanceCryptoHuman)
        .minus(bnOrZero(state?.withdraw.estimatedGasCryptoPrecision))
        .gte(0),
    [feeAssetBalanceCryptoHuman, state?.withdraw.estimatedGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const handleConfirm = useCallback(async () => {
    if (
      !(
        dispatch &&
        state?.withdraw &&
        walletState.wallet &&
        supportsETH(walletState.wallet) &&
        lpOpportunity
      )
    )
      return
    try {
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: true })

      const txid = await removeLiquidity({
        lpAmount: state.withdraw.lpAmount,
        asset0Amount: state.withdraw.asset0Amount,
        asset1Amount: state.withdraw.asset1Amount,
      })
      if (!txid) throw new Error(`Transaction failed`)
      dispatch({ type: UniV2WithdrawActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.WithdrawConfirm,
        {
          opportunity: lpOpportunity,
          fiatAmounts: [state.withdraw.lpFiatAmount],
          cryptoAmounts: [
            { assetId: lpAsset.assetId, amountCryptoHuman: state.withdraw.lpAmount },
            { assetId: assetId0, amountCryptoHuman: state.withdraw.asset0Amount },
            { assetId: assetId1, amountCryptoHuman: state.withdraw.asset1Amount },
          ],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
    } finally {
      dispatch({ type: UniV2WithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    state?.withdraw,
    walletState.wallet,
    lpOpportunity,
    removeLiquidity,
    onNext,
    lpAsset.assetId,
    assetId1,
    assetId0,
    assets,
  ])

  if (!state || !dispatch || !lpOpportunity) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
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
              <PairIcons
                icons={lpOpportunity.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{lpAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={lpAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='common.receive' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset0.icon} />
              <RawText>{asset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.asset0Amount} symbol={asset0.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset1.icon} />
              <RawText>{asset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.asset1Amount} symbol={asset1.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row p={4}>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCryptoPrecision)
                  .times(ethMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.estimatedGasCryptoPrecision).toFixed(5)}
                symbol={asset0.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
