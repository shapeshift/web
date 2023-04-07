import { List } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Main } from 'components/Layout/Main'
import { DashboardHeader } from 'pages/Dashboard/components/DashboardHeader'
import { selectPortfolioChainIdsSortedFiat } from 'state/slices/selectors'

import { ChainRow } from './components/ChainRow'

// const AccountHeader = () => {
//   const translate = useTranslate()
//   const {
//     state: { wallet },
//   } = useWallet()
//   const [isMultiAccountWallet, setIsMultiAccountWallet] = useState<boolean>(false)

//   useEffect(() => {
//     if (!wallet) return
//     setIsMultiAccountWallet(wallet.supportsBip44Accounts())
//   }, [wallet])

//   const { addAccount } = useModal()
//   const { open } = addAccount

//   return (
//     <Stack direction='row' justifyContent='space-between' alignItems='center' pb={6}>
//       <SEO title={translate('accounts.accounts')} />
//       <Heading>
//         <Text translation='accounts.accounts' />
//       </Heading>
//       {isMultiAccountWallet && (
//         <Button
//           loadingText={translate('accounts.addAccount')}
//           leftIcon={<AddIcon />}
//           colorScheme='blue'
//           onClick={open}
//           data-test='add-account-button'
//         >
//           <Text translation='accounts.addAccount' />
//         </Button>
//       )}
//     </Stack>
//   )
// }

export const Accounts = () => {
  const portfolioChainIdsSortedFiat = useSelector(selectPortfolioChainIdsSortedFiat)
  const chainRows = useMemo(
    () => portfolioChainIdsSortedFiat.map(chainId => <ChainRow key={chainId} chainId={chainId} />),
    [portfolioChainIdsSortedFiat],
  )

  return (
    <Main headerComponent={<DashboardHeader />}>
      <List ml={0} mt={0} spacing={4}>
        {chainRows}
      </List>
    </Main>
  )
}
