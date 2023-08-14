import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, Icon, Tooltip } from '@chakra-ui/react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text/Text'

type SettingListItemProps = {
  label: string
  onClick?: () => void
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
  ...restProps
}: SettingListItemProps) => {
  const translate = useTranslate()
  return (
    <Button
      variant='none'
      width='full'
      justifyContent='space-between'
      alignItems='center'
      onClick={onClick}
      _hover={onClick ? { bg: 'background.button.secondary.base' } : {}}
      {...restProps}
    >
      <Flex alignItems='center'>
        {icon}
        <Text ml={2} translation={label} />
        {tooltipText && (
          <Tooltip label={translate(tooltipText)}>
            <Box ml={1}>
              <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
            </Box>
          </Tooltip>
        )}
      </Flex>
      {children}
    </Button>
  )
}
