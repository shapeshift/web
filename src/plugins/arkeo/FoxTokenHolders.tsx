import { Button, CardBody, Flex } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

import { ArkeoCard } from './ArkeoCard'

export const FoxTokenHolders = () => {
  const history = useHistory()
  const translate = useTranslate()
  const fiatRamps = useModal('fiatRamps')

  const handleClick = useCallback(() => {
    getMixPanel()?.track(MixPanelEvent.Click, { element: 'Fox Token Holders Button' })
    history.push('/trade/eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
  }, [history])

  const handleBuySellClick = useCallback(() => {
    fiatRamps.open({
      assetId: foxAssetId,
      fiatRampAction: FiatRampAction.Buy,
    })
  }, [fiatRamps])

  return (
    <ArkeoCard>
      <CardBody display='flex' flexDir='column' gap={4} height='100%'>
        <Flex>
          <AssetIcon assetId={foxAssetId} />
        </Flex>
        <Text fontSize='xl' fontWeight='bold' translation={'arkeo.foxTokenHolders.title'} />
        <Text color='text.subtle' translation={'arkeo.foxTokenHolders.body'} />
        <Flex mt='auto' gap={4}>
          <Button width='full' colorScheme='blue' size='sm-multiline' onClick={handleClick}>
            {translate('arkeo.foxTokenHolders.cta')}
          </Button>
          <Button onClick={handleBuySellClick} width='full' colorScheme='blue' variant='link'>
            {translate('arkeo.foxTokenHolders.secondary')}
          </Button>
        </Flex>
      </CardBody>
    </ArkeoCard>
  )
}
