import { Button, Center, Flex } from '@chakra-ui/react'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { hexToNumber } from 'viem'

import { AssetIcon } from '@/components/AssetIcon'
import { RawText, Text } from '@/components/Text'
import { chainIdToChainDisplayName } from '@/lib/utils'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type { WalletSwitchEthereumChainParams } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectSessionModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const NoAccountsForChainModal: React.FC<WalletConnectSessionModalProps> = ({
  onClose,
  state,
}) => {
  const translate = useTranslate()
  const { requestEvent } = useWalletConnectState(state)

  const chainId = useMemo(() => {
    const rpcParams = requestEvent?.params.request.params as WalletSwitchEthereumChainParams
    const evmNetworkIdHex = rpcParams?.[0]?.chainId
    if (!evmNetworkIdHex) return undefined

    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: String(hexToNumber(evmNetworkIdHex)) as ChainReference,
    })
  }, [requestEvent])

  const feeAssetId = useAppSelector(state =>
    chainId ? selectFeeAssetByChainId(state, chainId)?.assetId : undefined,
  )

  const chainLabel = useMemo(() => (chainId ? chainIdToChainDisplayName(chainId) : ''), [chainId])

  if (!feeAssetId) return null

  return (
    <Center flexDir='column' flex={1} p={6}>
      <AssetIcon size='lg' assetId={feeAssetId} showNetworkIcon mb={4} />
      <Text translation='RFOX.noSupportedChains' fontSize='xl' fontWeight='bold' mb={4} />
      <RawText fontSize='md' color='text.subtle' mb={4} textAlign='center'>
        {translate('plugins.walletConnectToDapps.modal.noAccountsForChain.description', {
          chainLabel,
        })}
      </RawText>
      <Flex width='full' mt={2}>
        <Button size='lg' width='full' onClick={onClose}>
          {translate('common.close')}
        </Button>
      </Flex>
    </Center>
  )
}
