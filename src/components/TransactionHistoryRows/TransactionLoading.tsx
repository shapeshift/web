import { SkeletonCircle, SkeletonText, Stack } from '@chakra-ui/react'

export const TransactionLoading: React.FC = () => {
  return (
    <Stack px={4} py={2} direction='row' alignItems='center'>
      <SkeletonCircle size='40px' />
      <SkeletonText noOfLines={2} flex={1} />
    </Stack>
  )
}
