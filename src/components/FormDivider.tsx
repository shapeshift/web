import { ArrowDownIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import { CircularProgressLabel, Divider, Flex, IconButton } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { CircularProgress } from './CircularProgress/CircularProgress'

const arrowDownIcon = <ArrowDownIcon />
const arrowForwardIcon = <ArrowForwardIcon />

type FormDividerProps = {
  onClick?: () => void
  isLoading?: boolean
  isDisabled?: boolean
  icon?: JSX.Element
  orientation?: 'horizontal' | 'vertical'
} & FlexProps

const defaultHoverProps = {
  bg: 'transparent',
}

export const FormDivider: React.FC<FormDividerProps> = ({
  onClick,
  isLoading,
  isDisabled,
  icon,
  orientation = 'horizontal',
  ...flexProps
}) => {
  const translate = useTranslate()

  const orientationProps = useMemo<FlexProps>(() => {
    if (orientation === 'vertical') {
      return { flexDir: 'column', alignItems: 'center' }
    }

    return { flexDir: 'row', alignItems: 'center' }
  }, [orientation])

  const centeredIcon = useMemo(() => {
    if (icon) return icon

    if (orientation === 'vertical') {
      return arrowForwardIcon
    }

    return arrowDownIcon
  }, [orientation, icon])

  return (
    <Flex justifyContent='center' my={-2} {...orientationProps} {...flexProps}>
      <Divider flexGrow='1' orientation={orientation} />
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
            icon={centeredIcon}
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

      <Divider flexGrow='1' orientation={orientation} />
    </Flex>
  )
}
