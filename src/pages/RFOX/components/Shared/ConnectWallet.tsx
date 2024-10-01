import { Center } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'

export const ConnectWallet: FC = () => {
  const translate = useTranslate()

  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <Text translation='Connect Wallet' fontSize='xl' fontWeight={'bold'} mb={4} />
      <RawText fontSize='md' color='gray.400' mb={4} textAlign={'center'}>
        {translate('Connect a wallet to get started with RFOX')}
      </RawText>
    </Center>
  )
}
