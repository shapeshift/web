import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { TabItem } from 'components/TabMenu/TabMenu'
import { TabMenu } from 'components/TabMenu/TabMenu'

const menuMargin = { base: 0, '2xl': -8 }

export const LendingMenu = () => {
  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'lending.availablePools',
        path: '/lending',
        color: 'blue',
        exact: true,
      },
      {
        label: 'lending.yourLoans.yourLoans',
        path: '/lending/loans',
        color: 'blue',
      },
    ]
  }, [])

  return (
    <Stack mb={4} mx={menuMargin}>
      <TabMenu items={NavItems} />
    </Stack>
  )
}
