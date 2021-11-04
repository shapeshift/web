import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Link, Stack, Tag } from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { Asset, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect, useReducer } from 'react'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { Approve } from 'context/EarnManagerProvider/components/Approve/Approve'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Deposit, DepositValues } from 'context/EarnManagerProvider/components/Deposit/Deposit'
import { EarnActionButtons } from 'context/EarnManagerProvider/components/EarnActionButtons'
import { EarnParams, EarnQueryParams } from 'context/EarnManagerProvider/EarnManagerProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { poll } from 'lib/poll/poll'

import { YearnVault, YearnVaultApi } from '../../api/api'
import { YearnRouteSteps } from '../YearnRouteSteps'

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

type YearnDepositProps = {
  api: YearnVaultApi
}

type EstimatedGas = {
  estimatedGasCrypto?: string
}

type YearnDepositValues = DepositValues & EstimatedGas

export type YearnDepositState = {
  vault: YearnVault
  userAddress: string | null
  approve: EstimatedGas
  deposit: YearnDepositValues
  loading: boolean
  pricePerShare: string
  txid: string | null
}

const initialState: YearnDepositState = {
  txid: null,
  vault: { apy: { net_apy: 0 } } as YearnVault,
  userAddress: null,
  loading: false,
  approve: {},
  pricePerShare: '',
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: ''
  }
}

export enum YearnActionType {
  SET_VAULT = 'SET_VAULT',
  SET_APPROVE = 'SET_APPROVE',
  SET_USER_ADDRESS = 'SET_USER_ADDRESS',
  SET_DEPOSIT = 'SET_DEPOSIT',
  SET_LOADING = 'SET_LOADING',
  SET_PRICE_PER_SHARE = 'SET_PRICE_PER_SHARE',
  SET_TXID = 'SET_TXID'
}

type SetVaultAction = {
  type: YearnActionType.SET_VAULT
  payload: YearnVault
}

type SetApprove = {
  type: YearnActionType.SET_APPROVE
  payload: EstimatedGas
}

type SetDeposit = {
  type: YearnActionType.SET_DEPOSIT
  payload: Partial<YearnDepositValues>
}

type SetUserAddress = {
  type: YearnActionType.SET_USER_ADDRESS
  payload: string
}

type SetLoading = {
  type: YearnActionType.SET_LOADING
  payload: boolean
}

type SetPricePerShare = {
  type: YearnActionType.SET_PRICE_PER_SHARE
  payload: string
}

type SetTxid = {
  type: YearnActionType.SET_TXID
  payload: string
}

type YearnDepositActions =
  | SetVaultAction
  | SetApprove
  | SetDeposit
  | SetUserAddress
  | SetLoading
  | SetPricePerShare
  | SetTxid

const reducer = (state: YearnDepositState, action: YearnDepositActions) => {
  switch (action.type) {
    case YearnActionType.SET_VAULT:
      return { ...state, vault: { ...state.vault, ...action.payload } }
    case YearnActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case YearnActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case YearnActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case YearnActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}

// TODO: Remove when vaults are added to asset service
const makeVaultAsset = (vault: YearnVault): Asset => {
  if (!vault) return {} as Asset
  return {
    chain: ChainTypes.Ethereum,
    color: '#FFFFFF',
    contractType: ContractTypes.ERC20,
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

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !tokenId) return
        const [address, vault, pricePerShare] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.findByDepositTokenId(tokenId),
          api.pricePerShare({ vaultAddress })
        ])
        dispatch({ type: YearnActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnActionType.SET_VAULT, payload: vault })
        dispatch({ type: YearnActionType.SET_PRICE_PER_SHARE, payload: pricePerShare.toString() })
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
      // TODO: handle client side errors maybe add a toast?
      console.error('YearnDeposit:getApproveEstimate error:', error)
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
      // TODO: handle client side errors maybe add a toast?
      console.error('YearnDeposit:getDepositGasEstimate error:', error)
    }
  }

  const handleContinue = async (formValues: DepositValues) => {
    if (!state.userAddress) return
    // set deposit state for future use
    dispatch({ type: YearnActionType.SET_DEPOSIT, payload: formValues })
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
          type: YearnActionType.SET_DEPOSIT,
          payload: { estimatedGasCrypto }
        })

        memoryHistory.push(DepositPath.Confirm)
      } else {
        const estimatedGasCrypto = await getApproveGasEstimate()
        if (!estimatedGasCrypto) return
        dispatch({
          type: YearnActionType.SET_APPROVE,
          payload: { estimatedGasCrypto }
        })

        memoryHistory.push(DepositPath.Approve)
      }
    } catch (error) {
      // TODO: handle client side errors maybe add a toast?
      console.error('YearnDeposit:handleContinue error:', error)
    }
  }

  const handleApprove = async () => {
    if (!tokenId || !state.userAddress || !walletState.wallet) return
    try {
      dispatch({ type: YearnActionType.SET_LOADING, payload: true })
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
        type: YearnActionType.SET_DEPOSIT,
        payload: { estimatedGasCrypto }
      })

      memoryHistory.push(DepositPath.Confirm)
    } catch (error) {
      // TODO: handle client side errors
      console.error('YearnDeposit:handleApprove error:', error)
    } finally {
      dispatch({ type: YearnActionType.SET_LOADING, payload: false })
    }
  }

  const handleConfirm = async () => {
    try {
      if (!state.userAddress || !tokenId || !walletState.wallet) return
      dispatch({ type: YearnActionType.SET_LOADING, payload: true })
      const txid = await api.deposit({
        tokenContractAddress: tokenId,
        userAddress: state.userAddress,
        vaultAddress,
        wallet: walletState.wallet,
        amountDesired: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`)
      })
      dispatch({ type: YearnActionType.SET_TXID, payload: txid })
      memoryHistory.push(DepositPath.Status)

      // TODO: finish status screen
      // await poll({})
      // dispatch({ type: YearnActionType.SET_LOADING, payload: false })
      // set stepper status if error else step one step forward
    } catch (error) {
      console.error('YearnDeposit:handleConfirm error', error)
    }
  }

  const handleViewPosition = () => {}

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

    switch (route.path) {
      case DepositPath.Deposit:
        return (
          <Deposit
            asset={asset}
            apy={String(state.vault.apy?.net_apy)}
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
            onConfirm={handleConfirm}
            prefooter={<Text color='gray.500' translation='modals.confirm.preFooter' />}
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
                    <Amount.Percent value={state.vault.apy.net_apy} />
                  </Tag>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedReturns' />
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
          <BroadcastTx
            onClose={handleCancel}
            onContinue={handleViewPosition}
            loading={state.loading}
            statusText='modals.broadcast.header.pending'
            statusIcon={<ArrowForwardIcon />}
            assets={[
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...makeVaultAsset(state.vault),
                cryptoAmount: '100',
                fiatAmount: '100'
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.broadcast.transactionId' />
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
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='30.00' />
                    <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.averageApr' />
                </Row.Label>
                <Tag colorScheme='green'>
                  <Amount.Percent value={state.vault.apy.net_apy} />
                </Tag>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedReturns' />
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
          </BroadcastTx>
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
      <Flex flexDir='column' width='full' minWidth='400px'>
        {depositRoute && <EarnActionButtons />}
        <Switch>
          {routes.map(route => {
            return (
              <Route exact key={route.path} render={() => renderRoute(route)} path={route.path} />
            )
          })}
        </Switch>
      </Flex>
    </Flex>
  )
}
