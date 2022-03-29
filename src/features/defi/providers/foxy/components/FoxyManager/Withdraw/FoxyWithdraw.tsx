import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  Box,
  Center,
  Flex,
  Link,
  Stack,
  useColorModeValue,
  useToast
} from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { ChainTypes, NetworkTypes, WithdrawType } from '@shapeshiftoss/types'
import { Approve } from 'features/defi/components/Approve/Approve'
import { Confirm } from 'features/defi/components/Confirm/Confirm'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { Withdraw, WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import {
  DefiParams,
  DefiQueryParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { AnimatePresence } from 'framer-motion'
import isNil from 'lodash/isNil'
import { useEffect, useReducer } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RouteSteps, StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioLoading
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyWithdrawActionType, initialState, reducer } from './WithdrawReducer'

enum WithdrawPath {
  Withdraw = '/',
  Approve = '/approve',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status'
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Amount' },
  { step: 1, path: WithdrawPath.Approve, label: 'Approve' },
  { step: 2, path: WithdrawPath.Confirm, label: 'Confirm' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: WithdrawPath.Status, label: 'Status' }
]

type FoxyWithdrawProps = {
  api: FoxyApi
}

export const FoxyWithdraw = ({ api }: FoxyWithdrawProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const history = useHistory()
  const translate = useTranslate()
  const alertText = useColorModeValue('blue.800', 'white')
  const defaultStatusBg = useColorModeValue('white', 'gray.700')
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress, tokenId, rewardId } = query
  const toast = useToast()

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  // Asset info
  const underlyingAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: tokenId
  })
  const underlyingAsset = useAppSelector(state => selectAssetByCAIP19(state, underlyingAssetCAIP19))
  const assetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: rewardId
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  const feeAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum
  })
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const { state: walletState } = useWallet()
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetCAIP19))
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !contractAddress) return
        const [address, foxyOpportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.getFoxyOpportunityByStakingAddress(contractAddress)
        ])
        dispatch({ type: FoxyWithdrawActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: FoxyWithdrawActionType.SET_OPPORTUNITY, payload: foxyOpportunity })
      } catch (error) {
        // TODO: handle client side errors
        console.error('FoxyWithdraw error:', error)
      }
    })()
  }, [api, chainAdapter, contractAddress, walletState.wallet])

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    if (!state.userAddress || !rewardId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateWithdrawGas({
          tokenContractAddress: rewardId,
          contractAddress,
          amountDesired: bnOrZero(withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress,
          type: state.withdraw.withdrawType
        }),
        api.getGasPrice()
      ])
      const returVal = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
      return returVal
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('FoxyWithdraw:getWithdrawGasEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error'
      })
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!state.userAddress) return
    // set withdraw state for future use
    dispatch({ type: FoxyWithdrawActionType.SET_WITHDRAW, payload: formValues })
    try {
      // Check is approval is required for user address
      const _allowance = await api.allowance({
        tokenContractAddress: rewardId,
        contractAddress,
        userAddress: state.userAddress
      })

      // Get foxy fee for instant sends
      const foxyFeePercentage = await api.instantUnstakeFee({ contractAddress })

      dispatch({
        type: FoxyWithdrawActionType.SET_FOXY_FEE,
        payload: bnOrZero(foxyFeePercentage).toString()
      })

      const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)

      // Skip approval step if user allowance is greater than requested deposit amount
      if (allowance.gt(formValues.cryptoAmount)) {
        const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxyWithdrawActionType.SET_WITHDRAW,
          payload: { estimatedGasCrypto }
        })
        history.push(WithdrawPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxyWithdrawActionType.SET_APPROVE,
          payload: { estimatedGasCrypto }
        })
        history.push(WithdrawPath.Approve)
      }
    } catch (error) {
      console.error('FoxyWithdraw:handleContinue error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error'
      })
    }
  }

  const getApproveGasEstimate = async () => {
    if (!state.userAddress || !rewardId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateApproveGas({
          tokenContractAddress: rewardId,
          contractAddress,
          userAddress: state.userAddress
        }),
        api.getGasPrice()
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('FoxyWithdraw:getApproveEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error'
      })
    }
  }

  const handleApprove = async () => {
    if (!rewardId || !state.userAddress || !walletState.wallet) return
    try {
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: rewardId,
        contractAddress,
        userAddress: state.userAddress,
        wallet: walletState.wallet
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: rewardId,
            contractAddress,
            userAddress: state.userAddress!
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(`1e+${asset.precision}`)
          return bnOrZero(allowance).gt(state.withdraw.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 30
      })
      // Get withdraw gas estimate
      const estimatedGasCrypto = await getWithdrawGasEstimate(state.withdraw)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: { estimatedGasCrypto }
      })

      history.push(WithdrawPath.Confirm)
    } catch (error) {
      console.error('FoxyWithdraw:handleApprove error:', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error'
      })
    } finally {
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: false })
    }
  }

  const handleConfirm = async () => {
    try {
      if (!state.userAddress || !rewardId || !walletState.wallet) return
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.withdraw({
          tokenContractAddress: rewardId,
          userAddress: state.userAddress,
          contractAddress,
          wallet: walletState.wallet,
          amountDesired: bnOrZero(state.withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          type: state.withdraw.withdrawType
        }),
        api.getGasPrice()
      ])
      dispatch({ type: FoxyWithdrawActionType.SET_TXID, payload: txid })
      history.push(WithdrawPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30
      })
      dispatch({
        type: FoxyWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0)
        }
      })
      dispatch({ type: FoxyWithdrawActionType.SET_LOADING, payload: false })
    } catch (error) {
      console.error('FoxyWithdraw:handleConfirm error', error)
    }
  }

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const _value = bnOrZero(value)
    const hasValidBalance = crypto.gt(0) && _value.gt(0) && crypto.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const fiat = crypto.times(marketData.price)
    const _value = bnOrZero(value)
    const hasValidBalance = fiat.gt(0) && _value.gt(0) && fiat.gte(value)
    if (_value.isEqualTo(0)) return ''
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e+${asset?.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    const { statusIcon, statusText, statusBg } = (() => {
      let statusIcon: React.ReactElement = <ArrowForwardIcon />
      let statusText = StatusTextEnum.pending
      let statusBg = defaultStatusBg
      if (state.withdraw.txStatus === 'success') {
        statusText = StatusTextEnum.success
        statusIcon = <CheckIcon color='green' />
        statusBg = 'green.500'
      }
      if (state.withdraw.txStatus === 'failed') {
        statusText = StatusTextEnum.failed
        statusIcon = <CloseIcon color='red' />
        statusBg = 'red.500'
      }

      return { statusIcon, statusText, statusBg }
    })()

    switch (route.path) {
      case WithdrawPath.Withdraw:
        return (
          <Withdraw
            asset={asset}
            cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
            cryptoInputValidation={{
              required: true,
              validate: { validateCryptoAmount }
            }}
            fiatAmountAvailable={fiatAmountAvailable.toString()}
            fiatInputValidation={{
              required: true,
              validate: { validateFiatAmount }
            }}
            marketData={marketData}
            onCancel={handleCancel}
            onContinue={handleContinue}
            percentOptions={[0.25, 0.5, 0.75, 1]}
            enableSlippage={false}
            enableWithdrawType
          >
            <Row>
              <Row.Label>{translate('modals.withdraw.withDrawalFee')}</Row.Label>
              <Row.Value>
                <Amount.Crypto value='0' symbol={asset.symbol} />
              </Row.Value>
            </Row>
            <Text fontSize='sm' color='gray.500' translation='modals.withdraw.disclaimer' />
          </Withdraw>
        )
      case WithdrawPath.Approve:
        return (
          <Approve
            asset={asset}
            feeAsset={feeAsset}
            cryptoEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
              .div(`1e+${feeAsset.precision}`)
              .toFixed(5)}
            disableAction
            fiatEstimatedGasFee={bnOrZero(state.approve.estimatedGasCrypto)
              .div(`1e+${feeAsset.precision}`)
              .times(feeMarketData.price)
              .toFixed(2)}
            loading={state.loading}
            loadingText={translate('common.approveOnWallet')}
            learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
            preFooter={
              <Alert status='info' borderRadius='lg' color='blue.500'>
                <FaGasPump />
                <AlertDescription textAlign='left' ml={3} color={alertText}>
                  {translate('modals.withdraw.withdrawFee')}
                </AlertDescription>
              </Alert>
            }
            onCancel={() => history.push('/')}
            onConfirm={handleApprove}
          />
        )
      case WithdrawPath.Confirm:
        return (
          <Confirm
            onCancel={handleCancel}
            headerText='modals.confirm.withdraw.header'
            onConfirm={handleConfirm}
            loading={state.loading}
            loadingText={translate('common.confirmOnWallet')}
            assets={[
              {
                ...asset,
                color: '#FFFFFF',
                cryptoAmount: state.withdraw.cryptoAmount,
                fiatAmount: state.withdraw.fiatAmount
              },
              {
                ...underlyingAsset,
                color: '#FF0000',
                cryptoAmount: state.withdraw.cryptoAmount,
                fiatAmount: state.withdraw.fiatAmount
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawTo' />
                </Row.Label>
                <Row.Value>
                  <MiddleEllipsis address={state.userAddress || ''} />
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFee' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  {`${
                    state.withdraw.withdrawType === WithdrawType.INSTANT
                      ? bnOrZero(state.withdraw.cryptoAmount).times(state.foxyFeePercentage)
                      : '0'
                  } Foxy`}
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawTime' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <Text
                    translation={
                      state.withdraw.withdrawType === WithdrawType.INSTANT
                        ? 'modals.confirm.withdrawInstantTime'
                        : 'modals.confirm.withdrawDelayedTime'
                    }
                  />
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat
                      fontWeight='bold'
                      value={bnOrZero(state.withdraw.estimatedGasCrypto)
                        .div(`1e+${feeAsset.precision}`)
                        .times(feeMarketData.price)
                        .toFixed(2)}
                    />
                    <Amount.Crypto
                      color='gray.500'
                      value={bnOrZero(state.withdraw.estimatedGasCrypto)
                        .div(`1e+${feeAsset.precision}`)
                        .toFixed(5)}
                      symbol={feeAsset.symbol}
                    />
                  </Box>
                </Row.Value>
              </Row>
            </Stack>
          </Confirm>
        )
      case WithdrawPath.Status:
        return (
          <TxStatus
            onClose={handleCancel}
            onContinue={handleViewPosition}
            loading={state.loading}
            continueText='modals.status.position'
            closeText='modals.status.close'
            statusText={statusText}
            bg={statusBg}
            statusIcon={statusIcon}
            assets={[
              {
                ...asset,
                cryptoAmount: state.withdraw.cryptoAmount,
                fiatAmount: state.withdraw.fiatAmount
              },
              {
                ...underlyingAsset,
                cryptoAmount: state.withdraw.cryptoAmount,
                fiatAmount: state.withdraw.fiatAmount
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.status.transactionId' />
                </Row.Label>
                <Row.Value>
                  <Link
                    href={`${asset.explorerTxLink}/${state.txid}`}
                    isExternal
                    color='blue.500'
                    fontWeight='bold'
                  >
                    <MiddleEllipsis address={state.txid || ''} />
                  </Link>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFee' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  {`${
                    state.withdraw.withdrawType === WithdrawType.INSTANT
                      ? bnOrZero(state.withdraw.cryptoAmount).times(state.foxyFeePercentage)
                      : '0'
                  } Foxy`}
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <MiddleEllipsis address={state.userAddress || ''} />
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text
                    translation={
                      state.withdraw.txStatus === 'pending'
                        ? 'modals.status.estimatedGas'
                        : 'modals.status.gasUsed'
                    }
                  />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat
                      fontWeight='bold'
                      value={bnOrZero(
                        state.withdraw.txStatus === 'pending'
                          ? state.withdraw.estimatedGasCrypto
                          : state.withdraw.usedGasFee
                      )
                        .div(`1e+${feeAsset.precision}`)
                        .times(feeMarketData.price)
                        .toFixed(2)}
                    />
                    <Amount.Crypto
                      color='gray.500'
                      value={bnOrZero(
                        state.withdraw.txStatus === 'pending'
                          ? state.withdraw.estimatedGasCrypto
                          : state.withdraw.usedGasFee
                      )
                        .div(`1e+${feeAsset.precision}`)
                        .toFixed(5)}
                      symbol='ETH'
                    />
                  </Box>
                </Row.Value>
              </Row>
            </Stack>
          </TxStatus>
        )
      default:
        throw new Error('Route does not exist')
    }
  }

  if (loading || !asset || !marketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return (
    <Flex width='full' minWidth={{ base: '100%', xl: '500px' }} flexDir='column'>
      <RouteSteps routes={routes} location={location} />
      <Flex flexDir='column' width='full' minWidth='400px'>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            {routes.map(route => {
              return (
                <Route exact key={route.path} render={() => renderRoute(route)} path={route.path} />
              )
            })}
          </Switch>
        </AnimatePresence>
      </Flex>
    </Flex>
  )
}
