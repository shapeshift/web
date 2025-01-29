import { Center } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { chainIdToChainDisplayName } from 'lib/utils'

type ChainNotSupportedProps = {
  chainId: ChainId | undefined
}

export const ChainNotSupported: FC<ChainNotSupportedProps> = ({ chainId }) => {
  const translate = useTranslate()

  if (!chainId) return null

  const chainLabel = chainIdToChainDisplayName(chainId)

  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <Text translation='RFOX.noSupportedChains' fontSize='xl' fontWeight={'bold'} mb={4} />
      <RawText fontSize='md' color='gray.400' mb={4} textAlign={'center'}>
        {translate('RFOX.noSupportedChainsDescription', { chainLabel })}
      </RawText>
    </Center>
  )
}
