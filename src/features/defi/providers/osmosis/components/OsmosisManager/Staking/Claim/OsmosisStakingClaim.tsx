import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { osmosis } from '@shapeshiftoss/chain-adapters'
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
import { serializeUserStakingId, toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunityByUserStakingId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { OsmosisStakingClaimActionType } from './StakingClaimCommon'
import { StakingClaimContext } from './StakingClaimContext'
import { initialState, reducer } from './StakingClaimReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Osmosis', 'Staking', 'OsmosisStakingClaim'],
})

type OsmosisStakingClaimProps = { accountId: AccountId | undefined }

export const OsmosisStakingClaim: React.FC<OsmosisStakingClaimProps> = ({ accountId }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, contractAddress: validatorAddress, assetReference, chainId } = query
  const { state: walletState } = useWallet()
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const validatorId = toValidatorId({ chainId, account: validatorAddress })

  const opportunityDataFilter = useMemo(() => {
    if (!accountId) return
    const userStakingId = serializeUserStakingId(accountId, validatorId)
    return { userStakingId }
  }, [accountId, validatorId])

  const earnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )
  useEffect(() => {
    ;(() => {
      try {
        if (!(earnOpportunityData && bip44Params)) return

        const chainAdapterManager = getChainAdapterManager()
        const chainAdapter = chainAdapterManager.get(chainId) as unknown as osmosis.ChainAdapter
        if (!(walletState.wallet && validatorAddress && chainAdapter)) return

        dispatch({ type: OsmosisStakingClaimActionType.SET_ACCOUNT_ID, payload: accountId ?? '' })
        dispatch({
          type: OsmosisStakingClaimActionType.SET_OPPORTUNITY,
          payload: { ...earnOpportunityData },
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'OsmosisStakingClaim error')
      }
    })()
  }, [chainId, validatorAddress, earnOpportunityData, walletState.wallet, bip44Params, accountId])

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
    <StakingClaimContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('defi.modals.claim.claimYour', {
            opportunity: `${asset.name}`,
          })}
        />
        <Steps steps={StepConfig} initialStep={DefiStep.Confirm} persistStepperStatus />
      </DefiModalContent>
    </StakingClaimContext.Provider>
  )
}
