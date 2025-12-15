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

type ReferralCodeFull = {
  code: string
  usageCount: number
  maxUses?: number | null
  isActive: boolean
  createdAt: string | Date
}

type ReferralCodesManagementTableProps = {
  codes: ReferralCodeFull[]
  isLoading: boolean
  onShareOnX: (code: string) => void
  onCopyCode: (code: string) => void
}

export const ReferralCodesManagementTable = ({
  codes,
  isLoading,
  onShareOnX,
  onCopyCode,
}: ReferralCodesManagementTableProps) => {
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
      <Flex py={3} px={1} color='text.subtle' fontSize='md'>
        <Box flex='1'>{translate('referral.code')}</Box>
        <Box width='120px' textAlign='right'>
          {translate('referral.usages')}
        </Box>
        <Box width='100px' textAlign='center'>
          {translate('referral.status')}
        </Box>
        <Box width='150px' textAlign='center'>
          {translate('referral.createdAt')}
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
              <Box width='120px' textAlign='right'>
                {code.usageCount}
                {code.maxUses ? ` / ${code.maxUses}` : ''}
              </Box>
              <Box width='100px' textAlign='center'>
                <Text
                  color={code.isActive ? 'green.500' : 'gray.500'}
                  fontWeight='medium'
                  fontSize='sm'
                >
                  {code.isActive ? translate('referral.active') : translate('referral.inactive')}
                </Text>
              </Box>
              <Box width='150px' textAlign='center' fontSize='sm'>
                {new Date(code.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
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
