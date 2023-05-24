import { Button, Flex, Link, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { markdownLinkToHTML } from 'lib/utils'
import type { NftCollectionItem } from 'state/apis/nft/types'

type NftCollectionProps = {
  nftCollection?: NftCollectionItem
}

export const NftCollection: React.FC<NftCollectionProps> = ({ nftCollection }) => {
  const translate = useTranslate()

  const socialLinkPills = useMemo(() => {
    if (!nftCollection?.socialLinks) return null
    return (
      <Flex gap={2} flexWrap='wrap'>
        {nftCollection?.socialLinks.map(link => (
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
  }, [nftCollection?.socialLinks])

  if (!nftCollection) return null

  const { description, name: collectionName } = nftCollection

  return (
    <Flex gap={4} flexDir='column' px={8} py={6}>
      <Text fontWeight='medium'>{translate('nft.aboutCollection', { collectionName })}</Text>
      {description && <ParsedHtml color='gray.500' innerHtml={markdownLinkToHTML(description)} />}
      {socialLinkPills}
    </Flex>
  )
}
