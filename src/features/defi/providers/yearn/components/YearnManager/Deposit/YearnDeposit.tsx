import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  Box,
  Center,
  Flex,
  Link,
  Stack,
  Tag,
  useColorModeValue,
  useToast
} from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Approve } from 'features/defi/components/Approve/Approve'
import { Confirm } from 'features/defi/components/Confirm/Confirm'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import { Deposit, DepositValues } from 'features/defi/components/Deposit/Deposit'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
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
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { marketApi, selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioLoading
} from 'state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { YearnVaultApi } from '../../../api/api'
import { StatusTextEnum, YearnRouteSteps } from '../../YearnRouteSteps'
import { initialState, reducer, YearnDepositActionType } from './DepositReducer'

enum DepositPath {
  Deposit = '/deposit',
  Approve = '/deposit/approve',
  ApproveSettings = '/deposit/approve/settings',
  Confirm = '/deposit/confirm',
  ConfirmSettings = '/deposit/confirm/settings',
  Status = '/deposit/status'
}

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Approve, label: 'Approve' },
  { path: DepositPath.ApproveSettings, label: 'Approve Settings' },
  { step: 2, path: DepositPath.Confirm, label: 'Confirm Deposit' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: DepositPath.Status, label: 'Status' }
]

export type YearnDepositProps = {
  api: YearnVaultApi
}

export const YearnDeposit = ({ api }: YearnDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query
  const alertText = useColorModeValue('blue.800', 'white')

  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
  const feeAssetCAIP19 = caip19.toCAIP19({ chain, network })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))
  const vaultCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: vaultAddress })
  const vaultAsset = useAppSelector(state => selectAssetByCAIP19(state, vaultCAIP19))

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const { state: walletState } = useWallet()
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetCAIP19))
  const loading = useSelector(selectPortfolioLoading)

  // navigation
  const memoryHistory = useHistory()
  const location = useLocation()
  const depositRoute = matchPath(location.pathname, { path: DepositPath.Deposit, exact: true })

  // notify
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !tokenId) return
        const [address, vault, pricePerShare] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.findByDepositTokenId(tokenId),
          api.pricePerShare({ vaultAddress })
        ])
        dispatch({ type: YearnDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnDepositActionType.SET_VAULT, payload: vault })
        dispatch({
          type: YearnDepositActionType.SET_PRICE_PER_SHARE,
          payload: pricePerShare.toString()
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('YearnDeposit error:', error)
      }
    })()
  }, [api, chainAdapter, tokenId, vaultAddress, walletState.wallet])

  const getApproveGasEstimate = async () => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.approveEstimatedGas({
          tokenContractAddress: tokenId,
          userAddress: state.userAddress
        }),
        api.getGasPrice()
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('YearnDeposit:getApproveEstimate error:', error)
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
        api.depositEstimatedGas({
          tokenContractAddress: tokenId,
          amountDesired: bnOrZero(deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress,
          vaultAddress
        }),
        api.getGasPrice()
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('YearnDeposit:getDepositGasEstimate error:', error)
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
    dispatch({ type: YearnDepositActionType.SET_DEPOSIT, payload: formValues })
    try {
      // Check is approval is required for user address
      const _allowance = await api.allowance({
        tokenContractAddress: tokenId!,
        userAddress: state.userAddress
      })
      const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)

      // Skip approval step if user allowance is greater than requested deposit amount
      if (allowance.gt(formValues.cryptoAmount)) {
        const estimatedGasCrypto = await getDepositGasEstimate(formValues)
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnDepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto }
        })
        memoryHistory.push(DepositPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnDepositActionType.SET_APPROVE,
          payload: { estimatedGasCrypto }
        })
        memoryHistory.push(DepositPath.Approve)
      }
    } catch (error) {
      console.error('YearnDeposit:handleContinue error:', error)
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
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      await api.approve({
        tokenContractAddress: tokenId,
        userAddress: state.userAddress,
        wallet: walletState.wallet
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: tokenId!,
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
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto }
      })

      memoryHistory.push(DepositPath.Confirm)
    } catch (error) {
      console.error('YearnDeposit:handleApprove error:', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error'
      })
    } finally {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleDeposit = async () => {
    try {
      if (!state.userAddress || !tokenId || !walletState.wallet) return
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.deposit({
          amountDesired: bnOrZero(state.deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
          vaultAddress,
          wallet: walletState.wallet
        }),
        api.getGasPrice()
      ])
      dispatch({ type: YearnDepositActionType.SET_TXID, payload: txid })
      memoryHistory.push(DepositPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30
      })
      dispatch({
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0)
        }
      })
    } catch (error) {
      console.error('YearnDeposit:handleDeposit error', error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error'
      })
    } finally {
      dispatch({ type: YearnDepositActionType.SET_LOADING, payload: false })
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

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    const apy = state.vault.apy?.net_apy
    const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(apy)
    const annualYieldFiat = annualYieldCrypto.times(marketData.price)

    let statusIcon: React.ReactElement = <ArrowForwardIcon />
    let statusText = StatusTextEnum.pending
    if (state.deposit.txStatus === 'success') {
      statusText = StatusTextEnum.success
      statusIcon = <CheckIcon color='green' />
    }
    if (state.deposit.txStatus === 'failed') {
      statusText = StatusTextEnum.failed
      statusIcon = <CloseIcon color='red' />
    }

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
            loadingText='Approve on Wallet'
            learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
            preFooter={
              <Alert status='info' borderRadius='lg' mt={4} color='blue.500'>
                <FaGasPump />
                <AlertDescription textAlign='left' ml={3} color={alertText}>
                  {translate('modals.approve.depositFee')}
                </AlertDescription>
              </Alert>
            }
            onCancel={handleCancel}
            onConfirm={handleApprove}
          />
        )
      case DepositPath.Confirm:
        return (
          <Confirm
            onCancel={handleCancel}
            onConfirm={handleDeposit}
            headerText='modals.confirm.deposit.header'
            prefooter={<Text color='gray.500' translation='modals.confirm.deposit.preFooter' />}
            assets={[
              {
                ...asset,
                color: '#FF0000',
                cryptoAmount: state.deposit.cryptoAmount,
                fiatAmount: state.deposit.fiatAmount
              },
              {
                ...vaultAsset,
                color: '#FFFFFF',
                cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
                  .div(bnOrZero(state.pricePerShare).div(`1e+${state.vault.decimals}`))
                  .toString(),
                fiatAmount: state.deposit.fiatAmount
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFrom' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <MiddleEllipsis maxWidth='200px'>{state.userAddress}</MiddleEllipsis>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Yearn Finance</Row.Value>
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
            continueText='modals.status.position'
            closeText='modals.status.close'
            assets={[
              {
                ...asset,
                cryptoAmount: state.deposit.cryptoAmount,
                fiatAmount: state.deposit.fiatAmount
              },
              {
                ...vaultAsset,
                cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
                  .div(bnOrZero(state.pricePerShare).div(`1e+${state.vault.decimals}`))
                  .toString(),
                fiatAmount: state.deposit.fiatAmount
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
                    <MiddleEllipsis maxWidth='200px'>{state.txid}</MiddleEllipsis>
                  </Link>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Yearn Finance</Row.Value>
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
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      flexDir={{ base: 'column', lg: 'row' }}
    >
      <YearnRouteSteps routes={routes} />
      <Flex
        flexDir='column'
        width='full'
        minWidth={{ base: 'auto', lg: '450px' }}
        maxWidth={{ base: 'auto', lg: '450px' }}
      >
        {depositRoute && <DefiActionButtons />}
        <Flex direction='column' minWidth='400px'>
          <AnimatePresence exitBeforeEnter initial={false}>
            <Switch location={location} key={location.key}>
              {routes.map(route => {
                return (
                  <Route
                    exact
                    key={route.path}
                    render={() => renderRoute(route)}
                    path={route.path}
                  />
                )
              })}
            </Switch>
          </AnimatePresence>
        </Flex>
      </Flex>
    </Flex>
  )
}
