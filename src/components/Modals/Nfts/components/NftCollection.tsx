import { Button, Flex, Link, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { markdownLinkToHTML } from 'lib/utils'
import type { NftCollectionItem } from 'state/apis/nft/types'

type NftCollectionProps = Pick<NftCollectionItem, 'socialLinks' | 'description' | 'name'>

export const NftCollection: React.FC<NftCollectionProps> = ({ socialLinks, description, name }) => {
  const translate = useTranslate()

  const socialLinkPills = useMemo(() => {
    if (!socialLinks) return null
    return (
      <Flex gap={2} flexWrap='wrap'>
        {socialLinks.map(link => (
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
  }, [socialLinks])

  return (
    <Flex gap={4} flexDir='column' px={8} py={6}>
      <Text fontWeight='medium'>{translate('nft.aboutCollection', { name })}</Text>
      {description && <ParsedHtml color='gray.500' innerHtml={markdownLinkToHTML(description)} />}
      {socialLinkPills}
    </Flex>
  )
}
