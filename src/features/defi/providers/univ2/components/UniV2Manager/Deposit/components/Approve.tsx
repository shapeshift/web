import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS } from 'contracts/constants'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  DefiAction,
  DefiProviderMetadata,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UniV2DepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type UniV2ApproveProps = StepComponentProps & {
  accountId: AccountId | undefined
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['UniV2Deposit:Approve'] })

export const Approve: React.FC<UniV2ApproveProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const estimatedGasCryptoPrecision = state?.approve.estimatedGasCryptoPrecision
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const { lpAccountId } = useFoxEth()

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

  const { approve, allowance, getDepositGasDataCryptoBaseUnit } = useUniV2LiquidityPool({
    accountId: lpAccountId ?? '',
    lpAssetId,
    assetId0,
    assetId1,
  })

  const assets = useAppSelector(selectAssets)
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const feeAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  if (!asset0) throw new Error('Missing asset 0')
  if (!asset1) throw new Error('Missing asset 1')
  if (!feeAsset) throw new Error('Missing fee asset')

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  // user info
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  const handleApprove = useCallback(async () => {
    if (!dispatch || !state?.deposit || !lpOpportunity || !wallet || !supportsETH(wallet)) return

    try {
      dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: true })
      await approve()
      await poll({
        fn: () => allowance(),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(bn(10).pow(asset1.precision))
          return bnOrZero(allowance).gte(bnOrZero(state.deposit.asset1CryptoAmount))
        },
        interval: 15000,
        maxAttempts: 30,
      })
      // Get deposit gas estimate
      const gasData = await getDepositGasDataCryptoBaseUnit({
        token0Amount: state.deposit.asset0CryptoAmount,
        token1Amount: state.deposit.asset1CryptoAmount,
      })
      if (!gasData) return
      const estimatedGasCryptoPrecision = bnOrZero(gasData.average.txFee)
        .div(bn(10).pow(feeAsset.precision))
        .toPrecision()
      dispatch({
        type: UniV2DepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCryptoPrecision },
      })

      onNext(DefiStep.Confirm)
      trackOpportunityEvent(
        MixPanelEvents.DepositApprove,
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
      moduleLogger.error({ fn: 'handleApprove', error }, 'Error getting approval gas estimate')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    state?.deposit,
    lpOpportunity,
    wallet,
    approve,
    getDepositGasDataCryptoBaseUnit,
    feeAsset.precision,
    onNext,
    assetId0,
    assetId1,
    assets,
    allowance,
    asset1.precision,
    toast,
    translate,
  ])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(estimatedGasCryptoPrecision) &&
      isSome(accountId) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [estimatedGasCryptoPrecision, accountId, feeAsset],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Deposit}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!state || !dispatch || !lpOpportunity) return null

  return (
    <ReusableApprove
      asset={asset1}
      feeAsset={feeAsset}
      spenderName={lpOpportunity.provider}
      estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
      disabled={!hasEnoughBalanceForGas}
      fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
        .times(feeMarketData.price)
        .toFixed(2)}
      loading={state.loading}
      loadingText={translate('common.approve')}
      preFooter={preFooter}
      providerIcon={DefiProviderMetadata[lpOpportunity.provider].icon}
      learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleApprove}
      spenderContractAddress={UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS}
    />
  )
}
