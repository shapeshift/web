import { Button, IconButton, useMediaQuery } from '@chakra-ui/react'
import { BuySellIcon } from 'components/Icons/Buysell'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export const BuySell = () => {
  const [isLargerThan765] = useMediaQuery('(min-width: 765px)')

  const { buysell } = useModal()

  return isLargerThan765 ? (
    <Button
      leftIcon={<BuySellIcon color='inherit' />}
      colorScheme='blue'
      onClick={buysell.open}
      variant='ghost'
      mr={2}
    >
      <Text translation='buysell.headerLabel' />
    </Button>
  ) : (
    <IconButton
      icon={<BuySellIcon color='inherit' />}
      aria-label='buysell.headerLabel'
      onClick={buysell.open}
      rounded='full'
      mr={2}
    />
  )
}
