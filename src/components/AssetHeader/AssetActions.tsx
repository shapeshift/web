import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Skeleton } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

type AssetActionProps = {
  isLoaded: boolean
  assetId: CAIP19
  accountId?: AccountSpecifier
}

export const AssetActions = ({ isLoaded, assetId, accountId }: AssetActionProps) => {
  const { send, receive } = useModal()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () =>
    isConnected ? send.open({ asset: asset, accountId }) : handleWalletModalOpen()
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset: asset, accountId }) : handleWalletModalOpen()

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
