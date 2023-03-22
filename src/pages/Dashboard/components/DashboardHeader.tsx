import { Flex, Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AccountsIcon } from 'components/Icons/Accounts'
import { BoltIcon } from 'components/Icons/Bolt'
import { Text } from 'components/Text'

import { DashboardTab } from './DashboardTab'

export const DashboardHeader = () => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Stack spacing={0} divider={<StackDivider />} borderColor={borderColor}>
      <Flex width='full' bg='blackAlpha.100' px={6} py={4} alignItems='center' gap={6}>
        <Text translation='navBar.dashboard' fontSize='xl' fontWeight='medium' />
        <Flex alignItems='center' gap={4}>
          <Flex alignItems='center' gap={2}>
            <BoltIcon color='yellow.500' />
            <Text translation='defi.netWorth' color='gray.500' />
          </Flex>
          <Amount.Fiat value='5000' fontSize='xl' fontWeight='bold' />
        </Flex>
      </Flex>
      <Flex bg='blackAlpha.100'>
        <DashboardTab
          label='defi.walletBalance'
          icon={<AccountsIcon />}
          fiatValue='2000'
          path='/dashboard'
          color='blue.500'
        />
        <DashboardTab
          label='defi.walletBalance'
          icon={<AccountsIcon />}
          fiatValue='2000'
          path='/dashboard/earn'
          color='blue.500'
        />
      </Flex>
    </Stack>
  )
}
