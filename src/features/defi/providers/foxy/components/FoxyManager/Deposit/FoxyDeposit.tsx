import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { getAddress } from 'viem'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetFoxyAprQuery } from 'state/apis/foxy/foxyApi'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectBip44ParamsByAccountId,
  selectIsPortfolioLoading,
  selectMarketDataByAssetIdUserCurrency,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { FoxyDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

export const FoxyDeposit: React.FC<{
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: AccountId | undefined
}> = ({ onAccountIdChange: handleAccountIdChange, accountId }) => {
  const foxyApi = getFoxyApi()
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    chainId,
    contractAddress: foxyContractAddress,
    assetReference: foxyStakingContractAddress,
    assetNamespace,
  } = query
  // ContractAssetId
  const assetId = toAssetId({ chainId, assetNamespace, assetReference: foxyStakingContractAddress })

  const opportunityMetadataFilter = useMemo(() => ({ stakingId: assetId as StakingId }), [assetId])
  const opportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const stakingAssetId = opportunityMetadata?.underlyingAssetIds[0] ?? ''
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  if (!stakingAsset) throw new Error(`Asset not found for AssetId ${stakingAssetId}`)

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBip44ParamsByAccountId(state, accountFilter))

  // user info
  const chainAdapterManager = getChainAdapterManager()
  const { state: walletState } = useWallet()
  const { data: foxyAprData, isLoading: isFoxyAprLoading } = useGetFoxyAprQuery()
  const loading = useSelector(selectIsPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
        if (
          !(
            walletState.wallet &&
            foxyStakingContractAddress &&
            !isFoxyAprLoading &&
            chainAdapter &&
            foxyApi &&
            bip44Params
          )
        )
          return
        const foxyOpportunity = await foxyApi.getFoxyOpportunityByStakingAddress(
          getAddress(foxyStakingContractAddress),
        )
        dispatch({
          type: FoxyDepositActionType.SET_OPPORTUNITY,
          payload: { ...foxyOpportunity, apy: foxyAprData?.foxyApr ?? '' },
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error(error)
      }
    })()
  }, [
    foxyApi,
    bip44Params,
    chainAdapterManager,
    foxyContractAddress,
    walletState.wallet,
    foxyAprData?.foxyApr,
    isFoxyAprLoading,
    foxyStakingContractAddress,
  ])

  const handleBack = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location.pathname, query])

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', {
          asset: stakingAsset.symbol,
        }),
        component: ownProps => (
          <Deposit {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
        props: {
          contractAddress: foxyContractAddress,
        },
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
  }, [accountId, handleAccountIdChange, foxyContractAddress, translate, stakingAsset.symbol])

  if (loading || !stakingAsset || !marketData) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <DepositContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('modals.deposit.depositInto', {
            opportunity: `${stakingAsset.symbol} Yieldy`,
          })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
