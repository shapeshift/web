import { Stack } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { LoadingRow } from 'components/AccountRow/LoadingRow'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'
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

  const accountRows = useMemo(() => {
    const accounts = Object.keys(balances)
      .sort(sortByFiat({ balances, assets, marketData }))
      .filter(key => bnOrZero(balances[key].balance).gt(0))
    if (accounts.length === 0) {
      const handleWalletModalOpen = () =>
        walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      const handleReceiveClick = () =>
        isConnected ? receive.open({} as Asset) : handleWalletModalOpen()
      return (
        <Card textAlign='center' py={6} boxShadow='none'>
          <Card.Body>
            <RawText>No assets yet.</RawText>
            <Button onClick={handleReceiveClick}>Receieve some funds</Button>
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
  }, [assets, balances, marketData, totalBalance])

  return loading ? (
    <Stack>
      {emptyAccounts.map(index => (
        <LoadingRow key={index} />
      ))}
    </Stack>
  ) : (
    accountRows
  )
}
