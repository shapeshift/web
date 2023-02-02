import { Button, Flex } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

import { ArkeoCard } from './ArkeoCard'

//trade/eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d
export const FoxTokenHolders = () => {
  const history = useHistory()
  const translate = useTranslate()
  const { fiatRamps } = useModal()

  const handleClick = useCallback(() => {
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
      <Card.Body display='flex' flexDir='column' gap={4} height='100%'>
        <Flex>
          <AssetIcon assetId={foxAssetId} />
        </Flex>
        <Text fontSize='xl' fontWeight='bold' translation={'arkeo.foxTokenHolders.title'} />
        <Text color='gray.500' translation={'arkeo.foxTokenHolders.body'} />
        <Flex mt='auto' gap={4}>
          <Button width='full' colorScheme='blue' onClick={handleClick}>
            {translate('arkeo.foxTokenHolders.cta')}
          </Button>
          <Button onClick={handleBuySellClick} width='full' colorScheme='blue' variant='link'>
            {translate('arkeo.foxTokenHolders.secondary')}
          </Button>
        </Flex>
      </Card.Body>
    </ArkeoCard>
  )
}
