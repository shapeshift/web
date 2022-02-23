import { Button, IconButton, useMediaQuery } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import { BuySellIcon } from 'components/Icons/Buysell'
import { Text } from 'components/Text'

export const BuySell = () => {
  const [isLargerThan765] = useMediaQuery('(min-width: 765px)')

  const location = useLocation()
  return isLargerThan765 ? (
    <Button
      leftIcon={<BuySellIcon color='inherit' />}
      colorScheme='blue'
      as={NavLink}
      to={{ pathname: '/buysell', state: { background: location } }}
      variant='ghost'
      mr={2}
    >
      <Text translation='buysell.page.headerLabel' />
    </Button>
  ) : (
    <IconButton
      icon={<BuySellIcon color='inherit' />}
      aria-label='buysell.page.headerLabel'
      as={NavLink}
      rounded='full'
      to={{ pathname: '/buysell', state: { background: location } }}
      mr={2}
    />
  )
}
