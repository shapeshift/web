import { Box, Container, Heading, Image, useColorModeValue } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxWifHatIcon from 'assets/foxwifhat-logo.png'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { FoxWifHatClaimRow } from './FoxWifHatClaimRow'

// @TODO: replace with proper foxwifhat asset id
const foxWifHatAssetId = foxAssetId

export const FoxWifHat = () => {
  const translate = useTranslate()
  const isFoxWifHatEnabled = useFeatureFlag('FoxPageFoxWifHatSection')
  const containerBackground = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const handleClaim = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('Claim')
  }, [])

  if (!isFoxWifHatEnabled) return null

  return (
    <>
      <Box py={10} bg={containerBackground}>
        <Container maxW='container.4xl' px={8}>
          <Heading as='h2' fontSize='2xl' display='flex' alignItems='center' mb={4}>
            <Image src={FoxWifHatIcon} height='32px' width='auto' me={2} />
            {translate('foxPage.foxWifHat.title')}
          </Heading>

          <Text color='text.subtle' translation='foxPage.foxWifHat.description' />

          <Box bg={containerBackground} borderRadius='lg' mt={8} mb={4}>
            <FoxWifHatClaimRow
              accountId='0xD41Ba840554701F5f6BefaEbaa927f4474078DBA'
              amountCryptoBaseUnit='800000000000000000000000'
              assetId={foxWifHatAssetId}
              discountPercentDecimal={0.72}
              isClaimed={true}
              onClaim={handleClaim}
            />
            <FoxWifHatClaimRow
              accountId='0xD41Ba840554701F5f6BefaEbaa927f4474078DBA'
              amountCryptoBaseUnit='800000000000000000000000'
              assetId={foxWifHatAssetId}
              discountPercentDecimal={0.72}
              isClaimed={false}
              onClaim={handleClaim}
            />
          </Box>

          <Text color='text.subtle' translation='foxPage.foxWifHat.discount' fontSize='sm' />
        </Container>
      </Box>
    </>
  )
}
