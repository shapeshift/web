import { Button, Flex, Link, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { markdownLinkToHTML } from 'lib/utils'
import type { NftCollectionType } from 'state/apis/nft/types'

type NftCollectionProps = Pick<NftCollectionType, 'socialLinks' | 'description' | 'name'>

export const NftCollection: React.FC<NftCollectionProps> = ({
  socialLinks,
  description,
  name: collectionName,
}) => {
  const translate = useTranslate()

  const socialLinkPills = useMemo(() => {
    if (!socialLinks.length) return null
    return (
      <Flex gap={2} flexWrap='wrap'>
        {socialLinks.map(link => (
          <Button
            as={Link}
            isExternal
            href={link.url}
            key={link.key}
            size='xs'
            colorScheme='blue'
            variant='ghost-filled'
          >
            {link.displayName || translate(`nft.${link.key}`)}
          </Button>
        ))}
      </Flex>
    )
  }, [socialLinks, translate])

  return (
    <Flex gap={4} flexDir='column' px={8} py={6}>
      <Text fontWeight='medium'>{translate('nft.aboutCollection', { collectionName })}</Text>
      <ParsedHtml color='text.subtle' innerHtml={markdownLinkToHTML(description ?? '')} />
      {socialLinkPills}
    </Flex>
  )
}
