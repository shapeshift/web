import { Box, Button, ButtonProps, Flex, Tooltip, useColorModeValue } from '@chakra-ui/react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text/Text'

type SettingListItemProps = {
  label: string
  onClick?: Function
  children?: React.ReactNode
  icon: React.ReactNode
  tooltipText?: string
} & ButtonProps

export const SettingsListItem = ({
  label,
  icon,
  onClick,
  children,
  tooltipText,
  ...rest
}: SettingListItemProps) => {
  const translate = useTranslate()
  const itemHover = useColorModeValue('gray.100', 'gray.750')
  return (
    <Button
      variant='none'
      width='full'
      justifyContent='space-between'
      alignItems='center'
      onClick={onClick}
      _hover={onClick ? { bg: itemHover } : {}}
      {...rest}
    >
      <Flex alignItems='center'>
        {icon}
        <Text ml={2} translation={label} color={useColorModeValue('black.900', 'white.900')} />
        {tooltipText && (
          <Tooltip label={translate(tooltipText)}>
            <Box ml={1}>
              <FaInfoCircle color='gray.500' size='0.7em' />
            </Box>
          </Tooltip>
        )}
      </Flex>
      {children}
    </Button>
  )
}
