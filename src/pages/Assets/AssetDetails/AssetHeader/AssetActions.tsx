import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Skeleton } from '@chakra-ui/react'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

export const AssetActions = ({
  asset,
  isLoaded,
  currentScriptType
}: {
  asset: AssetMarketData
  isLoaded: boolean
  currentScriptType?: BTCInputScriptType
}) => {
  const { send, receive } = useModal()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () =>
    isConnected ? send.open({ asset, currentScriptType }) : handleWalletModalOpen()
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset, currentScriptType }) : handleWalletModalOpen()

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
