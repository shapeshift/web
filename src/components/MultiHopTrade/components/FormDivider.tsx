import type { FlexProps } from '@chakra-ui/react'
import {
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  IconButton,
} from '@chakra-ui/react'
import type { JSX } from 'react'
import { LuArrowUpDown } from 'react-icons/lu'
import { useTranslate } from 'react-polyglot'

type FormDividerProps = {
  isLoading?: boolean
  isDisabled?: boolean
  icon?: JSX.Element
  orientation?: 'horizontal' | 'vertical'
  onClick?: () => void
} & FlexProps

const arrowUpDownIcon = <LuArrowUpDown />

export const FormDivider = ({ isLoading, isDisabled, onClick, ...props }: FormDividerProps) => {
  const translate = useTranslate()

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      my={-2}
      className='swapper-divider'
      {...props}
    >
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
            onClick={onClick}
            isRound
            size='sm'
            position='relative'
            variant='outline'
            borderColor='border.base'
            zIndex={1}
            aria-label={translate('lending.switchAssets')}
            icon={arrowUpDownIcon}
            isDisabled={isDisabled}
            color='text.subtle'
          />
        </CircularProgressLabel>
      </CircularProgress>

      <Divider />
    </Flex>
  )
}
