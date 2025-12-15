import { Card, CardBody, Flex, Heading, IconButton, Skeleton, Text } from '@chakra-ui/react'
import { FaCopy } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'

type ReferralCodeCardProps = {
  code: string | null
  isLoading: boolean
  onShareOnX: (code: string) => void
  onCopyCode: (code: string) => void
}

export const ReferralCodeCard = ({
  code,
  isLoading,
  onShareOnX,
  onCopyCode,
}: ReferralCodeCardProps) => {
  const translate = useTranslate()

  if (isLoading) {
    return (
      <Card
        color='white'
        borderRadius='2xl'
        overflow='hidden'
        width='50%'
        borderTop='1px solid'
        borderColor='gray.700'
      >
        <CardBody px={6} py={4} display='flex' alignItems='center'>
          <Skeleton height='60px' width='full' />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card
      color='white'
      borderRadius='2xl'
      overflow='hidden'
      width='50%'
      borderTop='1px solid'
      borderColor='gray.700'
    >
      <CardBody px={6} py={4} display='flex' alignItems='center'>
        <Flex alignItems='center' justifyContent='space-between' width='full'>
          <Flex flexDirection='column' gap={0}>
            <Text fontSize='md' opacity={0.7} mb={1}>
              {translate('referral.yourReferralCode')}
            </Text>
            <Heading size='xl' fontWeight='bold' letterSpacing='wide'>
              {code || 'N/A'}
            </Heading>
          </Flex>
          {code && (
            <Flex alignItems='center' gap={2}>
              <IconButton
                aria-label='Share on X'
                icon={<FaXTwitter />}
                size='md'
                colorScheme='whiteAlpha'
                borderRadius='100%'
                bg='whiteAlpha.200'
                onClick={() => onShareOnX(code)}
              />
              <IconButton
                aria-label='Copy link'
                icon={<FaCopy />}
                size='md'
                colorScheme='whiteAlpha'
                bg='whiteAlpha.200'
                borderRadius='100%'
                onClick={() => onCopyCode(code)}
              />
            </Flex>
          )}
        </Flex>
      </CardBody>
    </Card>
  )
}
