import { CheckIcon } from '@chakra-ui/icons'
import type { RadioProps } from '@chakra-ui/react'
import { Box, chakra, useColorModeValue, useRadio } from '@chakra-ui/react'

type AvatarRadioProps = {
  src: string
} & RadioProps

export const AvatarRadio: React.FC<AvatarRadioProps> = ({ src, ...rest }) => {
  const { getInputProps, getCheckboxProps } = useRadio(rest)
  const inputProps = getInputProps()
  const checkboxProps = getCheckboxProps()
  const borderColor = useColorModeValue('gray.200', 'white')
  return (
    <chakra.label
      position='relative'
      cursor='pointer'
      _after={{
        content: '""',
        left: '-6px',
        right: '-6px',
        top: '-6px',
        bottom: '-6px',
        position: 'absolute',
        borderRadius: '2xl',
        borderWidth: 2,
        borderColor,
        opacity: 0,
        transitionDuration: 'normal',
        transitionProperty: 'common',
      }}
      _hover={{ '&:after': { opacity: 0.2 } }}
      _checked={{ '&:after': { opacity: 1 } }}
      {...checkboxProps}
    >
      <chakra.input {...inputProps} />
      <chakra.span
        role='checkbox'
        boxSize={6}
        borderWidth={2}
        borderColor='white'
        position='absolute'
        bottom={2}
        left={2}
        borderRadius='full'
        zIndex='1'
        _checked={{ bg: 'blue.500', '.avatar-checkbox-icon': { display: 'inline' } }}
        boxShadow='lg'
        {...checkboxProps}
      >
        <CheckIcon
          boxSize={3}
          className='avatar-checkbox-icon'
          display='none'
          position='absolute'
          left='50%'
          top='50%'
          transform='translate(-50%, -50%)'
          color='white'
        />
      </chakra.span>
      <Box
        borderRadius='xl'
        width='full'
        backgroundImage={src}
        backgroundSize='cover'
        style={{ aspectRatio: '4/4' }}
      />
    </chakra.label>
  )
}
