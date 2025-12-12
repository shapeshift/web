import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { FaCopy, FaPlus, FaUser } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
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
  const { referralStats, isLoadingReferralStats, error, createCode, isCreatingCode } = useReferral()
  const activeTabBg = useColorModeValue('background.surface.raised.base', 'white')
  const activeTabColor = useColorModeValue('white', 'black')

  const [newCodeInput, setNewCodeInput] = useState('')

  const defaultCode = useMemo(() => {
    if (!referralStats?.referralCodes.length) return null
    return referralStats.referralCodes.find(code => code.isActive) || referralStats.referralCodes[0]
  }, [referralStats])

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

  const [activeTab, setActiveTab] = useState<'referrals' | 'leaderboard' | 'codes'>('referrals')

  const handleShareOnX = useCallback((code: string) => {
    const shareUrl = `${window.location.origin}/#/?ref=${code}`
    const text = `Join me on ShapeShift using my referral code ${code}!`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(shareUrl)}`
    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
  }, [])

  const handleCopyCode = useCallback(
    (code: string) => {
      const shareUrl = `${window.location.origin}/#/?ref=${code}`
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: translate('common.copied'),
        status: 'success',
        duration: 2000,
      })
    },
    [toast, translate],
  )

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
      <Stack spacing={8}>
        <Flex gap={4} flexWrap='wrap'>
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
                    {isLoadingReferralStats ? (
                      <Skeleton height='40px' width='120px' />
                    ) : defaultCode ? (
                      defaultCode.code
                    ) : (
                      'N/A'
                    )}
                  </Heading>
                </Flex>
                {defaultCode && (
                  <Flex alignItems='center' gap={2}>
                    <IconButton
                      aria-label='Share on X'
                      icon={<FaXTwitter />}
                      size='md'
                      colorScheme='whiteAlpha'
                      borderRadius='100%'
                      bg='whiteAlpha.200'
                      onClick={() => handleShareOnX(defaultCode.code)}
                    />
                    <IconButton
                      aria-label='Copy link'
                      icon={<FaCopy />}
                      size='md'
                      colorScheme='whiteAlpha'
                      bg='whiteAlpha.200'
                      borderRadius='100%'
                      onClick={() => handleCopyCode(defaultCode.code)}
                    />
                  </Flex>
                )}
              </Flex>
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
                {isLoadingReferralStats ? (
                  <Skeleton height='40px' width='100px' mx='auto' />
                ) : (
                  `$${referralStats?.totalReferrerCommissionUsd ?? '0.00'}`
                )}
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
                {isLoadingReferralStats ? (
                  <Skeleton height='40px' width='100px' mx='auto' />
                ) : (
                  `$${referralStats?.totalFeesCollectedUsd ?? '0.00'}`
                )}
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
                  {isLoadingReferralStats ? (
                    <Skeleton height='40px' width='60px' />
                  ) : (
                    referralStats?.totalReferrals ?? 0
                  )}
                </Heading>
              </HStack>
              <Text fontSize='md' color='text.subtle'>
                {translate('referral.totalReferred')}
              </Text>
            </CardBody>
          </Card>
        </Flex>

        <HStack spacing={3}>
          <Button
            onClick={() => setActiveTab('referrals')}
            colorScheme={activeTab === 'referrals' ? 'whiteAlpha' : 'gray'}
            bg={activeTab === 'referrals' ? activeTabBg : 'background.surface.raised.base'}
            color={activeTab === 'referrals' ? activeTabColor : 'text.subtle'}
            borderRadius='full'
            border='1px solid'
            borderColor='gray.700'
            px={4}
            _hover={{
              bg: activeTab === 'referrals' ? activeTabBg : 'whiteAlpha.100',
            }}
          >
            {translate('referral.referrals')}
          </Button>
          <Button
            onClick={() => setActiveTab('codes')}
            colorScheme={activeTab === 'codes' ? 'whiteAlpha' : 'gray'}
            bg={activeTab === 'codes' ? activeTabBg : 'background.surface.raised.base'}
            color={activeTab === 'codes' ? activeTabColor : 'text.subtle'}
            border='1px solid'
            borderColor='gray.700'
            borderRadius='full'
            px={4}
            _hover={{
              bg: activeTab === 'codes' ? activeTabBg : 'whiteAlpha.100',
            }}
          >
            {translate('referral.codes')}
          </Button>

          <Button
            isDisabled
            colorScheme='gray'
            border='1px solid'
            borderColor='gray.700'
            bg='transparent'
            color='text.subtle'
            borderRadius='full'
            px={4}
            cursor='not-allowed'
          >
            <HStack spacing={2}>
              <Text>{translate('referral.dashboard')}</Text>
              <Badge colorScheme='blue' fontSize='xs' borderRadius='full'>
                Coming Soon
              </Badge>
            </HStack>
          </Button>
        </HStack>

        {activeTab === 'referrals' && (
          <Stack spacing={3}>
            {isLoadingReferralStats ? (
              <Stack spacing={3}>
                <Skeleton height='60px' borderRadius='xl' />
                <Skeleton height='60px' borderRadius='xl' />
                <Skeleton height='60px' borderRadius='xl' />
              </Stack>
            ) : referralStats?.referralCodes.length ? (
              <>
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

                {referralStats.referralCodes.map(code => (
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
                              onClick={() => handleShareOnX(code.code)}
                            />
                            <IconButton
                              aria-label='Copy link'
                              icon={<FaCopy />}
                              size='sm'
                              variant='ghost'
                              onClick={() => handleCopyCode(code.code)}
                            />
                          </HStack>
                        </Box>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </>
            ) : (
              <Card bg='blackAlpha.300' borderRadius='xl'>
                <CardBody>
                  <Text color='text.subtle' textAlign='center' py={8}>
                    {translate('referral.noCodes')}
                  </Text>
                </CardBody>
              </Card>
            )}
          </Stack>
        )}

        {activeTab === 'codes' && (
          <Stack spacing={6}>
            <Card
              bg='background.surface.raised.base'
              borderRadius='xl'
              borderTop='1px solid'
              borderColor='gray.700'
              py={2}
            >
              <CardHeader>
                <Heading size='md'>{translate('referral.createNewCode')}</Heading>
              </CardHeader>
              <CardBody>
                <HStack>
                  <Input
                    value={newCodeInput}
                    onChange={e => setNewCodeInput(e.target.value.toUpperCase())}
                    placeholder={translate('referral.enterCodeOrLeaveEmpty')}
                    maxLength={20}
                    bg='background.surface.raised.base'
                    border='none'
                  />
                  <Button
                    onClick={handleGenerateRandom}
                    leftIcon={<FaPlus />}
                    variant='outline'
                    flexShrink={0}
                    borderRadius='full'
                    border='1px solid'
                    borderColor='gray.700'
                    backgroundColor='background.surface.raised.base'
                  >
                    {translate('referral.random')}
                  </Button>
                  <Button
                    onClick={handleCreateCode}
                    colorScheme='blue'
                    isLoading={isCreatingCode}
                    flexShrink={0}
                    borderRadius='full'
                  >
                    {translate('referral.create')}
                  </Button>
                </HStack>
              </CardBody>
            </Card>

            <Stack spacing={3}>
              {isLoadingReferralStats ? (
                <Stack spacing={3}>
                  <Skeleton height='60px' borderRadius='xl' />
                  <Skeleton height='60px' borderRadius='xl' />
                  <Skeleton height='60px' borderRadius='xl' />
                </Stack>
              ) : referralStats?.referralCodes.length ? (
                <>
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

                  {referralStats.referralCodes.map(code => (
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
                              {code.isActive
                                ? translate('referral.active')
                                : translate('referral.inactive')}
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
                                onClick={() => handleShareOnX(code.code)}
                              />
                              <IconButton
                                aria-label='Copy link'
                                icon={<FaCopy />}
                                size='sm'
                                variant='ghost'
                                onClick={() => handleCopyCode(code.code)}
                              />
                            </HStack>
                          </Box>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </>
              ) : (
                <Card bg='blackAlpha.300' borderRadius='xl'>
                  <CardBody>
                    <Text color='text.subtle' textAlign='center' py={8}>
                      {translate('referral.noCodes')}
                    </Text>
                  </CardBody>
                </Card>
              )}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Main>
  )
}
