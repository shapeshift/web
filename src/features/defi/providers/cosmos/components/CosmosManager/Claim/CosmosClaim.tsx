import { Center, CircularProgress } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkBaseAdapter, CosmosSdkChainId } from '@shapeshiftoss/chain-adapters'
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
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { serializeUserStakingId, toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosClaimActionType } from './ClaimCommon'
import { ClaimContext } from './ClaimContext'
import { initialState, reducer } from './ClaimReducer'
import { Confirm } from './components/Confirm'
import { Status } from './components/Status'

type CosmosClaimProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const CosmosClaim: React.FC<CosmosClaimProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, contractAddress: validatorAddress, assetReference, chainId } = query
  const { state: walletState } = useWallet()
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

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
    try {
      if (!earnOpportunityData) return

      const chainAdapterManager = getChainAdapterManager()
      const chainAdapter = chainAdapterManager.get(
        chainId,
      ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>
      if (!(walletState.wallet && validatorAddress && chainAdapter)) return
      dispatch({
        type: CosmosClaimActionType.SET_OPPORTUNITY,
        payload: { ...earnOpportunityData },
      })
    } catch (error) {
      // TODO: handle client side errors
      console.error(error)
    }
  }, [chainId, validatorAddress, walletState.wallet, earnOpportunityData])

  const highestBalanceAccountIdFilter = useMemo(() => ({ stakingId: validatorId }), [validatorId])
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestBalanceAccountId],
  )
  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

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
        component: ownProps => <Status {...ownProps} accountId={accountId} />,
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
