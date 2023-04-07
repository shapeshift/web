import { Button, Flex, Link, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { markdownLinkToHTML } from 'lib/utils'
import type { V2NftCollectionType } from 'state/apis/zapper/client'

type NftCollectionProps = {
  zapperCollection?: V2NftCollectionType[]
}

export const NftCollection: React.FC<NftCollectionProps> = ({ zapperCollection }) => {
  const translate = useTranslate()
  const collection = zapperCollection?.[0]?.collection

  const socialLinkPills = useMemo(() => {
    if (!collection?.socialLinks) return null
    return (
      <Flex gap={2} flexWrap='wrap'>
        {collection?.socialLinks.map(link => (
          <Button
            as={Link}
            isExternal
            href={link.url}
            key={link.label}
            size='xs'
            colorScheme='blue'
            variant='ghost-filled'
          >
            {link.label}
          </Button>
        ))}
      </Flex>
    )
  }, [collection?.socialLinks])

  if (!collection) return null

  const { description, name: collectionName } = collection

  return (
    <Flex gap={4} flexDir='column' px={8} py={6}>
      <Text fontWeight='medium'>{translate('nft.aboutCollection', { collectionName })}</Text>
      <ParsedHtml color='gray.500' innerHtml={markdownLinkToHTML(description)} />
      {socialLinkPills}
    </Flex>
  )
}
