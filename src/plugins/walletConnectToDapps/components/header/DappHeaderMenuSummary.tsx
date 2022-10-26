import { CloseIcon } from '@chakra-ui/icons'
import { MenuGroup } from '@chakra-ui/menu'
import { Box, HStack, MenuDivider, MenuItem, VStack } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'

import { DappAvatar } from './DappAvatar'

type Dapp = {
  name: string
  link: string
  image: string
  chainId: number
  connected: boolean
  created: Date
  address: string
}

type DappHeaderMenuSummaryProps = {
  dapp: Dapp
}

export const DappHeaderMenuSummary: React.FC<DappHeaderMenuSummaryProps> = ({ dapp }) => {
  const { supportedEvmChainIds, connectedEvmChainId } = useEvm()
  const chainAdapterManager = getChainAdapterManager()

  const translate = useTranslate()

  const chainName = useMemo(() => {
    const name = chainAdapterManager
      .get(supportedEvmChainIds.find(chainId => chainId === connectedEvmChainId) ?? '')
      ?.getDisplayName()

    return name ?? 'Unsupported Network'
  }, [chainAdapterManager, connectedEvmChainId, supportedEvmChainIds])

  return (
    <>
      <MenuGroup
        title={translate('plugins.walletConnectToDapps.header.connectedDapp')}
        ml={3}
        color='gray.500'
      >
        <HStack spacing={4} px={3} py={1}>
          <DappAvatar name={dapp.name} image={dapp.image} connected={dapp.connected} />
          <Box fontWeight='medium'>
            <RawText>{dapp.name}</RawText>
            <RawText fontSize='sm' color='gray.500'>
              {dapp.link}
            </RawText>
          </Box>
        </HStack>
      </MenuGroup>
      <MenuDivider />

      <VStack px={3} py={1} fontWeight='medium' spacing={1} alignItems='stretch'>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.connected' color='gray.500' />
          <RawText>{dayjs(dapp.created).format('MMM DD, YYYY, HH:mm A')}</RawText>
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.address' color='gray.500' />
          <MiddleEllipsis value={dapp.address} color='blue.200' />
        </HStack>
        <HStack justifyContent='space-between' spacing={4}>
          <Text translation='plugins.walletConnectToDapps.header.menu.network' color='gray.500' />
          <RawText>{chainName}</RawText>
        </HStack>
      </VStack>

      <MenuDivider />
      <MenuItem
        fontWeight='medium'
        icon={<CloseIcon />}
        onClick={() => alert('disconnect')}
        color='red.500'
      >
        {translate('plugins.walletConnectToDapps.header.menu.disconnect')}
      </MenuItem>
    </>
  )
}
