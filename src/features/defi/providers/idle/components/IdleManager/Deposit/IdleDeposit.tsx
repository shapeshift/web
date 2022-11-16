import { Center, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { getIdleInvestor } from 'features/defi/contexts/IdleProvider/idleInvestorSingleton'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
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
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { IdleDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

const moduleLogger = logger.child({
  namespace: ['Defi', 'Providers', 'Idle', 'IdleManager', 'Deposit', 'IdleDeposit'],
})

type IdleDepositProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const IdleDeposit: React.FC<IdleDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const idleInvestor = useMemo(() => getIdleInvestor(), [])
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const chainAdapterManager = getChainAdapterManager()
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)
  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  useEffect(() => {
    ;(async () => {
      try {
        const userAddress = accountId && fromAccountId(accountId).account
        if (userAddress && userAddress !== state.userAddress) {
          dispatch({ type: IdleDepositActionType.SET_USER_ADDRESS, payload: userAddress })
        }
        if (state.opportunity) return
        if (!(walletState.wallet && vaultAddress && chainAdapter && idleInvestor && bip44Params))
          return
        const opportunity = await idleInvestor.findByOpportunityId(
          toAssetId({ chainId, assetNamespace, assetReference: vaultAddress }),
        )
        if (!opportunity) {
          return toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }

        dispatch({ type: IdleDepositActionType.SET_OPPORTUNITY, payload: opportunity })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'IdleDeposit:useEffect error')
      }
    })()
  }, [
    chainAdapter,
    vaultAddress,
    walletState.wallet,
    translate,
    toast,
    chainId,
    bip44Params,
    idleInvestor,
    state.userAddress,
    state.opportunity,
    accountId,
  ])

  const handleBack = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location, query])

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', { asset: asset.symbol }),
        component: ownProps => (
          <Deposit {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: translate('defi.steps.status.title'),
        component: Status,
      },
    }
  }, [translate, asset.symbol, accountId, handleAccountIdChange])

  const value = useMemo(() => ({ state, dispatch }), [state])

  if (loading || !asset || !marketData || !idleInvestor) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <DepositContext.Provider value={value}>
      <DefiModalContent>
        <DefiModalHeader
          title={translate('modals.deposit.depositInto', { opportunity: `${asset.symbol} Vault` })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
