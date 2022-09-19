import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getLocalWalletType } from 'context/WalletProvider/local-wallet'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectIsTxHistoryLoading, selectPortfolioChainIdsSortedFiat } from 'state/slices/selectors'

import { ChainRow } from './components/ChainRow'

// TODO(0xdef1cafe): delete me once hdwallet supports this concept
const isMultiAccountSupportedWallet = (wallet: HDWallet | null): boolean => {
  if (!wallet) return false
  switch (getLocalWalletType()) {
    /**
     * currently - these are the only wallets that support the concept of multi account.
     * there may be some WalletConnect wallets that do, but we can't interrogate the underlying wallet
     * that WalletConnect is proxying to us.
     */
    case KeyManager.Native:
    case KeyManager.KeepKey:
      return true
    default:
      return false
  }
}

const AccountHeader = () => {
  const translate = useTranslate()
  const isMultiAccountEnabled = useFeatureFlag('MultiAccounts')
  const {
    state: { wallet },
  } = useWallet()
  const [isMultiChainWallet, setIsMultiChainWallet] = useState<boolean>(false)
  const isTxHistoryLoading = useSelector(selectIsTxHistoryLoading)

  useEffect(() => {
    if (!wallet) return
    setIsMultiChainWallet(isMultiAccountSupportedWallet(wallet))
  }, [wallet])

  const { addAccount } = useModal()
  const { open } = addAccount

  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center' pb={6}>
      <Heading>
        <Text translation='accounts.accounts' />
      </Heading>
      {isMultiAccountEnabled && isMultiChainWallet && (
        <Button
          isLoading={isTxHistoryLoading}
          loadingText={translate('accounts.addAccount')}
          leftIcon={<AddIcon />}
          colorScheme='blue'
          onClick={open}
          disabled={isTxHistoryLoading}
        >
          <Text translation='accounts.addAccount' />
        </Button>
      )}
    </Stack>
  )
}

export const Accounts = () => {
  const portfolioChainIdsSortedFiat = useSelector(selectPortfolioChainIdsSortedFiat)
  const chainRows = useMemo(
    () => portfolioChainIdsSortedFiat.map(chainId => <ChainRow key={chainId} chainId={chainId} />),
    [portfolioChainIdsSortedFiat],
  )

  return (
    <Main titleComponent={<AccountHeader />}>
      <List ml={0} mt={0} spacing={4}>
        {chainRows}
      </List>
    </Main>
  )
}
