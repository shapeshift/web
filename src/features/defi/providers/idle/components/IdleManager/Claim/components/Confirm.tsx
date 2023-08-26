import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
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
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleClaimActionType } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'
import type { ClaimAmount } from '../types'
import { ClaimableAsset } from './ClaimableAsset'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm = ({ accountId, onNext }: ConfirmProps) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { state, dispatch } = useContext(ClaimContext)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const chainAdapter = getChainAdapterManager().get(chainId)

  const assets = useAppSelector(selectAssets)

  const assetNamespace = 'erc20'

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: contractAddress,
  })

  const feeAssetId = chainAdapter?.getFeeAssetId()
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId ?? ''))
  const marketData = useAppSelector(state =>
    selectSelectedCurrencyMarketDataSortedByMarketCap(state),
  )

  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

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

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  useEffect(() => {
    if (!dispatch || !idleInvestor || !userAddress) return
    ;(async () => {
      try {
        dispatch({ type: IdleClaimActionType.SET_LOADING, payload: true })

        const idleOpportunity = await idleInvestor.findByOpportunityId(assetId)
        if (!idleOpportunity) throw new Error('No opportunity')

        const preparedTx = await idleOpportunity.prepareClaimTokens(userAddress)
        const estimatedGasCrypto = bnOrZero(preparedTx.gasPrice)
          .times(preparedTx.estimatedGas)
          .integerValue()
          .toString()

        dispatch({ type: IdleClaimActionType.SET_LOADING, payload: false })
        dispatch({ type: IdleClaimActionType.SET_CLAIM, payload: { estimatedGasCrypto } })
      } catch (error) {
        console.error(error)
      }
    })()
  }, [userAddress, dispatch, assetId, idleInvestor])

  const hasClaimBalance = useMemo(() => {
    if (!opportunityData?.rewardAssetIds?.length) return false

    return opportunityData.rewardAssetIds?.some((_rewardAssetId, i) =>
      bnOrZero(opportunityData?.rewardsCryptoBaseUnit?.amounts[i]).gt(0),
    )
  }, [opportunityData?.rewardAssetIds, opportunityData?.rewardsCryptoBaseUnit])

  const claimAmounts: ClaimAmount[] = useMemo(() => {
    if (!opportunityData?.rewardsCryptoBaseUnit?.amounts.length) return []

    return opportunityData?.rewardsCryptoBaseUnit.amounts
      .map((amount, i) => {
        if (!opportunityData?.rewardAssetIds?.[i]) return undefined
        const amountCryptoHuman = bnOrZero(amount)
          .div(bn(10).pow(assets[opportunityData.rewardAssetIds[i]]?.precision ?? 1))
          .toNumber()
        const fiatAmount = bnOrZero(amountCryptoHuman)
          .times(bnOrZero(marketData[opportunityData.rewardAssetIds[i]]?.price))
          .toNumber()
        const token = {
          assetId: opportunityData.rewardAssetIds[i],
          amountCryptoHuman,
          fiatAmount,
        }
        return token
      })
      .filter(isSome)
  }, [assets, marketData, opportunityData?.rewardAssetIds, opportunityData?.rewardsCryptoBaseUnit])

  const claimableAssets = useMemo(() => {
    if (!opportunityData?.rewardsCryptoBaseUnit?.amounts.length) return null

    return claimAmounts?.map(rewardAsset => {
      if (!rewardAsset?.assetId) return null
      const token = {
        assetId: rewardAsset.assetId,
        amount: rewardAsset.amountCryptoHuman,
      }
      return <ClaimableAsset key={rewardAsset?.assetId} token={token} />
    })
  }, [claimAmounts, opportunityData?.rewardsCryptoBaseUnit?.amounts.length])

  const handleCancel = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location, query])

  const hasEnoughBalanceForGas = useMemo(() => {
    return (
      state.claim.estimatedGasCrypto &&
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state.claim.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0)
    )
  }, [state.claim, feeAssetBalance, feeAsset])

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const handleConfirm = useCallback(async () => {
    if (!(dispatch && chainAdapter)) return
    try {
      if (
        !(
          userAddress &&
          assetReference &&
          walletState.wallet &&
          supportsETH(walletState.wallet) &&
          opportunityData &&
          bip44Params
        )
      )
        return
      dispatch({ type: IdleClaimActionType.SET_LOADING, payload: true })
      const idleOpportunity = await idleInvestor.findByOpportunityId(opportunityData?.assetId)
      if (!idleOpportunity) throw new Error('No opportunity')
      const tx = await idleOpportunity.prepareClaimTokens(userAddress)
      const txid = await idleOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
        bip44Params,
      })
      dispatch({ type: IdleClaimActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.ClaimConfirm,
        {
          opportunity: opportunityData,
          fiatAmounts: claimAmounts.map(rewardAsset => rewardAsset?.fiatAmount),
          cryptoAmounts: claimAmounts,
        },
        assets,
      )
    } catch (error) {
      console.error(error)
    } finally {
      dispatch({ type: IdleClaimActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    chainAdapter,
    userAddress,
    assetReference,
    walletState.wallet,
    opportunityData,
    bip44Params,
    idleInvestor,
    onNext,
    claimAmounts,
    assets,
  ])

  if (!state || !dispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.claim.header'
      isDisabled={!hasEnoughBalanceForGas || !hasClaimBalance}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToClaim' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack
              width='100%'
              direction='column'
              alignItems='flex-start'
              justifyContent='center'
              as='form'
            >
              {claimableAssets}
            </Stack>
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
                value={bnOrZero(state.claim.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.claim.estimatedGasCrypto)
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
