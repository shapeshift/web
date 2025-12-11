import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Skeleton,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useClipboard,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { FaCopy, FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Main } from '@/components/Layout/Main'
import { RawText } from '@/components/Text'
import { useReferral } from '@/hooks/useReferral/useReferral'

const ReferralHeader = () => {
  const translate = useTranslate()
  return (
    <Stack px={8} py={4}>
      <Heading>{translate('navBar.referral')}</Heading>
      <RawText color='text.subtle'>{translate('referral.description')}</RawText>
    </Stack>
  )
}

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const Referral = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { referralStats, isLoadingReferralStats, error, createCode, isCreatingCode } =
    useReferral()

  const [newCodeInput, setNewCodeInput] = useState('')

  // Get the default/first referral code
  const defaultCode = useMemo(() => {
    if (!referralStats?.referralCodes.length) return null
    return referralStats.referralCodes.find(code => code.isActive) || referralStats.referralCodes[0]
  }, [referralStats])

  // Construct referral link
  const referralLink = useMemo(() => {
    if (!defaultCode) return ''
    return `${window.location.origin}/#/?ref=${defaultCode.code}`
  }, [defaultCode])

  const { onCopy, hasCopied } = useClipboard(referralLink)

  const handleCreateCode = useCallback(async () => {
    const code = newCodeInput.trim() || generateRandomCode()

    try {
      await createCode({ code })
      setNewCodeInput('')
      toast({
        title: translate('referral.codeCreated'),
        description: translate('referral.codeCreatedDescription', { code }),
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (err) {
      toast({
        title: translate('common.error'),
        description: err instanceof Error ? err.message : translate('referral.createCodeFailed'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }, [createCode, newCodeInput, toast, translate])

  const handleGenerateRandom = useCallback(() => {
    setNewCodeInput(generateRandomCode())
  }, [])

  if (error) {
    return (
      <Main headerComponent={<ReferralHeader />}>
        <Alert status='error'>
          <AlertIcon />
          <RawText>{error.message}</RawText>
        </Alert>
      </Main>
    )
  }

  return (
    <Main headerComponent={<ReferralHeader />}>
      <Stack spacing={6}>
        {/* Stats Cards */}
        <Flex gap={4} flexWrap='wrap'>
          <Card flex='1' minWidth='200px'>
            <CardBody>
              <Stat>
                <StatLabel>{translate('referral.totalReferrals')}</StatLabel>
                {isLoadingReferralStats ? (
                  <Skeleton height='40px' />
                ) : (
                  <StatNumber>{referralStats?.totalReferrals ?? 0}</StatNumber>
                )}
              </Stat>
            </CardBody>
          </Card>

          <Card flex='1' minWidth='200px'>
            <CardBody>
              <Stat>
                <StatLabel>{translate('referral.activeCodes')}</StatLabel>
                {isLoadingReferralStats ? (
                  <Skeleton height='40px' />
                ) : (
                  <StatNumber>{referralStats?.activeCodesCount ?? 0}</StatNumber>
                )}
              </Stat>
            </CardBody>
          </Card>

          <Card flex='1' minWidth='200px'>
            <CardBody>
              <Stat>
                <StatLabel>{translate('referral.feesCollected')}</StatLabel>
                {isLoadingReferralStats ? (
                  <Skeleton height='40px' />
                ) : (
                  <StatNumber>
                    ${referralStats?.totalReferrerCommissionUsd ?? '0.00'}
                  </StatNumber>
                )}
                <Text fontSize='xs' color='text.subtle' mt={1}>
                  {translate('referral.currentMonth')}
                </Text>
              </Stat>
            </CardBody>
          </Card>
        </Flex>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <Heading size='md'>{translate('referral.yourReferralLink')}</Heading>
          </CardHeader>
          <CardBody>
            <InputGroup size='lg'>
              <Input
                value={referralLink}
                isReadOnly
                placeholder={translate('referral.noCodeYet')}
                pr='4.5rem'
              />
              <InputRightElement width='4.5rem'>
                <Button
                  h='1.75rem'
                  size='sm'
                  onClick={onCopy}
                  isDisabled={!referralLink}
                  colorScheme={hasCopied ? 'green' : 'blue'}
                >
                  {hasCopied ? translate('common.copied') : translate('common.copy')}
                </Button>
              </InputRightElement>
            </InputGroup>
          </CardBody>
        </Card>

        {/* Create New Code */}
        <Card>
          <CardHeader>
            <Heading size='md'>{translate('referral.createNewCode')}</Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              <HStack>
                <Input
                  value={newCodeInput}
                  onChange={e => setNewCodeInput(e.target.value.toUpperCase())}
                  placeholder={translate('referral.enterCodeOrLeaveEmpty')}
                  maxLength={20}
                />
                <Button
                  onClick={handleGenerateRandom}
                  leftIcon={<FaPlus />}
                  variant='outline'
                  flexShrink={0}
                >
                  {translate('referral.random')}
                </Button>
                <Button
                  onClick={handleCreateCode}
                  colorScheme='blue'
                  isLoading={isCreatingCode}
                  flexShrink={0}
                >
                  {translate('referral.create')}
                </Button>
              </HStack>
            </Stack>
          </CardBody>
        </Card>

        {/* Referral Codes Table */}
        <Card>
          <CardHeader>
            <Heading size='md'>{translate('referral.yourCodes')}</Heading>
          </CardHeader>
          <CardBody>
            {isLoadingReferralStats ? (
              <Stack spacing={4}>
                <Skeleton height='40px' />
                <Skeleton height='40px' />
                <Skeleton height='40px' />
              </Stack>
            ) : referralStats?.referralCodes.length ? (
              <Box overflowX='auto'>
                <Table variant='simple'>
                  <Thead>
                    <Tr>
                      <Th>{translate('referral.code')}</Th>
                      <Th isNumeric>{translate('referral.usages')}</Th>
                      <Th>{translate('referral.status')}</Th>
                      <Th>{translate('referral.createdAt')}</Th>
                      <Th>{translate('common.actions')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {referralStats.referralCodes.map(code => (
                      <Tr key={code.code}>
                        <Td fontWeight='bold'>{code.code}</Td>
                        <Td isNumeric>
                          {code.usageCount}
                          {code.maxUses ? ` / ${code.maxUses}` : ''}
                        </Td>
                        <Td>
                          <Text
                            color={code.isActive ? 'green.500' : 'gray.500'}
                            fontWeight='medium'
                          >
                            {code.isActive
                              ? translate('referral.active')
                              : translate('referral.inactive')}
                          </Text>
                        </Td>
                        <Td>
                          {new Date(code.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Td>
                        <Td>
                          <IconButton
                            aria-label='Copy referral link'
                            icon={<FaCopy />}
                            size='sm'
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/#/?ref=${code.code}`,
                              )
                              toast({
                                title: translate('common.copied'),
                                status: 'success',
                                duration: 2000,
                              })
                            }}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <Text color='text.subtle' textAlign='center' py={8}>
                {translate('referral.noCodes')}
              </Text>
            )}
          </CardBody>
        </Card>
      </Stack>
    </Main>
  )
}
