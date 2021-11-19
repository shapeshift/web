import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Skeleton } from '@chakra-ui/react'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useAsset } from 'pages/Assets/Asset'

export const AssetActions = ({ isLoaded }: { isLoaded: boolean }) => {
  const { asset, marketData } = useAsset()
  const { send, receive } = useModal()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const _asset = { asset: { ...asset, ...marketData } }
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () => (isConnected ? send.open(_asset) : handleWalletModalOpen())
  const handleReceiveClick = () => (isConnected ? receive.open(_asset) : handleWalletModalOpen())

  return (
    <ButtonGroup
      ml={{ base: 0, lg: 'auto' }}
      mt={{ base: 6, lg: 0 }}
      width={{ base: 'full', lg: 'auto' }}
    >
      <Skeleton isLoaded={isLoaded} width={{ base: 'full', lg: 'auto' }}>
        <Button onClick={handleSendClick} isFullWidth leftIcon={<ArrowUpIcon />}>
          Send
        </Button>
      </Skeleton>
      <Skeleton isLoaded={isLoaded} width={{ base: 'full', lg: 'auto' }}>
        <Button onClick={handleReceiveClick} isFullWidth leftIcon={<ArrowDownIcon />}>
          Receive
        </Button>
      </Skeleton>
    </ButtonGroup>
  )
}
