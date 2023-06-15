import { CheckIcon } from '@chakra-ui/icons'
import type { RadioProps } from '@chakra-ui/react'
import { Box, chakra, Image, Skeleton, useColorModeValue, useRadio } from '@chakra-ui/react'
import { useMemo, useState } from 'react'

type AvatarRadioProps = {
  src: string
} & RadioProps

export const AvatarRadio: React.FC<AvatarRadioProps> = ({ src, ...rest }) => {
  const { getInputProps, getCheckboxProps } = useRadio(rest)
  const inputProps = getInputProps()
  const checkboxProps = getCheckboxProps()
  const borderColor = useColorModeValue('gray.200', 'white')
  const [isLoaded, setIsLoaded] = useState(false)
  const renderImage = useMemo(() => {
    return (
      <Box borderRadius='xl' overflow='hidden' width='full' style={{ aspectRatio: '4/4' }}>
        <Skeleton width='100%' height='100%' position='absolute' isLoaded={isLoaded}>
          <Image
            onLoad={() => setIsLoaded(true)}
            src={src}
            width='100%'
            height='100%'
            left={0}
            top={0}
            objectFit='cover'
            borderRadius='xl'
          />
        </Skeleton>
      </Box>
    )
  }, [isLoaded, src])

  return (
    <chakra.label
      position='relative'
      display='block'
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
      {renderImage}
    </chakra.label>
  )
}
