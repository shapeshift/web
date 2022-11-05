import { Center } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { toAssetId } from '@keepkey/caip'
import { KnownChainIds } from '@keepkey/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
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
import { useGetFoxyAprQuery } from 'state/apis/foxy/foxyApi'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { FoxyDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Foxy', 'FoxyDeposit'],
})

export const FoxyDeposit: React.FC<{
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: Nullable<AccountId>
}> = ({ onAccountIdChange: handleAccountIdChange, accountId }) => {
  const { foxy: api } = useFoxy()
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  // user info
  const chainAdapterManager = getChainAdapterManager()
  const { state: walletState } = useWallet()
  const { data: foxyAprData, isLoading: isFoxyAprLoading } = useGetFoxyAprQuery()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
        if (
          !(
            walletState.wallet &&
            contractAddress &&
            !isFoxyAprLoading &&
            chainAdapter &&
            api &&
            bip44Params
          )
        )
          return
        const [address, foxyOpportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet, bip44Params }),
          api.getFoxyOpportunityByStakingAddress(contractAddress),
        ])
        dispatch({ type: FoxyDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({
          type: FoxyDepositActionType.SET_OPPORTUNITY,
          payload: { ...foxyOpportunity, apy: foxyAprData?.foxyApr ?? '' },
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxyDeposit error')
      }
    })()
  }, [
    api,
    bip44Params,
    chainAdapterManager,
    contractAddress,
    walletState.wallet,
    foxyAprData?.foxyApr,
    isFoxyAprLoading,
  ])

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
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
        props: {
          contractAddress,
        },
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
  }, [accountId, handleAccountIdChange, contractAddress, translate, asset.symbol])

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
          title={translate('modals.deposit.depositInto', { opportunity: `${asset.symbol} Yieldy` })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
