import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Link, Stack } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { EarnActionButtons } from 'context/EarnManagerProvider/components/EarnActionButtons'
import { Withdraw, WithdrawValues } from 'context/EarnManagerProvider/components/Withdraw/Withdraw'
import { EarnParams, EarnQueryParams } from 'context/EarnManagerProvider/EarnManagerProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { YearnVaultApi } from '../../api/api'
import { YearnRouteSteps } from '../YearnRouteSteps'

enum WithdrawPath {
  Withdraw = '/withdraw',
  Confirm = '/withdraw/confirm',
  ConfirmSettings = '/withdraw/confirm/settings',
  Broadcast = '/withdraw/broadcast'
}

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Withdraw Amount' },
  { step: 1, path: WithdrawPath.Confirm, label: 'Confirm Withdraw' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: WithdrawPath.Broadcast, label: 'Broadcast' }
]

type YearnWithdrawProps = {
  api: YearnVaultApi
}

export const YearnWithdraw = ({ api }: YearnWithdrawProps) => {
  const [apy, setApy] = useState('0')
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [, /* values */ setValues] = useState<WithdrawValues>({} as WithdrawValues)
  const { query, history: browserHistory } = useBrowserRouter<EarnQueryParams, EarnParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  // Asset info
  const asset = useFetchAsset({ chain, tokenId })
  const marketData = useMarketData({ chain, tokenId })

  // user info
  const chainAdapterManager = useChainAdapters()
  const { state: walletState } = useWallet()
  const { balances, loading } = useFlattenedBalances()

  // navigation
  const memoryHistory = useHistory()
  const location = useLocation()
  const WithdrawRoute = matchPath(location.pathname, { path: WithdrawPath.Withdraw, exact: true })

  useEffect(() => {
    ;(async () => {
      if (!walletState.wallet) return
      const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
      setUserAddress(await chainAdapter.getAddress({ wallet: walletState.wallet }))
    })()
  }, [chain, chainAdapterManager, walletState])

  useEffect(() => {
    ;(async () => {
      try {
        const apy = await api.apy({ vaultAddress })
        setApy(apy)
      } catch (error) {
        // TODO: handle client side errors
        console.error('error', error)
      }
    })()
  }, [api, vaultAddress])

  const handleContinue = async (formValues: WithdrawValues) => {
    setValues(formValues)
    memoryHistory.push(WithdrawPath.Confirm)
  }

  const handleConfirm = async () => {
    memoryHistory.push(WithdrawPath.Broadcast)
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
    switch (route.path) {
      case WithdrawPath.Withdraw:
        return (
          <Withdraw
            asset={asset}
            apy={apy}
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

      case WithdrawPath.Confirm:
        return (
          <Confirm
            onCancel={handleCancel}
            headerText='modals.confirm.withdraw.header'
            onConfirm={handleConfirm}
            assets={[
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.withdrawFrom' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Year Finance</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value>
                  <MiddleEllipsis maxWidth='200px'>{userAddress}</MiddleEllipsis>
                </Row.Value>
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
            </Stack>
          </Confirm>
        )
      case WithdrawPath.Broadcast:
        return (
          <BroadcastTx
            onClose={handleCancel}
            onContinue={handleViewPosition}
            loading={true}
            continueText='modals.broadcast.continue'
            closeText='modals.broadcast.close'
            statusText='modals.broadcast.header.pending'
            statusIcon={<ArrowForwardIcon />}
            assets={[
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...asset,
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
                  <Link href='http://google.com' isExternal color='blue.500' fontWeight='bold'>
                    <MiddleEllipsis maxWidth='200px'>
                      0x73060cb15ae5b6a5edc71c3b8b49dd20746240990d0a1047481b4218c690ad1c
                    </MiddleEllipsis>
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
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>
                  <MiddleEllipsis maxWidth='200px'>{userAddress}</MiddleEllipsis>
                </Row.Value>
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
        {WithdrawRoute && <EarnActionButtons />}
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
