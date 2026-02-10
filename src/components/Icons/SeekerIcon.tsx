import { Image } from '@chakra-ui/react'

export const SeekerIcon = ({ boxSize = '1em', ...props }: any) => {
  return (
    <Image
      src='/images/skr-logo.png'
      alt='Seeker'
      boxSize={boxSize}
      display='inline-block'
      verticalAlign='middle'
      {...props}
    />
  )
}
