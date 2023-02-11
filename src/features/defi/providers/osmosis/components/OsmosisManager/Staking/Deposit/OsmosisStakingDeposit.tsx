import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
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
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { OsmosisStakingDepositActionType } from './StakingDepositCommon'
import { StakingDepositContext } from './StakingDepositContext'
import { initialState, reducer } from './StakingDepositReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Osmosis', 'Staking', 'OsmosisStakingDeposit'],
})

type OsmosisStakingDepositProps = {
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: AccountId | undefined
}

export const OsmosisStakingDeposit: React.FC<OsmosisStakingDepositProps> = ({
  onAccountIdChange: handleAccountIdChange,
  accountId,
}) => {
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress: validatorAddress, assetReference } = query
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

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

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  useEffect(() => {
    ;(() => {
      try {
        if (!earnOpportunityData) return

        const chainAdapterManager = getChainAdapterManager()
        const chainAdapter = chainAdapterManager.get(chainId)
        if (
          !(
            walletState.wallet &&
            validatorAddress &&
            chainAdapter &&
            earnOpportunityData?.apy &&
            bip44Params
          )
        )
          return

        dispatch({ type: OsmosisStakingDepositActionType.SET_ACCOUNT_ID, payload: accountId ?? '' })
        dispatch({
          type: OsmosisStakingDepositActionType.SET_OPPORTUNITY,
          payload: { ...earnOpportunityData },
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'OsmosisStakingDeposit error')
      }
    })()
  }, [bip44Params, chainId, earnOpportunityData, walletState.wallet, validatorAddress, accountId])

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', { asset: asset.symbol }),
        component: ownProps => (
          <Deposit {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: Status,
      },
    }
  }, [accountId, handleAccountIdChange, asset.symbol, translate])

  if (loading || !asset || !marketData) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <StakingDepositContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('modals.stake.stakeYour', { opportunity: `${asset.symbol}` })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </StakingDepositContext.Provider>
  )
}
