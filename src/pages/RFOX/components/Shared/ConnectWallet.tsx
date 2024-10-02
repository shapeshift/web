import { Center } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RawText } from 'components/Text'

export const ConnectWallet: FC = () => {
  const translate = useTranslate()

  return (
    <Center flexDir={'column'}>
      <AssetIcon size='lg' assetId={foxAssetId} showNetworkIcon={false} mb={4} />
      <ButtonWalletPredicate isValidWallet />
      <RawText fontSize='md' color='gray.400' mb={4} textAlign={'center'}>
        {translate('common.connectWalletToGetStartedWith', { feature: 'RFOX' })}
      </RawText>
    </Center>
  )
}
