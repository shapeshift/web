import { ArrowBackIcon } from '@chakra-ui/icons'
import { Center, Flex, IconButton, ModalCloseButton, ModalHeader, useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
  DefiSteps,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import qs from 'qs'
import { useEffect, useReducer, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { StepRow } from 'components/DeFi/components/StepRow'
import { Steps } from 'components/DeFi/components/Steps'
import { RawText } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
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

const StepList = {
  [DefiSteps.Info]: 1,
  [DefiSteps.Approve]: 2,
  [DefiSteps.Confirm]: 3,
  [DefiSteps.Status]: 4,
}

export const YearnDeposit = () => {
  const { yearn: api } = useYearn()
  const [step, setStep] = useState<number>(StepList[DefiSteps.Info])
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

  const getDepositGasEstimate = async (deposit: DepositValues): Promise<string | undefined> => {
    if (!(state.userAddress && state.opportunity && assetReference && api)) return
    try {
      const yearnOpportunity = await api.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!yearnOpportunity) throw new Error('No opportunity')
      const preparedTx = await yearnOpportunity.prepareDeposit({
        amount: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
        address: state.userAddress,
      })
      // TODO(theobold): Figure out a better way for the safety factor
      return bnOrZero(preparedTx.gasPrice).times(preparedTx.estimatedGas).integerValue().toString()
    } catch (error) {
      console.error('YearnDeposit:getDepositGasEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const handleBack = () => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const handleNext = (nextStep: DefiSteps) => {
    setStep(StepList[nextStep])
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
          <RawText fontSize='md'>Deposit</RawText>
          <ModalCloseButton position='static' />
        </ModalHeader>
        <Steps isComplete={step === StepList[DefiSteps.Status]} statusComponent={<Status />}>
          <StepRow
            label='Deposit Info'
            description='Enter the amount of FOX you would like to deposit.'
            stepNumber='1'
            isComplete={step > StepList[DefiSteps.Info]}
            isActive={step === StepList[DefiSteps.Info]}
          >
            <Deposit onNext={handleNext} getDepositGasEstimate={getDepositGasEstimate} />
          </StepRow>

          <StepRow
            label='Approval'
            stepNumber='2'
            isComplete={step > StepList[DefiSteps.Approve]}
            isActive={step === StepList[DefiSteps.Approve]}
          >
            <Approve onNext={handleNext} getDepositGasEstimate={getDepositGasEstimate} />
          </StepRow>

          <StepRow label='Confirm' stepNumber='3' isActive={step === StepList[DefiSteps.Confirm]}>
            <Confirm onNext={handleNext} />
          </StepRow>
        </Steps>
      </Flex>
    </DepositContext.Provider>
  )
}
