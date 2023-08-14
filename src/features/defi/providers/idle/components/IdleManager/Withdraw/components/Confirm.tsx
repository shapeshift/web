import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { IdleOpportunity } from 'lib/investor/investor-idle'
import { toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { getIdleInvestor } from 'state/slices/opportunitiesSlice/resolvers/idle/idleInvestorSingleton'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const [idleOpportunity, setIdleOpportunity] = useState<IdleOpportunity>()
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const opportunity = state?.opportunity
  const chainAdapter = getChainAdapterManager().get(chainId)
  const assets = useAppSelector(selectAssets)

  // Asset info
  const feeAssetId = chainAdapter?.getFeeAssetId()

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )

  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  useEffect(() => {
    if (!opportunityData?.assetId) return
    ;(async () => {
      setIdleOpportunity(await idleInvestor.findByOpportunityId(opportunityData.assetId))
    })()
  }, [idleInvestor, opportunityData?.assetId, setIdleOpportunity])

  const asset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, opportunityData?.assetId ?? ''),
  )

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  if (!asset) throw new Error(`Asset not found for AssetId ${opportunityData?.assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId ?? ''))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const handleConfirm = useCallback(async () => {
    if (!dispatch || !bip44Params) return
    try {
      if (
        !(
          userAddress &&
          walletState?.wallet &&
          assetReference &&
          supportsETH(walletState.wallet) &&
          opportunity &&
          chainAdapter &&
          opportunityData?.assetId &&
          asset
        )
      )
        return
      dispatch({ type: IdleWithdrawActionType.SET_LOADING, payload: true })
      if (!idleOpportunity) throw new Error('No opportunity')

      const idleAssetWithdrawAmountCryptoHuman = bnOrZero(state.withdraw.cryptoAmount)
      const tx = await idleOpportunity.prepareWithdrawal({
        address: userAddress,
        amount: bn(toBaseUnit(idleAssetWithdrawAmountCryptoHuman, asset.precision)),
      })
      const txid = await idleOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
        bip44Params,
      })
      dispatch({ type: IdleWithdrawActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.WithdrawConfirm,
        {
          opportunity: opportunityData,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [
            { assetId: asset.assetId, amountCryptoHuman: state.withdraw.cryptoAmount },
          ],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
    } finally {
      dispatch({ type: IdleWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    bip44Params,
    userAddress,
    walletState.wallet,
    assetReference,
    opportunity,
    chainAdapter,
    opportunityData,
    asset,
    idleOpportunity,
    state?.withdraw.cryptoAmount,
    state?.withdraw.fiatAmount,
    onNext,
    assets,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.withdraw.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAssetBalance, state?.withdraw.estimatedGasCrypto, feeAsset?.precision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!state || !dispatch) return null

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
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={asset.symbol} />
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
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol={feeAsset.symbol}
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
