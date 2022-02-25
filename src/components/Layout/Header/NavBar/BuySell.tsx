import { Button, IconButton, useMediaQuery } from '@chakra-ui/react'
import { BuySellIcon } from 'components/Icons/Buysell'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { breakpoints } from 'theme/theme'

export const BuySell = () => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { buysell } = useModal()

  return isLargerThanMd ? (
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
