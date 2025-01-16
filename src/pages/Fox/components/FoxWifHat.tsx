import { Box, Heading, Image, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import FoxWifHatIcon from '../foxwifhat-logo.png'
import { FoxWifHatHoldingLine } from './FoxWifHatHoldingLine'
const containerPaddingX = { base: 4, xl: 8 }

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
      <Box py={10} px={containerPaddingX} bg={containerBackground}>
        <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
          <Image src={FoxWifHatIcon} height='32px' width='auto' me={2} />
          {translate('foxPage.foxWifHat.title')}
        </Heading>

        <Text color='text.subtle' translation='foxPage.foxWifHat.description' />

        <Box bg={containerBackground} borderRadius='lg' mt={8} mb={4}>
          <FoxWifHatHoldingLine
            accountId='0xD41Ba840554701F5f6BefaEbaa927f4474078DBA'
            accountNumber={0}
            amount='8000'
            symbol='FOXWIFHAT'
            discountPercent='72'
            isClaimed={true}
            onClaim={handleClaim}
          />
          <FoxWifHatHoldingLine
            accountId='0xD41Ba840554701F5f6BefaEbaa927f4474078DBA'
            accountNumber={1}
            amount='8000'
            symbol='FOXWIFHAT'
            discountPercent='72'
            isClaimed={false}
            onClaim={handleClaim}
          />
        </Box>

        <Text color='text.subtle' translation='foxPage.foxWifHat.discount' fontSize='sm' />
      </Box>
    </>
  )
}
