import {
  CircularProgress as CKCircularProgress,
  CircularProgressProps,
  useColorModeValue
} from '@chakra-ui/react'

export const CircularProgress = (props: CircularProgressProps) => {
  return (
    <CKCircularProgress
      color='blue.500'
      trackColor={useColorModeValue('gray.50', 'gray.700')}
      {...props}
    />
  )
}
