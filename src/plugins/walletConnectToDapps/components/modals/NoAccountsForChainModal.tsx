import { Button, Center, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { RawText, Text } from '@/components/Text'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type { WalletConnectSessionModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { chainIdToChainDisplayName } from '@/lib/utils'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const NoAccountsForChainModal: React.FC<WalletConnectSessionModalProps> = ({
  onClose,
  state,
}) => {
  const translate = useTranslate()
  const { chainId } = useWalletConnectState(state)

  const feeAsset = useAppSelector(state =>
    chainId ? selectFeeAssetByChainId(state, chainId) : undefined,
  )

  const chainLabel = useMemo(() => {
    return chainId ? chainIdToChainDisplayName(chainId) : ''
  }, [chainId])

  const assetId = useMemo(() => {
    // Use the chain's native asset (fee asset) for the icon
    return feeAsset?.assetId
  }, [feeAsset?.assetId])

  if (!chainId || !assetId) return null

  return (
    <Center flexDir='column' flex={1} p={6}>
      <AssetIcon size='lg' assetId={assetId} showNetworkIcon mb={4} />
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
