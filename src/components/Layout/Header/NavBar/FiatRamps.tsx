import { Button } from '@chakra-ui/react'
import { BuySellIcon } from 'components/Icons/BuySell'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const FiatRamps = () => {
  const { fiatRamps } = useModal()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <Button
      leftIcon={<BuySellIcon color='inherit' />}
      data-test='fiat-ramps-button'
      colorScheme='blue'
      width='full'
      onClick={() => (isConnected ? fiatRamps.open({}) : handleWalletModalOpen())}
      variant='ghost-filled'
      justifyContent={{ base: 'flex-start', md: 'center' }}
    >
      <Text translation='fiatRamps.headerLabel' />
    </Button>
  )
}
