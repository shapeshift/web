import { Box, Container, Heading, Image, Skeleton, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { foxWifHatAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxWifHatIcon from 'assets/foxwifhat-logo.png'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectAccountIdsByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxWifHatMerkleTreeQuery } from '../hooks/useFoxWifHatMerkleTreeQuery'
import { FoxWifHatClaimModal } from './FoxWifHatClaimModal'
import { FoxWifHatClaimRow } from './FoxWifHatClaimRow'

export const FoxWifHat = () => {
  const translate = useTranslate()
  const isFoxWifHatEnabled = useFeatureFlag('FoxPageFoxWifHatSection')
  const containerBackground = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const [isClaimModalOpened, setIsClaimModalOpened] = useState(false)
  const [claimAccountId, setClaimAccountId] = useState<AccountId | undefined>()
  const getFoxWifHatClaimsQuery = useFoxWifHatMerkleTreeQuery()

  const handleClaimModalClose = useCallback(() => {
    setClaimAccountId(undefined)
    setIsClaimModalOpened(false)
  }, [setClaimAccountId, setIsClaimModalOpened])

  const handleClaimModalOpen = useCallback(
    (accountId: AccountId) => {
      setClaimAccountId(accountId)
      setIsClaimModalOpened(true)
    },
    [setClaimAccountId, setIsClaimModalOpened],
  )

  const claimRows = useMemo(() => {
    const accountIds = accountIdsByChainId[fromAssetId(foxWifHatAssetId).chainId]

    if (getFoxWifHatClaimsQuery.isLoading || !getFoxWifHatClaimsQuery.data)
      return <Skeleton height='64px' width='100%' />

    return Object.entries(getFoxWifHatClaimsQuery.data.claims).map(([address, claim]) => {
      const accountId = accountIds?.find(
        accountId => fromAccountId(accountId).account === address.toLowerCase(),
      )

      if (!accountId) return null

      return (
        <FoxWifHatClaimRow
          key={accountId}
          accountId={accountId}
          amountCryptoBaseUnit={bnOrZero(claim.amount).toFixed()}
          assetId={foxWifHatAssetId}
          discountPercentDecimal={0.72}
          // eslint-disable-next-line react-memo/require-usememo
          onClaim={() => handleClaimModalOpen(accountId)}
        />
      )
    })
  }, [
    handleClaimModalOpen,
    accountIdsByChainId,
    getFoxWifHatClaimsQuery.data,
    getFoxWifHatClaimsQuery.isLoading,
  ])

  if (!isFoxWifHatEnabled) return null

  return (
    <>
      <Box py={10} bg={containerBackground}>
        <Container maxW='container.4xl' px={8}>
          <Heading as='h2' fontSize='2xl' display='flex' alignItems='center' mb={4}>
            <Image src={FoxWifHatIcon} height='32px' width='auto' me={2} />
            {translate('foxPage.foxWifHat.title')}
          </Heading>

          <Text color='text.subtle' translation='foxPage.foxWifHat.description' />

          <Box bg={containerBackground} borderRadius='lg' mt={8} mb={4}>
            {claimRows}
          </Box>

          <Text color='text.subtle' translation='foxPage.foxWifHat.discount' fontSize='sm' />
        </Container>
      </Box>

      <FoxWifHatClaimModal
        isOpen={isClaimModalOpened}
        onClose={handleClaimModalClose}
        accountId={claimAccountId}
      />
    </>
  )
}
