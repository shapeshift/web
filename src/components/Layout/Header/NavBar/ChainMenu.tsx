import { WarningIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/react'
import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId, gnosisChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsEthSwitchChain } from '@shapeshiftoss/hdwallet-core'
import { utils } from 'ethers'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { CircleIcon } from 'components/Icons/Circle'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
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
      icon={<AssetIcon assetId={nativeAssetId} showNetworkIcon width='6' height='auto' />}
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

type ChainMenuProps = BoxProps

export const ChainMenu = (props: ChainMenuProps) => {
  const { state, load } = useWallet()
  const {
    connectedEvmChainId,
    getChainIdFromEthNetwork,
    isLoading,
    setEthNetwork,
    supportedEvmChainIds,
  } = useEvm()
  const chainAdapterManager = getChainAdapterManager()
  const translate = useTranslate()

  const assets = useAppSelector(selectAssets)

  const handleChainClick = useCallback(
    async (requestedEthNetwork: string) => {
      try {
        const requestedChainId = getChainIdFromEthNetwork(requestedEthNetwork)

        if (!requestedChainId) {
          throw new Error(`Unsupported EVM network: ${requestedEthNetwork}`)
        }

        const requestedChainChainAdapter = chainAdapterManager.get(requestedChainId) as unknown as
          | EvmBaseAdapter<EvmChainId>
          | undefined

        if (!requestedChainChainAdapter) {
          throw new Error(`No chain adapter found for: ${requestedChainId}`)
        }

        const requestedChainFeeAssetId = requestedChainChainAdapter.getFeeAssetId()
        const requestedChainFeeAsset = assets[requestedChainFeeAssetId]
        if (!requestedChainFeeAsset)
          throw new Error(`Asset not found for AssetId ${requestedChainFeeAssetId}`)

        // Temporary hack to add the official Gnosis RPC to wallets until stabilized - we don't want to bork users' wallets
        // https://docs.metamask.io/wallet/reference/rpc-api/#parameters-1
        // "rpcUrls - An array of RPC URL strings. At least one item is required, and only the first item is used."
        const maybeGnosisOfficialRpcUrl =
          requestedChainId === gnosisChainId ? ['https://rpc.gnosischain.com'] : []
        const requestedChainRpcUrl = requestedChainChainAdapter.getRpcUrl()
        await (state.wallet as ETHWallet).ethSwitchChain?.({
          chainId: utils.hexValue(Number(requestedEthNetwork)),
          chainName: requestedChainChainAdapter.getDisplayName(),
          nativeCurrency: {
            name: requestedChainFeeAsset.name,
            symbol: requestedChainFeeAsset.symbol,
            decimals: 18,
          },
          rpcUrls: [...maybeGnosisOfficialRpcUrl, requestedChainRpcUrl],
          blockExplorerUrls: [requestedChainFeeAsset.explorer],
        })
        setEthNetwork(requestedEthNetwork)
        load()
      } catch (e) {
        console.error(e)
      }
    },
    [assets, chainAdapterManager, getChainIdFromEthNetwork, load, setEthNetwork, state.wallet],
  )

  const currentChainNativeAssetId = useMemo(
    () => chainAdapterManager.get(connectedEvmChainId ?? '')?.getFeeAssetId(),
    [chainAdapterManager, connectedEvmChainId],
  )
  const currentChainNativeAsset = useAppSelector(state =>
    selectAssetById(state, currentChainNativeAssetId ?? ''),
  )

  const canSwitchChains = useMemo(
    () => !isLoading && (supportedEvmChainIds.length > 1 || !connectedEvmChainId),
    [isLoading, connectedEvmChainId, supportedEvmChainIds.length],
  )
  if (!state.wallet) return null
  if (!supportsEthSwitchChain(state.wallet)) return null

  // don't show the menu if there is only one chain
  if (!canSwitchChains) return null

  return (
    <Box {...props}>
      <Menu autoSelect={false}>
        <Tooltip
          label={translate(
            currentChainNativeAsset ? 'common.switchNetwork' : 'common.unsupportedNetwork',
          )}
          isDisabled={!canSwitchChains}
        >
          <MenuButton as={Button} iconSpacing={2} px={2} width={{ base: 'full', md: 'auto' }}>
            <Flex alignItems='center' justifyContent='center'>
              {currentChainNativeAsset ? (
                <AssetIcon assetId={currentChainNativeAssetId} showNetworkIcon size='xs' />
              ) : (
                <WarningIcon color='yellow.300' boxSize='4' />
              )}
            </Flex>
          </MenuButton>
        </Tooltip>

        <MenuList p='10px' zIndex={2}>
          <MenuGroup title={translate('common.selectNetwork')} ml={3} color='text.subtle'>
            {supportedEvmChainIds.map(chainId => (
              <ChainMenuItem
                isConnected={chainId === connectedEvmChainId}
                key={chainId}
                chainId={chainId}
                onClick={handleChainClick}
              />
            ))}
          </MenuGroup>
        </MenuList>
      </Menu>
    </Box>
  )
}
