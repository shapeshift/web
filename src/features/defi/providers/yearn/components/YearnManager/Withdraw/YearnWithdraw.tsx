import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Link, Stack } from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { Confirm } from 'features/defi/components/Confirm/Confirm'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { Withdraw, WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import {
  DefiParams,
  DefiQueryParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { AnimatePresence } from 'framer-motion'
import isNil from 'lodash/isNil'
import { useEffect, useReducer } from 'react'
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
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioLoading
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { YearnVaultApi } from '../../../api/api'
import { StatusTextEnum, YearnRouteSteps } from '../../YearnRouteSteps'
import { initialState, reducer, YearnWithdrawActionType } from './WithdrawReducer'

enum WithdrawPath {
  Withdraw = '/withdraw',
  Confirm = '/withdraw/confirm',
  ConfirmSettings = '/withdraw/confirm/settings',
  Status = '/withdraw/status'
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Withdrawal Amount' },
  { step: 1, path: WithdrawPath.Confirm, label: 'Confirm Withdraw' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: WithdrawPath.Status, label: 'Status' }
]

type YearnWithdrawProps = {
  api: YearnVaultApi
}

export const YearnWithdraw = ({ api }: YearnWithdrawProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  // Asset info
  const underlyingAssetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
  const underlyingAsset = useAppSelector(state => selectAssetByCAIP19(state, underlyingAssetCAIP19))
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: vaultAddress })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetCAIP19))
  const feeAssetCAIP19 = caip19.toCAIP19({ chain, network })
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const { state: walletState } = useWallet()
  const balance = useAppSelector(state => selectPortfolioCryptoBalanceByAssetId(state, assetCAIP19))
  const loading = useSelector(selectPortfolioLoading)

  // navigation
  const memoryHistory = useHistory()
  const location = useLocation()
  const withdrawRoute = matchPath(location.pathname, { path: WithdrawPath.Withdraw, exact: true })

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !tokenId) return
        const [address, vault, pricePerShare] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.findByDepositTokenId(tokenId),
          api.pricePerShare({ vaultAddress })
        ])
        dispatch({ type: YearnWithdrawActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnWithdrawActionType.SET_VAULT, payload: vault })
        dispatch({
          type: YearnWithdrawActionType.SET_PRICE_PER_SHARE,
          payload: pricePerShare.toString()
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('YearnWithdraw error:', error)
      }
    })()
  }, [api, chainAdapter, tokenId, vaultAddress, walletState.wallet])

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.withdrawEstimatedGas({
          tokenContractAddress: tokenId,
          vaultAddress,
          amountDesired: bnOrZero(withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress
        }),
        api.getGasPrice()
      ])
      const returVal = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
      return returVal
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('YearnWithdraw:getWithdrawGasEstimate error:', error)
    }
  }

  const handleContinue = async (formValues: WithdrawValues) => {
    if (!state.userAddress) return
    // set withdraw state for future use
    dispatch({ type: YearnWithdrawActionType.SET_WITHDRAW, payload: formValues })

    const estimatedGasCrypto = await getWithdrawGasEstimate(formValues)
    if (!estimatedGasCrypto) return
    dispatch({
      type: YearnWithdrawActionType.SET_WITHDRAW,
      payload: { estimatedGasCrypto }
    })

    memoryHistory.push(WithdrawPath.Confirm)
  }

  const handleConfirm = async () => {
    try {
      if (!state.userAddress || !tokenId || !walletState.wallet) return
      dispatch({ type: YearnWithdrawActionType.SET_LOADING, payload: true })
      const [txid, gasPrice] = await Promise.all([
        api.withdraw({
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
          vaultAddress,
          wallet: walletState.wallet,
          amountDesired: bnOrZero(state.withdraw.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0)
        }),
        api.getGasPrice()
      ])
      dispatch({ type: YearnWithdrawActionType.SET_TXID, payload: txid })
      memoryHistory.push(WithdrawPath.Status)

      const transactionReceipt = await poll({
        fn: () => api.getTxReceipt({ txid }),
        validate: (result: TransactionReceipt) => !isNil(result),
        interval: 15000,
        maxAttempts: 30
      })
      dispatch({
        type: YearnWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0)
        }
      })
      dispatch({ type: YearnWithdrawActionType.SET_LOADING, payload: false })
    } catch (error) {
      console.error('YearnWithdraw:handleConfirm error', error)
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
  const pricePerShare = bnOrZero(state.pricePerShare).div(`1e+${asset?.precision}`)
  const vaultTokenPrice = pricePerShare.times(marketData.price)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(vaultTokenPrice)

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    let statusIcon: React.ReactElement = <ArrowForwardIcon />
    let statusText = StatusTextEnum.pending
    if (state.withdraw.txStatus === 'success') {
      statusText = StatusTextEnum.success
      statusIcon = <CheckIcon color='green' />
    }
    if (state.withdraw.txStatus === 'failed') {
      statusText = StatusTextEnum.failed
      statusIcon = <CloseIcon color='red' />
    }

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
            marketData={{
              // The vault asset doesnt have market data.
              // We're making our own market data object for the withdraw view
              price: vaultTokenPrice.toString(),
              marketCap: '0',
              volume: '0',
              changePercent24Hr: 0
            }}
            onCancel={handleCancel}
            onContinue={handleContinue}
            percentOptions={[0.25, 0.5, 0.75, 1]}
            enableSlippage={false}
          />
        )

      case WithdrawPath.Confirm:
        return (
          <Confirm
            onCancel={handleCancel}
            headerText='modals.confirm.withdraw.header'
            onConfirm={handleConfirm}
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
                cryptoAmount: bnOrZero(state.withdraw.cryptoAmount)
                  .times(bnOrZero(state.pricePerShare).div(`1e+${asset.precision}`))
                  .toString(),
                fiatAmount: state.withdraw.fiatAmount
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFrom' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <Text translation='defi.yearn' />
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawTo' />
                </Row.Label>
                <Row.Value>
                  <MiddleEllipsis maxWidth='200px'>{state.userAddress}</MiddleEllipsis>
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
            statusIcon={statusIcon}
            assets={[
              {
                ...asset,
                cryptoAmount: state.withdraw.cryptoAmount,
                fiatAmount: state.withdraw.fiatAmount
              },
              {
                ...underlyingAsset,
                cryptoAmount: bnOrZero(state.withdraw.cryptoAmount)
                  .times(bnOrZero(state.pricePerShare).div(`1e+${asset.precision}`))
                  .toString(),
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
                    <MiddleEllipsis maxWidth='200px'>{state.txid}</MiddleEllipsis>
                  </Link>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFrom' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Yearn Finance</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <MiddleEllipsis maxWidth='200px'>{state.userAddress}</MiddleEllipsis>
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
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      flexDir={{ base: 'column', lg: 'row' }}
    >
      <YearnRouteSteps routes={routes} />
      <Flex flexDir='column' width='full' minWidth='400px'>
        {withdrawRoute && <DefiActionButtons />}
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
