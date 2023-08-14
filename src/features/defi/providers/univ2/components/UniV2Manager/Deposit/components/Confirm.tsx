import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, ethAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useContext, useEffect, useMemo } from 'react'
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

import { UniV2DepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const lpAssetId = toAssetId({ chainId, assetNamespace, assetReference })

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

  const assetId0 = lpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = lpOpportunity?.underlyingAssetIds[1] ?? ''

  const { addLiquidity } = useUniV2LiquidityPool({
    accountId: accountId ?? '',
    assetId0,
    assetId1,
    lpAssetId,
  })

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))
  const assets = useAppSelector(selectAssets)

  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalanceCryptoHuman = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const ethAmount: string = (() => {
    // This should never happen, but just in case
    if (!state) return '0'
    // If any of the assets are ETH, return the amount of ETH needed
    // Else return 0 (no ETH needed)
    if (assetId0 === ethAssetId) return state.deposit.asset0CryptoAmount
    if (assetId1 === ethAssetId) return state.deposit.asset1CryptoAmount

    return '0'
  })()
  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalanceCryptoHuman)
    .minus(bnOrZero(state?.deposit.estimatedGasCryptoPrecision))
    .minus(ethAmount)
    .gte(0)

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!state || !dispatch) return null

  const handleDeposit = async () => {
    try {
      if (
        !(assetReference && walletState.wallet && supportsETH(walletState.wallet) && lpOpportunity)
      )
        return

      dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: true })
      const txid = await addLiquidity({
        token0Amount: state.deposit.asset0CryptoAmount,
        token1Amount: state.deposit.asset1CryptoAmount,
      })
      if (!txid) throw new Error('addLiquidity failed')
      dispatch({ type: UniV2DepositActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.DepositConfirm,
        {
          opportunity: lpOpportunity,
          fiatAmounts: [state.deposit.asset0FiatAmount, state.deposit.asset1FiatAmount],
          cryptoAmounts: [
            { assetId: assetId0, amountCryptoHuman: state.deposit.asset0CryptoAmount },
            { assetId: assetId1, amountCryptoHuman: state.deposit.asset1CryptoAmount },
          ],
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
      dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    onNext(DefiStep.Info)
  }

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
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
              <AssetIcon size='xs' src={asset0.icon} />
              <RawText>{asset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.asset0CryptoAmount} symbol={asset0.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset1.icon} />
              <RawText>{asset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.asset1CryptoAmount} symbol={asset1.symbol} />
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
                value={bnOrZero(state.deposit.estimatedGasCryptoPrecision)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.deposit.estimatedGasCryptoPrecision).toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
