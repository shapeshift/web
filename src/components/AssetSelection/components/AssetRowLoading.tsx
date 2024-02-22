import type { ButtonProps } from '@chakra-ui/react'
import { Button, Skeleton, SkeletonCircle } from '@chakra-ui/react'

export const AssetRowLoading: React.FC<ButtonProps> = props => {
  return (
    <Button {...props} isDisabled>
      <SkeletonCircle height='24px' />
      <Skeleton height='21px' width='50px' />
    </Button>
  )
}
