import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { toAssetId } from '@keepkey/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@keepkey/chain-adapters'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import React, { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { selectAssetById, selectBIP44ParamsByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { CosmosClaimActionType } from './ClaimCommon'
import { ClaimContext } from './ClaimContext'
import { initialState, reducer } from './ClaimReducer'
import { Confirm } from './components/Confirm'
import { Status } from './components/Status'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'CosmosClaim'],
})

type CosmosClaimProps = { accountId?: Nullable<AccountId> }

export const CosmosClaim: React.FC<CosmosClaimProps> = ({ accountId }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress, assetReference, chainId } = query
  const { state: walletState } = useWallet()
  const assetNamespace = 'slip44' // TODO: add to query, why do we hardcode this?
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference, // TODO: handle multiple denoms
  })

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const opportunities = useCosmosSdkStakingBalances({ accountId, assetId })
  const cosmosOpportunity = useMemo(
    () =>
      opportunities?.cosmosSdkStakingOpportunities?.find(
        opportunity => opportunity.address === contractAddress,
      ),
    [opportunities, contractAddress],
  )
  useEffect(() => {
    ;(async () => {
      try {
        if (!(cosmosOpportunity && bip44Params)) return

        const chainAdapterManager = getChainAdapterManager()
        const chainAdapter = chainAdapterManager.get(
          chainId,
        ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>
        if (!(walletState.wallet && contractAddress && chainAdapter)) return
        const address = await chainAdapter.getAddress({ wallet: walletState.wallet, bip44Params })

        dispatch({ type: CosmosClaimActionType.SET_USER_ADDRESS, payload: address })
        dispatch({
          type: CosmosClaimActionType.SET_OPPORTUNITY,
          payload: { ...cosmosOpportunity },
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'CosmosClaim error')
      }
    })()
  }, [chainId, cosmosOpportunity, contractAddress, walletState.wallet, bip44Params])

  // Asset info

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const translate = useTranslate()

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
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: translate('defi.steps.status.title'),
        component: Status,
      },
    }
  }, [accountId, translate])

  if (!asset) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <ClaimContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('defi.modals.claim.claimYour', {
            opportunity: `${asset.name}`,
          })}
        />
        <Steps steps={StepConfig} initialStep={DefiStep.Confirm} persistStepperStatus />
      </DefiModalContent>
    </ClaimContext.Provider>
  )
}
