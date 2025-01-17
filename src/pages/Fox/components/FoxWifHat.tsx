import { Box, Container, Heading, Image, useColorModeValue } from '@chakra-ui/react'
import { foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxWifHatIcon from 'assets/foxwifhat-logo.png'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectAccountIdsByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useGetFoxWifHatClaims } from '../hooks/useGetFoxWifHatClaims'
import { FoxWifHatClaimRow } from './FoxWifHatClaimRow'

// @TODO: replace with proper foxwifhat asset id
const foxWifHatAssetId = foxAssetId

export const FoxWifHat = () => {
  const translate = useTranslate()
  const isFoxWifHatEnabled = useFeatureFlag('FoxPageFoxWifHatSection')
  const containerBackground = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

  const getFoxWifHatClaimsQuery = useGetFoxWifHatClaims()

  const handleClaim = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('Claim')
  }, [])

  const claimRows = useMemo(() => {
    const accountIds = accountIdsByChainId[fromAssetId(foxWifHatAssetId).chainId]
    const accountAddresses = accountIds?.map(accountId => fromAccountId(accountId).account)

    if (getFoxWifHatClaimsQuery.isLoading || !getFoxWifHatClaimsQuery.data) return null

    return Object.entries(getFoxWifHatClaimsQuery.data.claims).map(([accountId, claim]) => {
      if (!accountAddresses?.includes(accountId.toLowerCase())) return null

      return (
        <FoxWifHatClaimRow
          key={accountId}
          accountId={accountId}
          amountCryptoBaseUnit={claim.amount}
          assetId={foxWifHatAssetId}
          discountPercentDecimal={0.72}
          onClaim={handleClaim}
        />
      )
    })
  }, [
    handleClaim,
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
    </>
  )
}
