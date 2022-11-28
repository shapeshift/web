import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Tag, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

export const Status = ({ status }: { status: TxStatus }) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['lg']})`, { ssr: false })
  const tagSize = isLargerThanMd ? 'lg' : 'md'
  const circularProgressColor = useColorModeValue('blue.500', 'blue.200')
  switch (status) {
    case TxStatus.Confirmed:
      return (
        <>
          <Tag colorScheme='green' size={tagSize}>
            <CheckCircleIcon mr={2} />
            <Text translation='transactionRow.confirmed' />
          </Tag>
        </>
      )
    case TxStatus.Pending:
      return (
        <>
          <Tag colorScheme='blue' size={tagSize}>
            <CircularProgress
              mr={2}
              size='5'
              color={circularProgressColor}
              trackColor='transparent'
            />
            <Text translation='transactionRow.pending' />
          </Tag>
        </>
      )
    case TxStatus.Failed:
    default:
      return (
        <>
          <Tag colorScheme='red' size={tagSize}>
            <WarningTwoIcon mr={2} />
            <Text translation='transactionRow.failed' />
          </Tag>
        </>
      )
  }
}
