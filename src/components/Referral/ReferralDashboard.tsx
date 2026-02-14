import { Alert, AlertIcon, Flex, Stack, useToast } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { CreateCodeCard } from './CreateCodeCard'
import { ReferralCodeCard } from './ReferralCodeCard'
import { ReferralCodesManagementTable } from './ReferralCodesManagementTable'
import { ReferralCodesTable } from './ReferralCodesTable'
import { ReferralHeader } from './ReferralHeader'
import { ReferralStatsCards } from './ReferralStatsCards'
import { ReferralTabs } from './ReferralTabs'

import { RawText } from '@/components/Text'
import { useReferral } from '@/hooks/useReferral/useReferral'

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

type ReferralTab = 'referrals' | 'codes'

export const ReferralDashboard = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { referralStats, isLoadingReferralStats, error, createCode, isCreatingCode } = useReferral()

  const [newCodeInput, setNewCodeInput] = useState('')
  const [activeTab, setActiveTab] = useState<ReferralTab>('referrals')

  const defaultCode = useMemo(() => {
    if (!referralStats?.referralCodes.length) return null
    return referralStats.referralCodes.find(code => code.isActive) || referralStats.referralCodes[0]
  }, [referralStats])

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
      <Stack spacing={6} py={8}>
        <ReferralHeader />
        <Alert status='error'>
          <AlertIcon />
          <RawText>{error.message}</RawText>
        </Alert>
      </Stack>
    )
  }

  return (
    <Stack spacing={8} py={8}>
      <ReferralHeader />

      <Flex gap={4} flexWrap='wrap'>
        <ReferralCodeCard
          code={defaultCode?.code ?? null}
          isLoading={isLoadingReferralStats}
          onShareOnX={handleShareOnX}
          onCopyCode={handleCopyCode}
        />
        <ReferralStatsCards
          currentRewards={referralStats?.totalReferrerCommissionUsd}
          totalRewards={referralStats?.totalFeesCollectedUsd}
          totalReferrals={referralStats?.totalReferrals}
          isLoading={isLoadingReferralStats}
        />
      </Flex>

      <ReferralTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'referrals' && (
        <ReferralCodesTable
          codes={referralStats?.referralCodes ?? []}
          isLoading={isLoadingReferralStats}
          onShareOnX={handleShareOnX}
          onCopyCode={handleCopyCode}
        />
      )}

      {activeTab === 'codes' && (
        <Stack spacing={6}>
          <CreateCodeCard
            newCodeInput={newCodeInput}
            isCreating={isCreatingCode}
            onInputChange={setNewCodeInput}
            onGenerateRandom={handleGenerateRandom}
            onCreate={handleCreateCode}
          />
          <ReferralCodesManagementTable
            codes={referralStats?.referralCodes ?? []}
            isLoading={isLoadingReferralStats}
            onShareOnX={handleShareOnX}
            onCopyCode={handleCopyCode}
          />
        </Stack>
      )}
    </Stack>
  )
}
