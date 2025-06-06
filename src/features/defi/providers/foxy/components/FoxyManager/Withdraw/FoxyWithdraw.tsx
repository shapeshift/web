import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { getAddress } from 'viem'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { FoxyWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { DefiStepProps } from '@/components/DeFi/components/Steps'
import { Steps } from '@/components/DeFi/components/Steps'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { DefiModalContent } from '@/features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from '@/features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from '@/features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getFoxyApi } from '@/state/apis/foxy/foxyApiSingleton'
import {
  selectBip44ParamsByAccountId,
  selectIsPortfolioLoading,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const FoxyWithdraw: React.FC<{
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: AccountId | undefined
}> = ({ onAccountIdChange: handleAccountIdChange, accountId }) => {
  const foxyApi = getFoxyApi()
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetReference: foxyStakingContractAddress } = query
  const { feeAssetId, underlyingAsset, underlyingAssetId, stakingAsset } = useFoxyQuery()

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, underlyingAssetId),
  )

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBip44ParamsByAccountId(state, accountFilter))

  // user info
  const chainAdapterManager = getChainAdapterManager()
  const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectIsPortfolioLoading)

  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        if (
          !(
            walletState.wallet &&
            foxyStakingContractAddress &&
            chainAdapter &&
            foxyApi &&
            bip44Params
          )
        )
          return
        const foxyOpportunity = await foxyApi.getFoxyOpportunityByStakingAddress(
          getAddress(foxyStakingContractAddress),
        )
        // Get foxy fee for instant sends
        const foxyFeePercentage = await foxyApi.instantUnstakeFee({
          contractAddress: foxyStakingContractAddress,
        })

        dispatch({
          type: FoxyWithdrawActionType.SET_FOXY_FEE,
          payload: bnOrZero(foxyFeePercentage).toString(),
        })
        dispatch({
          type: FoxyWithdrawActionType.SET_OPPORTUNITY,
          payload: foxyOpportunity,
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error(error)
      }
    })()
  }, [foxyApi, bip44Params, chainAdapter, foxyStakingContractAddress, walletState.wallet])

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.withdraw.info.title'),
        description: translate('defi.steps.withdraw.info.yieldyDescription', {
          asset: stakingAsset.symbol,
        }),
        component: ownProps => (
          <Withdraw {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
        props: { contractAddress: foxyStakingContractAddress },
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: ownProps => <Status {...ownProps} accountId={accountId} />,
      },
    }
  }, [accountId, handleAccountIdChange, foxyStakingContractAddress, translate, stakingAsset.symbol])

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [navigate, query, location.pathname])

  if (loading || !underlyingAsset || !marketData || !feeMarketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return (
    <WithdrawContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('modals.withdraw.withdrawFrom', {
            opportunity: `${stakingAsset.symbol} Yieldy`,
          })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
