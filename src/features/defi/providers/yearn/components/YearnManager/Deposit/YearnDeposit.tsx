import { ArrowBackIcon } from '@chakra-ui/icons'
import { Center, Flex, IconButton, ModalCloseButton, ModalHeader, useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
  DefiSteps,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import qs from 'qs'
import { useEffect, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { DefiStepProps, Steps } from 'components/DeFi/components/Steps'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { YearnDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

export const YearnDeposit = () => {
  const { yearn: api } = useYearn()
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const chainAdapterManager = useChainAdapters()
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const chainAdapter = chainAdapterManager.get(chainId)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(walletState.wallet && vaultAddress && chainAdapter && api)) return
        const [address, opportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.findByOpportunityId(
            toAssetId({ chainId, assetNamespace, assetReference: vaultAddress }),
          ),
        ])
        if (!opportunity) {
          return toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }

        dispatch({ type: YearnDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnDepositActionType.SET_OPPORTUNITY, payload: opportunity })
      } catch (error) {
        // TODO: handle client side errors
        console.error('YearnDeposit error:', error)
      }
    })()
  }, [api, chainAdapter, vaultAddress, walletState.wallet, translate, toast, chainId])

  const handleBack = () => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const StepConfig: DefiStepProps = {
    [DefiSteps.Info]: {
      label: 'Deposit Info',
      description: 'Enter the amount of FOX you would like to deposit.',
      component: Deposit,
    },
    [DefiSteps.Approve]: {
      label: 'Approve',
      component: Approve,
    },
    [DefiSteps.Confirm]: {
      label: 'Confirm',
      component: Confirm,
    },
    [DefiSteps.Status]: {
      label: 'Status',
      component: Status,
    },
  }

  if (loading || !asset || !marketData || !api) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <DepositContext.Provider value={{ state, dispatch }}>
      <Flex width='full' minWidth={{ base: '100%', md: '500px' }} flexDir='column'>
        <ModalHeader py={2} display='flex' justifyContent='space-between' alignItems='center'>
          <IconButton
            fontSize='xl'
            isRound
            size='sm'
            variant='ghost'
            aria-label='Back'
            onClick={handleBack}
            icon={<ArrowBackIcon />}
          />
          <Text
            translation={['modals.deposit.depositInto', { opportunity: `${asset.symbol} Vault` }]}
          />
          <ModalCloseButton position='static' />
        </ModalHeader>
        <Steps steps={StepConfig} />
      </Flex>
    </DepositContext.Provider>
  )
}
