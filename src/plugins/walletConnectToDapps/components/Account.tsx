import { Checkbox, Flex } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from 'components/Text'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'

interface IProps {
  accountId: AccountId
  toggleAccountId: (accountId: string) => void
  isSelected: boolean
  accountNumber: string
}

export const Account: FC<IProps> = ({ accountId, isSelected, toggleAccountId, accountNumber }) => {
  return (
    <Checkbox isChecked={isSelected} onChange={() => toggleAccountId(accountId)} width='full'>
      <Flex gap={2} justifyContent='space-between'>
        <RawText fontWeight='bold'>Account #{accountNumber}</RawText>
        <MiddleEllipsis value={accountIdToLabel(accountId)} color='text.subtle' />
      </Flex>
    </Checkbox>
  )
}
