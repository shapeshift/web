import { HStack, Tag, TagLabel } from '@chakra-ui/react'
import { RawText } from 'components/Text'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AccountLabel = ({ accountId }: { accountId: AccountSpecifier }) => {
  const label = accountId ? accountIdToLabel(accountId) : null
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  return (
    <HStack fontSize='small' spacing={1}>
      <RawText>{feeAsset.name}</RawText>
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
