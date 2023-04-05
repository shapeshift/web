import { Flex, Text } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { RawText } from 'components/Text'
import { markdownLinkToHTML } from 'lib/utils'
import type { V2NftCollectionType } from 'state/apis/zapper/client'

type NftCollectionProps = {
  zapperCollection?: V2NftCollectionType[]
}

export const NftCollection: React.FC<NftCollectionProps> = ({ zapperCollection }) => {
  const translate = useTranslate()
  const collection = zapperCollection?.[0]?.collection

  if (!collection) return null

  const { description, name: collectionName } = collection

  return (
    <Flex gap={4} flexDir='column' px={8} py={6}>
      <Text fontWeight='medium'>{translate('nft.aboutCollection', { collectionName })}</Text>
      <RawText color='gray.500'>
        <ParsedHtml innerHtml={markdownLinkToHTML(description)} />
      </RawText>
    </Flex>
  )
}
