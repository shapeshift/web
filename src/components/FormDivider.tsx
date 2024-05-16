import { ArrowDownIcon } from '@chakra-ui/icons'
import { CircularProgressLabel, Divider, Flex, IconButton } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from './CircularProgress/CircularProgress'

const arrowDownIcon = <ArrowDownIcon />

type FormDividerProps = {
  onClick?: () => void
  isLoading?: boolean
  isDisabled?: boolean
  icon?: JSX.Element
}

const defaultHoverProps = {
  bg: 'transparent',
}

export const FormDivider: React.FC<FormDividerProps> = ({
  onClick,
  isLoading,
  isDisabled,
  icon = arrowDownIcon,
}) => {
  const translate = useTranslate()
  return (
    <Flex alignItems='center' justifyContent='center' my={-2}>
      <Divider />
      <CircularProgress
        color='blue.500'
        thickness='4px'
        size='34px'
        trackColor='transparent'
        isIndeterminate={isLoading}
        borderRadius='full'
      >
        <CircularProgressLabel
          fontSize='md'
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <IconButton
            isRound
            size='sm'
            position='relative'
            variant='outline'
            borderColor='border.base'
            zIndex={1}
            aria-label={translate('lending.switchAssets')}
            icon={icon}
            isDisabled={isDisabled}
            cursor='auto'
            _hover={defaultHoverProps}
            {...(onClick && {
              onClick,
              cursor: 'pointer',
              _hover: { bg: 'background.button.secondary.hover' },
            })}
          />
        </CircularProgressLabel>
      </CircularProgress>

      <Divider />
    </Flex>
  )
}
