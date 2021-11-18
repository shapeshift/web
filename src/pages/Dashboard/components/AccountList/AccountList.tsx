import { Flex, Grid, Stack } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { NetworkTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { LoadingRow } from 'components/AccountRow/LoadingRow'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { usePortfolio } from 'pages/Dashboard/contexts/PortfolioContext'
import { sortByFiat } from 'pages/Dashboard/helpers/sortByFiat/sortByFiat'
import { ReduxState } from 'state/reducer'
import { fetchAssets } from 'state/slices/assetsSlice/assetsSlice'

export const AccountList = ({ loading }: { loading?: boolean }) => {
  const dispatch = useDispatch()
  const assets = useSelector((state: ReduxState) => state.assets)
  const marketData = useSelector((state: ReduxState) => state.marketData.marketData)
  const { balances, totalBalance } = usePortfolio()
  const { receive } = useModal()
  const {
    state: { isConnected },
    dispatch: walletDispatch
  } = useWallet()
  const emptyAccounts = new Array(5).fill(null)

  useEffect(() => {
    // arbitrary number to just make sure we dont fetch all assets if we already have
    if (Object.keys(assets).length < 100) {
      dispatch(fetchAssets({ network: NetworkTypes.MAINNET }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accounts = useMemo(() => {
    return Object.keys(balances)
      .sort(sortByFiat({ balances, assets, marketData }))
      .filter(key => bnOrZero(balances[key].balance).gt(0))
  }, [assets, balances, marketData])

  const accountRows = useMemo(() => {
    if (accounts.length === 0) {
      const handleWalletModalOpen = () =>
        walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      const handleReceiveClick = () => (isConnected ? receive.open({}) : handleWalletModalOpen())
      return (
        <Card textAlign='center' py={6} boxShadow='none' borderWidth={0}>
          <Card.Body>
            <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
              <IconCircle fontSize='2xl' boxSize='16'>
                <DashboardIcon />
              </IconCircle>
            </Flex>
            <Text
              fontWeight='medium'
              fontSize='lg'
              mb={2}
              color='gray.500'
              translation='dashboard.portfolio.empty.title'
            />
            <Button variant='ghost' colorScheme='blue' onClick={handleReceiveClick}>
              <Text translation='dashboard.portfolio.empty.cta' />
            </Button>
          </Card.Body>
        </Card>
      )
    }

    return (
      <>
        {Object.keys(balances)
          .sort(sortByFiat({ balances, assets, marketData }))
          .filter(key => bnOrZero(balances[key].balance).gt(0))
          .map(key => {
            const account = balances[key]
            const asset = assets[key]
            const balance = asset
              ? bnOrZero(account.balance).div(`1e+${asset.precision}`)
              : bnOrZero(0)
            const market = marketData[key]
            const fiatValue = balance.times(bnOrZero(market?.price)).toNumber()

            return (
              <AccountRow
                allocationValue={bnOrZero(fiatValue)
                  .div(bnOrZero(totalBalance))
                  .times(100)
                  .toNumber()}
                key={account.contract ?? account.chain}
                balance={account.balance ?? '0'}
                chain={account.chain}
                tokenId={account.contract}
              />
            )
          })}
      </>
    )
  }, [
    accounts.length,
    assets,
    balances,
    isConnected,
    marketData,
    receive,
    totalBalance,
    walletDispatch
  ])

  return (
    <Stack>
      {accounts.length > 0 && (
        <Grid
          templateColumns={{
            base: '1fr repeat(1, 1fr)',
            md: '1fr repeat(2, 1fr)',
            lg: '2fr repeat(3, 1fr) 150px'
          }}
          gap='1rem'
          py={4}
          pl={4}
          pr={4}
        >
          <Text translation='dashboard.portfolio.asset' color='gray.500' />
          <Text
            translation='dashboard.portfolio.balance'
            display={{ base: 'none', md: 'block' }}
            color='gray.500'
            textAlign='right'
          />
          <Text
            translation='dashboard.portfolio.price'
            color='gray.500'
            textAlign='right'
            display={{ base: 'none', lg: 'block' }}
          />
          <Text translation='dashboard.portfolio.value' textAlign='right' color='gray.500' />
          <Text
            translation='dashboard.portfolio.allocation'
            color='gray.500'
            textAlign='right'
            display={{ base: 'none', lg: 'block' }}
          />
        </Grid>
      )}

      {loading ? (
        <Stack>
          {emptyAccounts.map((row, index) => (
            <LoadingRow key={index} />
          ))}
        </Stack>
      ) : (
        accountRows
      )}
    </Stack>
  )
}
