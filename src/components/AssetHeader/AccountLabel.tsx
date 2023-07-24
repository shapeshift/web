import { HStack, Tag, TagLabel } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { RawText } from 'components/Text'
import { accountIdToChainDisplayName, accountIdToLabel } from 'state/slices/portfolioSlice/utils'

type AccountLabelProps = { accountId: AccountId }
export const AccountLabel: React.FC<AccountLabelProps> = ({ accountId }) => {
  const label = accountId ? accountIdToLabel(accountId) : null
  const chainName = accountIdToChainDisplayName(accountId)
  if (!chainName) return null
  return (
    <HStack fontSize='small' spacing={1}>
      <RawText>{chainName}</RawText>
      <Tag
        whiteSpace='nowrap'
        colorScheme='blue'
        fontSize='x-small'
        fontWeight='bold'
        minHeight='auto'
        lineHeight='shorter'
        py={1}
        textDecoration='none'
      >
        <TagLabel>{label}</TagLabel>
      </Tag>
    </HStack>
  )
}
