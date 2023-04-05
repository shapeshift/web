import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type DashboardTabProps = {
  icon: ReactNode
  label: string
  fiatValue: string
  path: string
  color: string
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  icon,
  label,
  fiatValue,
  path,
  color = 'green.500',
}) => {
  const history = useHistory()
  const location = useLocation()
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    history.push(path)
  }, [history, path])
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const isActiveBg = useColorModeValue('gray.50', 'gray.800')
  const hoverBg = useColorModeValue('blackAlpha.50', 'gray.785')

  const isActive = useMemo(() => path === location.pathname, [location.pathname, path])

  // return (
  //   <Flex
  //     as='a'
  //     gap={4}
  //     alignItems='center'
  //     py={6}
  //     px={8}
  //     mb='-1px'
  //     flex={1}
  //     bg={isActive ? isActiveBg : 'transparent'}
  //     onClick={handleClick}
  //     _hover={{ bg: isActive ? isActiveBg : hoverBg }}
  //     cursor='pointer'
  //     borderLeftWidth={{ base: 0, md: 1 }}
  //     borderRightWidth={{ base: 0, md: 1 }}
  //     borderColor={isActive ? borderColor : 'transparent'}
  //     position='relative'
  //     _first={{ borderLeftWidth: 0 }}
  //   >
  //     <Box color={color} fontSize='3xl'>
  //       {icon}
  //     </Box>
  //     <Flex flexDir='column'>
  //       <Text
  //         translation={label}
  //         color='gray.500'
  //         fontSize='sm'
  //         fontWeight='medium'
  //         lineHeight='shorter'
  //       />
  //       <Amount.Fiat value={fiatValue} fontSize='2xl' lineHeight='shorter' />
  //     </Flex>
  //   </Flex>
  // )
  return (
    <Button variant='tab' onClick={handleClick} isActive={isActive}>
      {translate(label)}
    </Button>
  )
}
