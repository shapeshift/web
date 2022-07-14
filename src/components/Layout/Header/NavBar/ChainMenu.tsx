import { ChevronDownIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { supportsEthSwitchChain } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useState } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { CircleIcon } from 'components/Icons/Circle'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const getSupportedEvmChains = () =>
  Array.from(getChainAdapters().keys()).filter(
    chainId => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Ethereum,
  )

const ChainMenuItem: React.FC<{
  chainId: string
  handleEvmChainClick: any
  isConnected: boolean
}> = ({ chainId, handleEvmChainClick, isConnected }) => {
  const chainName = getChainAdapters().get(chainId)?.getDisplayName()
  const { chainReference: evmChainId } = fromChainId(chainId)
  const nativeAssetId = getChainAdapters().get(chainId)?.getFeeAssetId()
  const nativeAsset = useAppSelector(state => selectAssetById(state, nativeAssetId ?? ''))

  const connectedIconColor = useColorModeValue('green.500', 'green.200')
  const connectedChainBgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.50')

  if (!nativeAsset) return null

  return (
    <MenuItem
      icon={<AssetIcon src={nativeAsset.icon ?? ''} width='6' height='auto' />}
      backgroundColor={isConnected ? connectedChainBgColor : undefined}
      onClick={() => handleEvmChainClick(evmChainId)}
      borderRadius='lg'
    >
      <Flex justifyContent={'space-between'}>
        <Box>
          <span>{chainName}</span>
        </Box>
        <Box>{isConnected && <CircleIcon color={connectedIconColor} w={2} />}</Box>
      </Flex>
    </MenuItem>
  )
}
export const ChainMenu = () => {
  const { state } = useWallet()
  const [evmChainId, setEvmChainId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const chainId = await (state.wallet as any)?.ethGetChainId?.()
      // If this method is undefined or an error happens with the JSON-RPC call, meaning the wallet doesn't implement this method
      // Set chainId to the result of awaiting this expression (undefined/null), which will make this component not render anything
      if (chainId) setEvmChainId(bnOrZero(chainId).toString())
    })()
  }, [state])

  const currentChainIndex = useMemo(
    () =>
      getSupportedEvmChains().find(chainId => fromChainId(chainId).chainReference === evmChainId),
    [evmChainId],
  )

  const handleEvmChainClick = async (chainId: any) => {
    try {
      await (state.wallet as any).ethSwitchChain?.(Number(chainId))
      setEvmChainId(chainId)
    } catch (e) {
      // TODO: Handle me after https://github.com/shapeshift/hdwallet/pull/551 is published
    }
  }

  const currentChainNativeAssetId = useMemo(() => {
    return getChainAdapters()
      .get(currentChainIndex ?? '')
      ?.getFeeAssetId()
  }, [currentChainIndex])
  const currentChainNativeAsset = useAppSelector(state =>
    selectAssetById(state, currentChainNativeAssetId ?? ''),
  )

  if (!state.wallet || !evmChainId || !currentChainNativeAsset) return null
  if (!supportsEthSwitchChain(state.wallet)) return null

  return (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        rightIcon={getSupportedEvmChains().length > 1 ? <ChevronDownIcon /> : null}
        width={{ base: 'full', md: 'auto' }}
      >
        <Flex alignItems='center'>
          <AssetIcon src={currentChainNativeAsset.icon ?? ''} size='xs' mr='8px' />
          {getChainAdapters()
            .get(getSupportedEvmChains().find(chainId => chainId === currentChainIndex) ?? '')
            ?.getDisplayName() ?? ''}
        </Flex>
      </MenuButton>
      {getSupportedEvmChains().length > 1 ? (
        <MenuList p='10px' zIndex={2}>
          <MenuGroup title={'Select a network'} ml={3} color='gray.500'>
            {getSupportedEvmChains().map(chainId => (
              <ChainMenuItem
                isConnected={chainId === currentChainIndex}
                key={chainId}
                chainId={chainId}
                handleEvmChainClick={handleEvmChainClick}
              />
            ))}
          </MenuGroup>
        </MenuList>
      ) : null}
    </Menu>
  )
}
