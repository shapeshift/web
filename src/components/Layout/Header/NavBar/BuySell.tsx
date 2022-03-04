import { Button } from '@chakra-ui/react'
import { BuySellIcon } from 'components/Icons/Buysell'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

export const BuySell = () => {
  const { fiatRamps } = useModal()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleModalOpen = () => (isConnected ? fiatRamps.open({}) : handleWalletModalOpen())
  return (
    <Button
      leftIcon={<BuySellIcon color='inherit' />}
      colorScheme='blue'
      width='full'
      onClick={handleModalOpen}
      variant='ghost'
      mr={2}
    >
      <Text translation='buysell.headerLabel' />
    </Button>
  )
}
