import { ChevronDownIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import { ChainId, fromChainId } from '@shapeshiftoss/caip'
import { ETHWallet, supportsEthSwitchChain } from '@shapeshiftoss/hdwallet-core'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { CircleIcon } from 'components/Icons/Circle'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const ChainMenuItem: React.FC<{
  chainId: ChainId
  onClick: (chainId: ChainId) => void
  isConnected: boolean
}> = ({ chainId, onClick, isConnected }) => {
  const chainAdapterManager = getChainAdapterManager()
  const chainName = chainAdapterManager.get(chainId)?.getDisplayName()
  const { chainReference: ethNetwork } = fromChainId(chainId)
  const nativeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
  const nativeAsset = useAppSelector(state => selectAssetById(state, nativeAssetId ?? ''))

  const connectedIconColor = useColorModeValue('green.500', 'green.200')
  const connectedChainBgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.50')

  if (!nativeAsset) return null

  return (
    <MenuItem
      icon={<AssetIcon src={nativeAsset.icon} width='6' height='auto' />}
      backgroundColor={isConnected ? connectedChainBgColor : undefined}
      onClick={() => onClick(ethNetwork)}
      borderRadius='lg'
    >
      <Flex justifyContent={'space-between'}>
        <Text>{chainName}</Text>
        <Box>{isConnected && <CircleIcon color={connectedIconColor} w={2} />}</Box>
      </Flex>
    </MenuItem>
  )
}
export const ChainMenu = () => {
  const { state, load } = useWallet()
  const { supportedEvmChainIds, connectedChainId, setEthNetwork } = useEvm()
  const chainAdapterManager = getChainAdapterManager()

  const handleChainClick = async (chainId: ChainId) => {
    try {
      await (state.wallet as ETHWallet).ethSwitchChain?.(Number(chainId))
      setEthNetwork(chainId)
      load()
    } catch (e) {
      // TODO: Handle me after https://github.com/shapeshift/hdwallet/pull/551 is published
    }
  }

  const currentChainNativeAssetId = useMemo(
    () => chainAdapterManager.get(connectedChainId ?? '')?.getFeeAssetId(),
    [chainAdapterManager, connectedChainId],
  )
  const currentChainNativeAsset = useAppSelector(state =>
    selectAssetById(state, currentChainNativeAssetId ?? ''),
  )

  if (!state.wallet || !connectedChainId || !currentChainNativeAsset) return null
  if (!supportsEthSwitchChain(state.wallet)) return null

  // don't show the menu if there is only one chain
  if (supportedEvmChainIds.length < 2) return null

  return (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        rightIcon={supportedEvmChainIds.length > 1 ? <ChevronDownIcon /> : null}
        width={{ base: 'full', md: 'auto' }}
      >
        <Flex alignItems='center'>
          <AssetIcon src={currentChainNativeAsset.icon} size='xs' mr='8px' />
          {chainAdapterManager
            .get(supportedEvmChainIds.find(chainId => chainId === connectedChainId) ?? '')
            ?.getDisplayName() ?? ''}
        </Flex>
      </MenuButton>
      <MenuList p='10px' zIndex={2}>
        <MenuGroup title={'Select a network'} ml={3} color='gray.500'>
          {supportedEvmChainIds.map(chainId => (
            <ChainMenuItem
              isConnected={chainId === connectedChainId}
              key={chainId}
              chainId={chainId}
              onClick={handleChainClick}
            />
          ))}
        </MenuGroup>
      </MenuList>
    </Menu>
  )
}
