import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Link, Stack, Tag, useToast } from '@chakra-ui/react'
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
import { useEffect, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { Approve } from 'context/EarnManagerProvider/components/Approve/Approve'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Deposit, DepositValues } from 'context/EarnManagerProvider/components/Deposit/Deposit'
import { EarnActionButtons } from 'context/EarnManagerProvider/components/EarnActionButtons'
import { TxStatus } from 'context/EarnManagerProvider/components/TxStatus/TxStatus'
import { EarnParams, EarnQueryParams } from 'context/EarnManagerProvider/EarnManagerProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'

import { YearnVault, YearnVaultApi } from '../../../api/api'
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

export const YearnDeposit = ({ api }: YearnDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history: browserHistory } = useBrowserRouter<EarnQueryParams, EarnParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  // Asset info
  const asset = useFetchAsset({ chain, tokenId })
  const marketData = useMarketData({ chain, tokenId })
  const feeAsset = useFetchAsset({ chain })
  const feeMarketData = useMarketData({ chain })
  // TODO: Add vaults to asset service
  // const vaultAsset = useFetchAsset({ chain, tokenId: '' })

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const { state: walletState } = useWallet()
  const { balances, loading } = useFlattenedBalances()

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
          spenderAddress: vaultAddress,
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
          vaultAddress,
          amountDesired: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`),
          userAddress: state.userAddress
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
        spenderAddress: vaultAddress,
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
        spenderAddress: vaultAddress,
        tokenContractAddress: tokenId,
        userAddress: state.userAddress,
        wallet: walletState.wallet
      })
      await poll({
        fn: () =>
          api.allowance({
            tokenContractAddress: tokenId!,
            spenderAddress: vaultAddress,
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
          tokenContractAddress: tokenId,
          userAddress: state.userAddress,
          vaultAddress,
          wallet: walletState.wallet,
          amountDesired: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`)
        }),
        api.getGasPrice()
      ])
      dispatch({ type: YearnDepositActionType.SET_TXID, payload: txid })
      memoryHistory.push(DepositPath.Status)

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
        type: YearnDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: transactionReceipt.status === true ? 'success' : 'failed',
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0)
        }
      })
    } catch (error) {
      console.error('YearnDeposit:handleConfirm error', error)
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
    // TODO: go to position view.
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  const balance = balances[tokenId ?? chain]?.balance

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
                ...makeVaultAsset(state.vault),
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
            continueText='modals.status.continue'
            closeText='modals.status.close'
            assets={[
              {
                ...asset,
                cryptoAmount: state.deposit.cryptoAmount,
                fiatAmount: state.deposit.fiatAmount
              },
              {
                ...makeVaultAsset(state.vault),
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

  if (loading || !asset || !marketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

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
        {depositRoute && <EarnActionButtons />}
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
