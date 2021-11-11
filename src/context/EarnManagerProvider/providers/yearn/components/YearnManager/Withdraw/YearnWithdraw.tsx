import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Link, Stack } from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import {
  Asset,
  AssetDataSource,
  ChainTypes,
  ContractTypes,
  NetworkTypes
} from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import isNil from 'lodash/isNil'
import toLower from 'lodash/toLower'
import { useEffect, useReducer } from 'react'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { EarnActionButtons } from 'context/EarnManagerProvider/components/EarnActionButtons'
import { TxStatus } from 'context/EarnManagerProvider/components/TxStatus/TxStatus'
import { Withdraw, WithdrawValues } from 'context/EarnManagerProvider/components/Withdraw/Withdraw'
import { EarnParams, EarnQueryParams } from 'context/EarnManagerProvider/EarnManagerProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'

import { YearnVault, YearnVaultApi } from '../../../api/api'
import { StatusTextEnum, YearnRouteSteps } from '../../YearnRouteSteps'
import { initialState, reducer, YearnWithdrawActionType } from './WithdrawReducer'

enum WithdrawPath {
  Withdraw = '/withdraw',
  Confirm = '/withdraw/confirm',
  ConfirmSettings = '/withdraw/confirm/settings',
  Status = '/withdraw/status'
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Withdraw Amount' },
  { step: 1, path: WithdrawPath.Confirm, label: 'Confirm Withdraw' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: WithdrawPath.Status, label: 'Status' }
]

type YearnWithdrawProps = {
  api: YearnVaultApi
}

// TODO: Remove when vaults are added to asset service
const makeVaultAsset = (vault: YearnVault): Asset => {
  return {
    chain: ChainTypes.Ethereum,
    color: '#FFFFFF',
    contractType: ContractTypes.ERC20,
    dataSource: AssetDataSource.CoinGecko,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    icon: vault.icon,
    name: vault.name,
    network: NetworkTypes.MAINNET,
    precision: vault.decimals,
    receiveSupport: true,
    secondaryColor: '#FFFFFF',
    sendSupport: true,
    slip44: 60,
    symbol: vault.symbol,
    tokenId: vault.address,
    caip19: caip19.toCAIP19({
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET,
      tokenId: vault.address,
      contractType: ContractTypes.ERC20
    })
  }
}

export const YearnWithdraw = ({ api }: YearnWithdrawProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history: browserHistory } = useBrowserRouter<EarnQueryParams, EarnParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  // Asset info
  const underlyingAsset = useFetchAsset({ chain, tokenId })
  const asset = useFetchAsset({ chain, tokenId: vaultAddress })
  const marketData = useMarketData({ chain, tokenId })
  const feeAsset = useFetchAsset({ chain })
  const feeMarketData = useMarketData({ chain })

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const { state: walletState } = useWallet()
  const { balances, loading } = useFlattenedBalances()

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
          dryRun: true,
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
        fn: () =>
          api.getTxReceipt({
            txid
          }),
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

  const handleViewPosition = () => {}

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const balance = balances[toLower(vaultAddress)]?.balance

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const hasValidBalance = crypto.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const fiat = crypto.times(marketData.price)
    const hasValidBalance = fiat.gte(value)
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
                ...makeVaultAsset(state.vault),
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
                <Row.Value fontWeight='bold'>Yearn Finance</Row.Value>
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
            continueText='modals.status.continue'
            closeText='modals.status.close'
            statusText={statusText}
            statusIcon={statusIcon}
            assets={[
              {
                ...makeVaultAsset(state.vault),
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
                  <Link href='http://google.com' isExternal color='blue.500' fontWeight='bold'>
                    <MiddleEllipsis maxWidth='200px'>{state.txid}</MiddleEllipsis>
                  </Link>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFrom' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Year Finance</Row.Value>
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
        {withdrawRoute && <EarnActionButtons />}
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
