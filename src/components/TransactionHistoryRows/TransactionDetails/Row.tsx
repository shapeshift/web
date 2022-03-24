import { BoxProps } from '@chakra-ui/react'
import { Row as RowStyle } from 'components/Row/Row'
import { Text } from 'components/Text'

export const Row = ({
  title,
  children,
  ...rest
}: { title: string; children: React.ReactNode } & BoxProps) => {
  return (
    <RowStyle alignItems='center' {...rest}>
      <RowStyle.Label fontSize={{ base: 'sm', lg: 'md' }}>
        <Text translation={`transactionHistory.${title}`} />
      </RowStyle.Label>
      <RowStyle.Value fontSize={{ base: 'sm', lg: 'md' }}>{children}</RowStyle.Value>
    </RowStyle>
  )
}
