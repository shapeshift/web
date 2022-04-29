import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Link } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetActionProps = {
  assetId: AssetId
  accountId?: AccountSpecifier
  cryptoBalance: string
}

export const AssetActions: React.FC<AssetActionProps> = ({ assetId, accountId, cryptoBalance }) => {
  const { send, receive } = useModal()
  const translate = useTranslate()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () =>
    isConnected ? send.open({ asset: asset, accountId }) : handleWalletModalOpen()
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset: asset, accountId }) : handleWalletModalOpen()
  const hasValidBalance = bnOrZero(cryptoBalance).gt(0)

  return (
    <ButtonGroup
      ml={{ base: 0, md: 'auto' }}
      mt={{ base: 6, lg: 0 }}
      spacing={{ base: 0, md: '0.5rem' }}
      width={{ base: 'full', md: 'auto' }}
      flexWrap={{ base: 'wrap', md: 'nowrap' }}
      justifyContent={{ base: 'space-between', md: 'inherit' }}
    >
      <Button
        as={Link}
        leftIcon={<ExternalLinkIcon />}
        // If tokenId is undefined, redirect to the basic explorer link
        // else redirect to the token explorer link
        href={`${asset?.tokenId ? asset?.explorerAddressLink : asset?.explorer}${
          asset?.tokenId ?? ''
        }`}
        variant='solid'
        isExternal
        width={{ base: 'full', md: 'auto' }}
        mt={{ base: '0.5rem', md: '0' }}
      >
        {translate('defi.viewOnChain')}
      </Button>
      <Button
        onClick={handleSendClick}
        leftIcon={<ArrowUpIcon />}
        isDisabled={!hasValidBalance}
        width='full'
        data-test='asset-action-send'
      >
        {translate('common.send')}
      </Button>
      <Button
        onClick={handleReceiveClick}
        leftIcon={<ArrowDownIcon />}
        width='full'
        data-test='asset-action-receive'
      >
        {translate('common.receive')}
      </Button>
    </ButtonGroup>
  )
}
