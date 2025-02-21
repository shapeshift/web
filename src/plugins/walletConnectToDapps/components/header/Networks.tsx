import { AvatarGroup, HStack } from '@chakra-ui/react'
import { accountIdToChainId } from '@shapeshiftmonorepo/caip'
import { useMemo } from 'react'
import { isSome } from 'lib/utils'

import { AssetIcon } from '@/components/AssetIcon'
import { Text } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

type NetworksProps = {
  accountIds: string[]
}

// renders all unique networks for a given set of account ids
export const Networks: React.FC<NetworksProps> = ({ accountIds }) => {
  const nativeAssetIds = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()

    return Array.from(
      new Set(
        accountIds
          .map(accountId => {
            const chainId = accountIdToChainId(accountId)
            const nativeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
            return nativeAssetId
          })
          .filter(isSome),
      ),
    )
  }, [accountIds])

  return (
    <HStack justifyContent='space-between' spacing={4} alignItems='center'>
      <Text
        translation='plugins.walletConnectToDapps.header.menu.networks'
        color='text.subtle'
        lineHeight={1}
      />
      <AvatarGroup size='xs' max={2}>
        {nativeAssetIds.map(nativeAssetId => {
          return <AssetIcon key={nativeAssetId} assetId={nativeAssetId} showNetworkIcon />
        })}
      </AvatarGroup>
    </HStack>
  )
}
