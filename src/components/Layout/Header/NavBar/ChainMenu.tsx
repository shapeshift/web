import { ChevronDownIcon } from '@chakra-ui/icons'
import { Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/menu'
import { Button, Image } from '@chakra-ui/react'
import {
  avalancheAssetId,
  avalancheChainId,
  CHAIN_REFERENCE,
  chainIdToFeeAssetId,
  ethAssetId,
  ethChainId,
  fromChainId,
} from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useState } from 'react'
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
}> = ({ chainId, chainName, handleEvmChainClick }) => {
  const { chainReference: evmChainId } = fromChainId(chainId)
  console.log({ chainId })
  const nativeAssetId = getChainAdapters().get(chainId)?.getFeeAssetId()
  console.log({ chainAdapters: getChainAdapters() })
  console.log({ nativeAssetId })
  const nativeAsset = useAppSelector(state => selectAssetById(state, nativeAssetId ?? ''))

  if (!nativeAsset) return null

  return (
    <MenuItem minH='48px' onClick={() => handleEvmChainClick(evmChainId)}>
      <Image height='48px' src={nativeAsset.icon} />
      <span>{chainName}</span>
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
        {(() => {
          const currentChainIndex = Object.keys(CHAIN_ID_TO_CHAIN_NAME).find(chainId => {
            const { chainReference } = fromChainId(chainId)
            return chainReference === evmChainId
          })

          return CHAIN_ID_TO_CHAIN_NAME[currentChainIndex ?? '']
        })()}
      </MenuButton>
      <MenuList>
        {Object.entries(CHAIN_ID_TO_CHAIN_NAME).map(([chainId, chainName]) => (
          <ChainMenuItem
            chainId={chainId}
            chainName={chainName}
            handleEvmChainClick={handleEvmChainClick}
          />
        ))}
      </MenuList>
    </Menu>
  )
}
