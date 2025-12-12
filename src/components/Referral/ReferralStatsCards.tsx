import { Card, CardBody, Heading, HStack, Icon, Skeleton, Text } from '@chakra-ui/react'
import { FaUser } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

type ReferralStatsCardsProps = {
  currentRewards?: string
  totalRewards?: string
  totalReferrals?: number
  isLoading: boolean
}

export const ReferralStatsCards = ({
  currentRewards,
  totalRewards,
  totalReferrals,
  isLoading,
}: ReferralStatsCardsProps) => {
  const translate = useTranslate()

  if (isLoading) {
    return (
      <>
        <Card
          flex='1'
          minW='200px'
          bg='background.surface.raised.base'
          borderRadius='xl'
          borderTop='1px solid'
          borderColor='gray.700'
        >
          <CardBody textAlign='center' py={6}>
            <Skeleton height='40px' width='100px' mx='auto' mb={2} />
            <Skeleton height='20px' width='120px' mx='auto' />
          </CardBody>
        </Card>
        <Card
          flex='1'
          minW='200px'
          bg='background.surface.raised.base'
          borderRadius='xl'
          borderTop='1px solid'
          borderColor='gray.700'
        >
          <CardBody textAlign='center' py={6}>
            <Skeleton height='40px' width='100px' mx='auto' mb={2} />
            <Skeleton height='20px' width='120px' mx='auto' />
          </CardBody>
        </Card>
        <Card
          flex='1'
          minW='200px'
          bg='background.surface.raised.base'
          borderRadius='xl'
          borderTop='1px solid'
          borderColor='gray.700'
        >
          <CardBody textAlign='center' py={6}>
            <Skeleton height='40px' width='100px' mx='auto' mb={2} />
            <Skeleton height='20px' width='120px' mx='auto' />
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <Card
        flex='1'
        minW='200px'
        bg='background.surface.raised.base'
        borderRadius='xl'
        borderTop='1px solid'
        borderColor='gray.700'
      >
        <CardBody textAlign='center' py={6}>
          <Heading size='lg' fontWeight='bold' mb={2}>
            ${currentRewards ?? '0.00'}
          </Heading>
          <Text fontSize='md' color='text.subtle'>
            {translate('referral.currentRewards')}
          </Text>
        </CardBody>
      </Card>

      <Card
        flex='1'
        minW='200px'
        bg='background.surface.raised.base'
        borderRadius='xl'
        borderTop='1px solid'
        borderColor='gray.700'
      >
        <CardBody textAlign='center' py={6}>
          <Heading size='lg' fontWeight='bold' mb={2}>
            ${totalRewards ?? '0.00'}
          </Heading>
          <Text fontSize='md' color='text.subtle'>
            {translate('referral.totalRewards')}
          </Text>
        </CardBody>
      </Card>

      <Card
        flex='1'
        minW='200px'
        bg='background.surface.raised.base'
        borderRadius='xl'
        borderTop='1px solid'
        borderColor='gray.700'
      >
        <CardBody textAlign='center' py={6}>
          <HStack spacing={2} justify='center' mb={2}>
            <Icon as={FaUser} boxSize={5} color='text.subtle' />
            <Heading size='lg' fontWeight='bold'>
              {totalReferrals ?? 0}
            </Heading>
          </HStack>
          <Text fontSize='md' color='text.subtle'>
            {translate('referral.totalReferred')}
          </Text>
        </CardBody>
      </Card>
    </>
  )
}
