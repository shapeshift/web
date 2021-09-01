import { Image } from '@chakra-ui/react'
import FOX from 'assets/img/fox.png'

export const AirdropFoxIcon = ({ size = '100%', ...props }) => (
  <Image src={FOX} w={size} h={size} {...props} />
)
