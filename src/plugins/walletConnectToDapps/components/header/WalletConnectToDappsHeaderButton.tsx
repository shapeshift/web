import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuGroup, MenuList } from '@chakra-ui/menu'
import { Button, Divider, MenuDivider } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'

export const WalletConnectToDappsHeaderButton = () => {
  const { supportedEvmChainIds, connectedEvmChainId } = useEvm()
  const chainAdapterManager = getChainAdapterManager()

  const dapp: any = null /*{
    name: 'Uniswap',
    chainId: 1,
  }*/
  const connected = !!dapp
  const translate = useTranslate()

  const chainName = useMemo(() => {
    const name = chainAdapterManager
      .get(supportedEvmChainIds.find(chainId => chainId === connectedEvmChainId) ?? '')
      ?.getDisplayName()

    return name ?? 'Unsupported Network'
  }, [chainAdapterManager, connectedEvmChainId, supportedEvmChainIds])

  if (!connected) {
    return (
      <Button leftIcon={<WalletConnectIcon />} rightIcon={<ChevronRightIcon />}>
        {translate('plugins.walletConnectToDapps.header.connectDapp')}
      </Button>
    )
  }

  return (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={<WalletConnectIcon />}
        rightIcon={<ChevronDownIcon />}
        width={{ base: 'full', md: 'auto' }}
      >
        {dapp.name}
      </MenuButton>
      <MenuList p='10px' zIndex={2}>
        <MenuGroup
          title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
          ml={3}
          color='gray.500'
        >
          content goes here...
        </MenuGroup>
        <MenuDivider />
        <MenuGroup
          title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
          ml={3}
          color='gray.500'
        >
          content goes here...
        </MenuGroup>
        <Divider />
        <MenuGroup
          title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
          ml={3}
          color='gray.500'
        >
          content goes here...
        </MenuGroup>
      </MenuList>
    </Menu>
  )
}
