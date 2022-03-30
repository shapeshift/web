import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Center,
  Flex,
  Link,
  Stack,
  Tag,
  useColorModeValue,
  useToast
} from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { NetworkTypes } from '@shapeshiftoss/types'
import { Approve } from 'features/defi/components/Approve/Approve'
import { Confirm } from 'features/defi/components/Confirm/Confirm'
import { Deposit, DepositValues } from 'features/defi/components/Deposit/Deposit'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
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
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioLoading
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { FoxyDepositActionType, initialState, reducer } from './DepositReducer'

enum DepositPath {
  Deposit = '/',
  Approve = '/approve',
  ApproveSettings = '/approve/settings',
  Confirm = '/confirm',
  ConfirmSettings = '/confirm/settings',
  Status = '/status'
}

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Approve, label: 'Approve' },
  { path: DepositPath.ApproveSettings, label: 'Approve Settings' },
  { step: 2, path: DepositPath.Confirm, label: 'Confirm' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: DepositPath.Status, label: 'Status' }
]

export type FoxyDepositProps = {
  api: FoxyApi
}

export const FoxyDeposit = ({ api }: FoxyDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const history = useHistory()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress, tokenId, rewardId } = query
  const alertText = useColorModeValue('blue.800', 'white')
  const defaultStatusBg = useColorModeValue('white', 'gray.700')
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetId = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })
  const feeAssetId = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum
  })

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetId))
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))
  const contractAssetId = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: rewardId
  })
  const contractAsset = useAppSelector(state => selectAssetByCAIP19(state, contractAssetId))

  // user info
  const chainAdapterManager = useChainAdapters()
  const { state: walletState } = useWallet()
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetId))
  const loading = useSelector(selectPortfolioLoading)

  // notify
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !contractAddress) return
        const chainAdapter = await chainAdapterManager.byChainId('eip155:1')
        const [address, foxyOpportunity, pricePerShare] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.getFoxyOpportunityByStakingAddress(contractAddress),
          api.pricePerShare()
        ])
        dispatch({ type: FoxyDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: FoxyDepositActionType.SET_OPPORTUNITY, payload: foxyOpportunity })
        dispatch({
          type: FoxyDepositActionType.SET_PRICE_PER_SHARE,
          payload: pricePerShare.toString()
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('FoxyDeposit error:', error)
      }
    })()
  }, [api, chainAdapterManager, contractAddress, walletState.wallet])

  const getApproveGasEstimate = async () => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateApproveGas({
          tokenContractAddress: tokenId,
          contractAddress,
          userAddress: state.userAddress
        }),
        api.getGasPrice()
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('FoxyDeposit:getApproveEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error'
      })
    }
  }

  const getDepositGasEstimate = async (deposit: DepositValues) => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateDepositGas({
          tokenContractAddress: tokenId,
          contractAddress,
          amountDesired: bnOrZero(deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress
        }),
        api.getGasPrice()
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('FoxyDeposit:getDepositGasEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error'
      })
    }
  }

  const handleContinue = async (formValues: DepositValues) => {
    if (!state.userAddress) return
    // set deposit state for future use
    dispatch({ type: FoxyDepositActionType.SET_DEPOSIT, payload: formValues })
    try {
      // Check is approval is required for user address
      const _allowance = await api.allowance({
        tokenContractAddress: tokenId,
        contractAddress,
        userAddress: state.userAddress
      })
      const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)

      // Skip approval step if user allowance is greater than requested deposit amount
      if (allowance.gt(formValues.cryptoAmount)) {
        const estimatedGasCrypto = await getDepositGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxyDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto }
        })
        history.push(DepositPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: FoxyDepositActionType.SET_APPROVE,
          payload: { estimatedGasCrypto }
        })
        history.push(DepositPath.Approve)
      }
    } catch (error) {
      console.error('FoxyDeposit:handleContinue error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error'
      })
    }
  }

  const handleApprove = async () => {
    if (!tokenId || !state.userAddress || !walletState.wallet) return
    try {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: tokenId,
        contractAddress,
        userAddress: state.userAddress,
        wallet: walletState.wallet
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: tokenId,
            contractAddress,
            userAddress: state.userAddress!
          }),
        validate: (result: string) => {
          const allowance = bnOrZero(result).div(`1e+${asset.precision}`)
          return bnOrZero(allowance).gt(state.deposit.cryptoAmount)
        },
        interval: 15000,
        maxAttempts: 30
      })
      // Get deposit gas estimate
      const estimatedGasCrypto = await getDepositGasEstimate(state.deposit)
      if (!estimatedGasCrypto) return
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto }
      })

      history.push(DepositPath.Confirm)
    } catch (error) {
      console.error('FoxyDeposit:handleApprove error:', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error'
      })
    } finally {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleDeposit = async () => {
    try {
      if (!state.userAddress || !tokenId || !walletState.wallet) return
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.deposit({
          amountDesired: bnOrZero(state.deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
          contractAddress,
          wallet: walletState.wallet
        }),
        api.getGasPrice()
      ])
      dispatch({ type: FoxyDepositActionType.SET_TXID, payload: txid })
      history.push(DepositPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30
      })
      dispatch({
        type: FoxyDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0)
        }
      })
    } catch (error) {
      console.error('FoxyDeposit:handleDeposit error', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error'
      })
    } finally {
      dispatch({ type: FoxyDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = history.goBack

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

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    const apy = state.foxyOpportunity.apy
    const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(bnOrZero(apy))
    const annualYieldFiat = annualYieldCrypto.times(marketData.price)

    const { statusIcon, statusText, statusBg } = (() => {
      let statusIcon: React.ReactElement = <ArrowForwardIcon />
      let statusText = StatusTextEnum.pending
      let statusBg = defaultStatusBg
      if (state.deposit.txStatus === 'success') {
        statusText = StatusTextEnum.success
        statusIcon = <CheckIcon color='white' />
        statusBg = 'green.500'
      }
      if (state.deposit.txStatus === 'failed') {
        statusText = StatusTextEnum.failed
        statusIcon = <CloseIcon color='white' />
        statusBg = 'red.500'
      }
      return { statusIcon, statusText, statusBg }
    })()

    switch (route.path) {
      case DepositPath.Deposit:
        return (
          <Deposit
            asset={asset}
            apy={String(apy)}
            cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
            cryptoInputValidation={{
              required: true,
              validate: { validateCryptoAmount }
            }}
            fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
            fiatInputValidation={{
              required: true,
              validate: { validateFiatAmount }
            }}
            marketData={marketData}
            onCancel={handleCancel}
            onContinue={handleContinue}
            percentOptions={[0.25, 0.5, 0.75, 1]}
            enableSlippage={false}
          />
        )
      case DepositPath.Approve:
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
                  {translate('modals.approve.depositFee')}
                </AlertDescription>
              </Alert>
            }
            onCancel={() => history.push('/')}
            onConfirm={handleApprove}
          />
        )
      case DepositPath.Confirm:
        return (
          <Confirm
            onCancel={handleCancel}
            onConfirm={handleDeposit}
            headerText='modals.confirm.deposit.header'
            assets={[
              {
                ...asset,
                color: '#FF0000',
                cryptoAmount: state.deposit.cryptoAmount,
                fiatAmount: state.deposit.fiatAmount
              },
              {
                ...contractAsset,
                color: '#FFFFFF',
                cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
                  .div(bnOrZero(1).div(1))
                  .toString(),
                fiatAmount: state.deposit.fiatAmount
              }
            ]}
          >
            <Stack spacing={4}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFrom' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <MiddleEllipsis address={state.userAddress || ''} />
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <MiddleEllipsis address={state.foxyOpportunity.contractAddress || ''} />
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
                      value={bnOrZero(state.deposit.estimatedGasCrypto)
                        .div(`1e+${feeAsset.precision}`)
                        .times(feeMarketData.price)
                        .toFixed(2)}
                    />
                    <Amount.Crypto
                      color='gray.500'
                      value={bnOrZero(state.deposit.estimatedGasCrypto)
                        .div(`1e+${feeAsset.precision}`)
                        .toFixed(5)}
                      symbol={feeAsset.symbol}
                    />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.averageApy' />
                </Row.Label>
                <Row.Value>
                  <Tag colorScheme='green'>
                    <Amount.Percent value={String(apy)} />
                  </Tag>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.deposit.estimatedReturns' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value={annualYieldFiat.toFixed(2)} />
                    <Amount.Crypto
                      color='gray.500'
                      value={annualYieldCrypto.toFixed(5)}
                      symbol={asset.symbol}
                    />
                  </Box>
                </Row.Value>
              </Row>
              <Alert status='info' borderRadius='lg'>
                <AlertIcon />
                <Text translation='modals.confirm.deposit.preFooter' />
              </Alert>
            </Stack>
          </Confirm>
        )
      case DepositPath.Status:
        return (
          <TxStatus
            onClose={handleCancel}
            onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
            loading={state.loading}
            statusText={statusText}
            statusIcon={statusIcon}
            bg={statusBg}
            continueText='modals.status.position'
            closeText='modals.status.close'
            assets={[
              {
                ...asset,
                cryptoAmount: state.deposit.cryptoAmount,
                fiatAmount: state.deposit.fiatAmount
              },
              {
                ...contractAsset,
                cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
                  .div(bnOrZero(1).div(1))
                  .toString(),
                fiatAmount: state.deposit.fiatAmount
              }
            ]}
          >
            <Stack spacing={4}>
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
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Foxy</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text
                    translation={
                      state.deposit.txStatus === 'pending'
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
                        state.deposit.txStatus === 'pending'
                          ? state.deposit.estimatedGasCrypto
                          : state.deposit.usedGasFee
                      )
                        .div(`1e+${feeAsset.precision}`)
                        .times(feeMarketData.price)
                        .toFixed(2)}
                    />
                    <Amount.Crypto
                      color='gray.500'
                      value={bnOrZero(
                        state.deposit.txStatus === 'pending'
                          ? state.deposit.estimatedGasCrypto
                          : state.deposit.usedGasFee
                      )
                        .div(`1e+${feeAsset.precision}`)
                        .toFixed(5)}
                      symbol='ETH'
                    />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.deposit.averageApr' />
                </Row.Label>
                <Tag colorScheme='green'>
                  <Amount.Percent value={String(apy)} />
                </Tag>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.deposit.estimatedReturns' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value={annualYieldFiat.toFixed(2)} />
                    <Amount.Crypto
                      color='gray.500'
                      value={annualYieldCrypto.toFixed(5)}
                      symbol={asset.symbol}
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

  if (loading || !asset || !marketData) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${asset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  return (
    <Flex width='full' minWidth={{ base: '100%', xl: '500px' }} flexDir='column'>
      <RouteSteps routes={routes} location={location} />
      <Flex flexDir='column' width='full' minWidth='500px'>
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
