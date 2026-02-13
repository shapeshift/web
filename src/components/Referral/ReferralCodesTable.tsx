import {
  Box,
  Card,
  CardBody,
  Flex,
  HStack,
  IconButton,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import { FaCopy } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'

type ReferralCode = {
  code: string
  usageCount: number
  swapVolumeUsd?: string
}

type ReferralCodesTableProps = {
  codes: ReferralCode[]
  isLoading: boolean
  onShareOnX: (code: string) => void
  onCopyCode: (code: string) => void
}

export const ReferralCodesTable = ({
  codes,
  isLoading,
  onShareOnX,
  onCopyCode,
}: ReferralCodesTableProps) => {
  const translate = useTranslate()

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton height='60px' borderRadius='xl' />
        <Skeleton height='60px' borderRadius='xl' />
        <Skeleton height='60px' borderRadius='xl' />
      </Stack>
    )
  }

  if (!codes.length) {
    return (
      <Card bg='background.surface.raised.base' borderRadius='xl'>
        <CardBody>
          <Text color='text.subtle' textAlign='center' py={8}>
            {translate('referral.noCodes')}
          </Text>
        </CardBody>
      </Card>
    )
  }

  return (
    <Stack spacing={3}>
      <Flex px={6} py={3} color='text.subtle' fontSize='sm'>
        <Box flex='1'>{translate('referral.address')}</Box>
        <Box width='150px' textAlign='right'>
          {translate('referral.referrals')}
        </Box>
        <Box width='150px' textAlign='right'>
          {translate('referral.volume')}
        </Box>
        <Box width='120px' />
      </Flex>

      {codes.map(code => (
        <Card key={code.code} bg='background.surface.raised.base' borderRadius='xl'>
          <CardBody py={4} px={6}>
            <Flex align='center'>
              <Box flex='1' fontWeight='bold'>
                {code.code}
              </Box>
              <Box width='150px' textAlign='right'>
                {code.usageCount}
              </Box>
              <Box width='150px' textAlign='right'>
                ${code.swapVolumeUsd || '0.00'}
              </Box>
              <Box width='120px'>
                <HStack spacing={2} justify='flex-end'>
                  <IconButton
                    aria-label='Share on X'
                    icon={<FaXTwitter />}
                    size='sm'
                    colorScheme='twitter'
                    variant='ghost'
                    onClick={() => onShareOnX(code.code)}
                  />
                  <IconButton
                    aria-label='Copy link'
                    icon={<FaCopy />}
                    size='sm'
                    variant='ghost'
                    onClick={() => onCopyCode(code.code)}
                  />
                </HStack>
              </Box>
            </Flex>
          </CardBody>
        </Card>
      ))}
    </Stack>
  )
}
