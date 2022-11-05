import { Center } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { toAssetId } from '@keepkey/caip'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioLoading,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { CosmosDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'CosmosDeposit'],
})

type CosmosDepositProps = {
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: Nullable<AccountId>
}

export const CosmosDeposit: React.FC<CosmosDepositProps> = ({
  onAccountIdChange: handleAccountIdChange,
  accountId,
}) => {
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assetNamespace = 'slip44'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  const validatorData = useAppSelector(state => selectValidatorByAddress(state, contractAddress))

  const apr = useMemo(() => bnOrZero(validatorData?.apr).toString(), [validatorData])

  const opportunities = useCosmosSdkStakingBalances({ accountId, assetId })
  const cosmosOpportunity = useMemo(
    () =>
      opportunities?.cosmosSdkStakingOpportunities?.find(
        opportunity => opportunity.address === contractAddress,
      ),
    [opportunities, contractAddress],
  )

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  useEffect(() => {
    ;(async () => {
      try {
        if (!cosmosOpportunity) return

        const chainAdapterManager = getChainAdapterManager()
        const chainAdapter = chainAdapterManager.get(chainId)
        if (!(walletState.wallet && contractAddress && chainAdapter && apr && bip44Params)) return

        const address = await chainAdapter.getAddress({ bip44Params, wallet: walletState.wallet })

        dispatch({ type: CosmosDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({
          type: CosmosDepositActionType.SET_OPPORTUNITY,
          payload: { ...cosmosOpportunity },
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'CosmosDeposit error')
      }
    })()
  }, [bip44Params, chainId, cosmosOpportunity, apr, contractAddress, walletState.wallet])

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
    <DepositContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('modals.stake.stakeYour', { opportunity: `${asset.symbol}` })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
