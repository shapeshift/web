import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup } from '@chakra-ui/react'
import { AssetMarketData } from '@shapeshiftoss/market-service'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

export const AssetActions = ({ asset }: { asset: AssetMarketData }) => {
  const { send, receive } = useModal()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () => (isConnected ? send.open({}) : handleWalletModalOpen())
  const handleReceiveClick = () => (isConnected ? receive.open({ asset }) : handleWalletModalOpen())
  return (
    <ButtonGroup
      ml={{ base: 0, lg: 'auto' }}
      mt={{ base: 6, lg: 0 }}
      width={{ base: 'full', lg: 'auto' }}
    >
      <Button onClick={handleSendClick} isFullWidth leftIcon={<ArrowUpIcon />}>
        Send
      </Button>
      <Button onClick={handleReceiveClick} isFullWidth leftIcon={<ArrowDownIcon />}>
        Receive
      </Button>
    </ButtonGroup>
  )
}
