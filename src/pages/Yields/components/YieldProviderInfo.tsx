import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Link,
  Text,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Display } from '@/components/Display'

type YieldProviderInfoProps = {
  providerId: string
  providerName: string
  providerLogoURI?: string
  providerWebsite?: string
}

export const YieldProviderInfo = memo(
  ({ providerId, providerName, providerLogoURI, providerWebsite }: YieldProviderInfoProps) => {
    const translate = useTranslate()

    const descriptionKey = `yieldXYZ.providerDescriptions.${providerId}`
    const description = useMemo(() => {
      const translated = translate(descriptionKey)
      return translated !== descriptionKey ? translated : null
    }, [translate, descriptionKey])

    if (!description) return null

    return (
      <Box>
        <Display.Desktop>
          <Card>
            <CardBody>
              <Flex gap={6} align='flex-start'>
                <Flex flex={1} direction='column' gap={4}>
                  <HStack spacing={3}>
                    {providerLogoURI && (
                      <Avatar size='md' src={providerLogoURI} name={providerName} />
                    )}
                    <Heading as='h3' size='md'>
                      {translate('yieldXYZ.aboutProvider', { provider: providerName })}
                    </Heading>
                  </HStack>
                  <Text color='text.subtle' fontSize='sm' lineHeight='tall'>
                    {description}
                  </Text>
                  {providerWebsite && (
                    <Link href={providerWebsite} isExternal ml={-2}>
                      <Button
                        variant='ghost'
                        size='sm'
                        rightIcon={<ExternalLinkIcon />}
                        color='text.subtle'
                        _hover={{ color: 'text.base' }}
                      >
                        {translate('yieldXYZ.visitWebsite')}
                      </Button>
                    </Link>
                  )}
                </Flex>
              </Flex>
            </CardBody>
          </Card>
        </Display.Desktop>

        <Display.Mobile>
          <Box bg='background.surface.raised.base' borderRadius='xl' p={4} mt={4}>
            <HStack spacing={3} mb={3}>
              {providerLogoURI && <Avatar size='sm' src={providerLogoURI} name={providerName} />}
              <Heading as='h3' size='sm'>
                {translate('yieldXYZ.aboutProvider', { provider: providerName })}
              </Heading>
            </HStack>
            <Text color='text.subtle' fontSize='sm' lineHeight='tall'>
              {description}
            </Text>
            {providerWebsite && (
              <Link href={providerWebsite} isExternal mt={3} display='block'>
                <Button variant='outline' size='sm' width='full' rightIcon={<ExternalLinkIcon />}>
                  {translate('yieldXYZ.visitWebsite')}
                </Button>
              </Link>
            )}
          </Box>
        </Display.Mobile>
      </Box>
    )
  },
)
