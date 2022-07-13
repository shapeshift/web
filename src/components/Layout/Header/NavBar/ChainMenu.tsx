import { ChevronDownIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuGroup, MenuItem, MenuList } from '@chakra-ui/menu'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { avalancheChainId, ethChainId, fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useState } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { CircleIcon } from 'components/Icons/Circle'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

// TODO: This should move to lib, we should be able to get `getName()` on each adapter
const CHAIN_ID_TO_CHAIN_NAME = {
  [ethChainId]: 'Ethereum',
  [avalancheChainId]: 'Avalanche',
}

const ChainMenuItem: React.FC<{
  chainId: string
  chainName: string
  handleEvmChainClick: any
  isConnected: boolean
}> = ({ chainId, chainName, handleEvmChainClick, isConnected }) => {
  const chainAdapters = getChainAdapters()
  const { chainReference: evmChainId } = fromChainId(chainId)
  const nativeAssetId = chainAdapters.get(chainId)?.getFeeAssetId()
  const nativeAsset = useAppSelector(state => selectAssetById(state, nativeAssetId ?? ''))

  const connectedColor = useColorModeValue('green.500', 'green.200')

  if (!nativeAsset) return null

  return (
    <MenuItem
      icon={<AssetIcon src={nativeAsset.icon ?? ''} width='6' height='auto' />}
      onClick={() => handleEvmChainClick(evmChainId)}
    >
      <Flex justifyContent={'space-between'}>
        <Box>
          <span>{chainName}</span>
        </Box>
        <Box>{isConnected && <CircleIcon color={connectedColor} />}</Box>
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
      Object.keys(CHAIN_ID_TO_CHAIN_NAME).find(chainId => {
        const { chainReference } = fromChainId(chainId)
        return chainReference === evmChainId
      }),
    [evmChainId],
  )

  const handleEvmChainClick = async (chainId: any) => {
    try {
      await (state.wallet as any).ethSwitchChain?.(Number(chainId))
      setEvmChainId(chainId)
    } catch (e) {
      // TODO: handle me
    }
  }

  // TODO: check for supportsEthSwitchChain() here and don't make this clickable if wallet doesn't _supportsEthSwitchChain
  if (!evmChainId) return null

  return (
    <Menu>
      <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
        {CHAIN_ID_TO_CHAIN_NAME[currentChainIndex ?? ''] ?? null}
      </MenuButton>
      <MenuList>
        <MenuGroup title={'Select a network'} ml={3} color='gray.500'>
          {Object.entries(CHAIN_ID_TO_CHAIN_NAME).map(([chainId, chainName]) => (
            <ChainMenuItem
              isConnected={chainId === currentChainIndex}
              chainId={chainId}
              chainName={chainName}
              handleEvmChainClick={handleEvmChainClick}
            />
          ))}
        </MenuGroup>
      </MenuList>
    </Menu>
  )
}
