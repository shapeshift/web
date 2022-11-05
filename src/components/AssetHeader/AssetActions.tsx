import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@keepkey/caip'
import { fromAssetId } from '@keepkey/caip'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { tokenOrUndefined } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetActionProps = {
  assetId: AssetId
  accountId?: AccountId
  cryptoBalance: string
}

export const AssetActions: React.FC<AssetActionProps> = ({ assetId, accountId, cryptoBalance }) => {
  const [isValidChainId, setIsValidChainId] = useState(true)
  const chainAdapterManager = getChainAdapterManager()
  const { send, receive } = useModal()
  const translate = useTranslate()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  useEffect(() => {
    setIsValidChainId(chainAdapterManager.has(asset.chainId))
  }, [chainAdapterManager, asset])

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleSendClick = () =>
    isConnected ? send.open({ asset, accountId }) : handleWalletModalOpen()
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset, accountId }) : handleWalletModalOpen()
  const hasValidBalance = bnOrZero(cryptoBalance).gt(0)

  const { assetReference } = fromAssetId(asset.assetId)
  const maybeToken = tokenOrUndefined(assetReference)

  // If token is undefined, redirect to the basic explorer link
  // else redirect to the token explorer link
  const href = maybeToken ? `${asset?.explorerAddressLink}${maybeToken}` : asset?.explorer

  return (
    <Stack
      ml={{ base: 0, lg: 'auto' }}
      mt={{ base: 6, lg: 0 }}
      direction={{ base: 'column-reverse', md: 'row' }}
      width={{ base: 'full', md: 'auto' }}
    >
      <Button
        as={Link}
        leftIcon={<ExternalLinkIcon />}
        href={href}
        variant='solid'
        width={{ base: '100%', md: 'auto' }}
        isExternal
      >
        {translate('defi.viewOnChain')}
      </Button>
      <Stack direction='row'>
        <Button
          onClick={handleSendClick}
          leftIcon={<ArrowUpIcon />}
          width={{ base: '100%', md: 'auto' }}
          isDisabled={!hasValidBalance}
          data-test='asset-action-send'
        >
          {translate('common.send')}
        </Button>
        <Button
          disabled={!isValidChainId}
          onClick={handleReceiveClick}
          leftIcon={<ArrowDownIcon />}
          width={{ base: '100%', md: 'auto' }}
          data-test='asset-action-receive'
        >
          {translate('common.receive')}
        </Button>
      </Stack>
    </Stack>
  )
}
