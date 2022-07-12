import { Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/menu'
import { Button, Image } from '@chakra-ui/react'
import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

// TODO: Don't PR this, clean it and move it to lib

const CHAIN_ID_TO_CHAIN_NAME = {
  [CHAIN_REFERENCE.EthereumMainnet]: 'Ethereum',
  [CHAIN_REFERENCE.AvalancheCChain]: 'Avalanche',
}

// feeAssetId is static, get this outside of component scope
const feeAssetId = getChainAdapters().get(KnownChainIds.EthereumMainnet)?.getFeeAssetId()

export const ChainMenu = () => {
  const { state } = useWallet()
  const [chainId, setChainId] = useState<string | null>(null)
  console.log({ feeAssetId })

  useEffect(() => {
    ;(async () => {
      const chainId = await (state.wallet as any).ethGetChainId?.()
      // If this method is undefined or an error happens with the JSON-RPC call, meaning the wallet doesn't implement this method
      // Set chainId to the result of awaiting this expression (undefined/null), which will make this component not render anything
      if (chainId) setChainId(chainId)
    })()
  }, [state])

  const handleEvmChainClick = async (chainId: any) => {
    try {
      await (state.wallet as any).ethSwitchChain?.(Number(chainId))
      setChainId(chainId)
    } catch (e) {
      // TODO: handle me
    }
  }

  // TODO: check for supportsEthSwitchChain() here and don't make this clickable if wallet doesn't _supportsEthSwitchChain
  if (!chainId) return null

  return (
    <Menu>
      <MenuButton as={Button}>{CHAIN_ID_TO_CHAIN_NAME[chainId]}</MenuButton>
      <MenuList>
        {Object.entries(CHAIN_ID_TO_CHAIN_NAME).map(([chainId, chainName]) => (
          <MenuItem minH='48px' onClick={() => handleEvmChainClick(chainId)}>
            <span>{chainName}</span>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
