import { Button, Card, HStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'

const foxIcon = <FoxIcon w='full' h='full' />

export const YouSaved = () => {
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    // TEMP: Test out confetti
    const a = 1

    // TODO:
    // Set fox as the buy asset
    // Redirect to trade page
  }, [])

  return (
    <Card
      width='full'
      bg='background.surface.overlay.base'
      borderBottomRadius='lg'
      p={4}
      borderColor='border.base'
      borderWidth={2}
    >
      <HStack width='full' justifyContent='space-between'>
        <Text translation='trade.foxSavings.youSaved' fontSize='sm' fontWeight='bold' />
        <Button
          leftIcon={foxIcon}
          colorScheme='gray'
          size='sm'
          fontSize='sm'
          fontWeight='bold'
          aria-label='Copy value'
          onClick={handleClick}
          borderRadius='full'
          borderColor='border.base'
          borderWidth={2}
          px={4}
        >
          {translate('trade.foxSavings.buyFox')}
        </Button>
      </HStack>
    </Card>
  )
}
