import { HStack, Tag, TagLabel } from '@chakra-ui/react'
import { RawText } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'

export const AccountLabel = ({ accountId }: { accountId: AccountSpecifier }) => {
  const label = accountId ? accountIdToLabel(accountId) : null
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))
  return (
    <HStack fontSize='small' fontWeight='bold' spacing={1}>
      <RawText color='gray.500' textTransform='uppercase' lineHeight='shorter'>
        {feeAsset.name}
      </RawText>
      <Tag
        whiteSpace='nowrap'
        colorScheme='blue'
        fontSize='x-small'
        fontWeight='bold'
        minHeight='auto'
        lineHeight='shorter'
        py={1}
      >
        <TagLabel>{label}</TagLabel>
      </Tag>
    </HStack>
  )
}
