import { Flex, Icon, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { TbScan } from 'react-icons/tb'

export const QRCodeIcon = () => {
  const qrBackground = useColorModeValue('blackAlpha.200', 'whiteAlpha.200')

  const iconSx = useMemo(
    () => ({
      svg: {
        width: '24px',
        height: '24px',
      },
    }),
    [],
  )

  return (
    <Flex
      bg={qrBackground}
      borderRadius='full'
      color='text.primary'
      boxSize='44px'
      alignItems='center'
      justifyContent='center'
      sx={iconSx}
    >
      <Icon as={TbScan} />
    </Flex>
  )
}
