import type { ColorProps } from '@chakra-ui/react'
import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type DashboardTabProps = {
  icon: ReactNode
  label: string
  fiatValue: string
  path: string
  color: ColorProps['color']
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  icon,
  label,
  fiatValue,
  path,
  color,
}) => {
  const history = useHistory()
  const location = useLocation()
  const handleClick = useCallback(() => {
    history.push(path)
  }, [history, path])

  const isActive = useMemo(() => path === location.pathname, [location.pathname, path])

  return (
    <Flex
      gap={4}
      alignItems='center'
      p={6}
      flex={1}
      bg='gray.800'
      onClick={handleClick}
      borderTopWidth={3}
      borderColor={isActive ? color : 'transparent'}
    >
      <Box color={color} fontSize='3xl'>
        {icon}
      </Box>
      <Flex flexDir='column'>
        <Text
          translation={label}
          color='gray.500'
          fontSize='sm'
          fontWeight='medium'
          lineHeight='shorter'
        />
        <Amount.Fiat value={fiatValue} fontSize='2xl' lineHeight='shorter' />
      </Flex>
    </Flex>
  )
}
