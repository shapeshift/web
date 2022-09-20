import { AddIcon } from '@chakra-ui/icons'
import { Button, Heading, List, Stack } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectIsTxHistoryLoading, selectPortfolioChainIdsSortedFiat } from 'state/slices/selectors'

import { ChainRow } from './components/ChainRow'

const AccountHeader = () => {
  const translate = useTranslate()
  const isMultiAccountEnabled = useFeatureFlag('MultiAccounts')
  const {
    state: { wallet },
  } = useWallet()
  const [isMultiAccountWallet, setIsMultiAccountWallet] = useState<boolean>(false)
  const isTxHistoryLoading = useSelector(selectIsTxHistoryLoading)

  useEffect(() => {
    if (!wallet) return
    setIsMultiAccountWallet(wallet.supportsBip44Accounts())
  }, [wallet])

  const { addAccount } = useModal()
  const { open } = addAccount

  return (
    <Stack direction='row' justifyContent='space-between' alignItems='center' pb={6}>
      <Heading>
        <Text translation='accounts.accounts' />
      </Heading>
      {isMultiAccountEnabled && isMultiAccountWallet && (
        <Button
          isLoading={isTxHistoryLoading}
          loadingText={translate('accounts.addAccount')}
          leftIcon={<AddIcon />}
          colorScheme='blue'
          onClick={open}
          data-test='add-account-button'
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
