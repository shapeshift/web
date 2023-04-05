import { Box, Button, Flex, Link, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ArrowRightUp } from 'components/Icons/ArrowRightUp'
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

  const socialLinkPills = useMemo(() => {
    if (!collection?.socialLinks) return null
    return (
      <Box>
        {collection?.socialLinks.map(link => (
          <Button
            as={Link}
            isExternal
            href={link.url}
            size='sm'
            mr={2}
            colorScheme='whiteAlpha'
            rightIcon={<ArrowRightUp />}
          >
            {link.label}
          </Button>
        ))}
      </Box>
    )
  }, [collection?.socialLinks])

  if (!collection) return null

  const { description, name: collectionName } = collection

  return (
    <Flex gap={4} flexDir='column' px={8} py={6}>
      <Text fontWeight='medium'>{translate('nft.aboutCollection', { collectionName })}</Text>
      <RawText color='gray.500'>
        <ParsedHtml innerHtml={markdownLinkToHTML(description)} />
      </RawText>
      {socialLinkPills}
    </Flex>
  )
}
