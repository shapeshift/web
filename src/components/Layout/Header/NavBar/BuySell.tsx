import { Button, IconButton, useMediaQuery } from '@chakra-ui/react'
import { BuySellIcon } from 'components/Icons/Buysell'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { breakpoints } from 'theme/theme'

export const BuySell = () => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { buysell } = useModal()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleModalOpen = () => (isConnected ? buysell.open({}) : handleWalletModalOpen())
  return isLargerThanMd ? (
    <Button
      leftIcon={<BuySellIcon color='inherit' />}
      colorScheme='blue'
      onClick={handleModalOpen}
      variant='ghost'
      mr={2}
    >
      <Text translation='buysell.headerLabel' />
    </Button>
  ) : (
    <IconButton
      icon={<BuySellIcon color='inherit' />}
      aria-label='buysell.headerLabel'
      onClick={handleModalOpen}
      rounded='full'
      mr={2}
    />
  )
}
