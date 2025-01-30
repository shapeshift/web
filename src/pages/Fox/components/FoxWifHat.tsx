import { Box, Container, Heading, Image, Skeleton, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { foxWifHatAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxWifHatIcon from 'assets/foxwifhat-logo.png'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import {
  FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS,
  FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS,
  FOX_WIF_HAT_MINIMUM_AMOUNT_BASE_UNIT,
} from 'lib/fees/constant'
import { calculateFees } from 'lib/fees/model'

import { DUMMY_TRADE_AMOUNT_OVER_TRESHOLD_USD } from '../constant'
import { useFoxWifHatMerkleTreeQuery } from '../hooks/useFoxWifHatMerkleTreeQuery'
import { FoxWifHatClaimModal } from './FoxWifHatClaimModal'
import { FoxWifHatClaimRow } from './FoxWifHatClaimRow'

export const FoxWifHat = () => {
  const translate = useTranslate()
  const isFoxWifHatEnabled = useFeatureFlag('FoxPageFoxWifHatSection')
  const containerBackground = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const [isClaimModalOpened, setIsClaimModalOpened] = useState(false)
  const [claimAccountId, setClaimAccountId] = useState<AccountId | undefined>()
  const getFoxWifHatMerkleTreeQuery = useFoxWifHatMerkleTreeQuery()
  const {
    date: { toShortDate },
  } = useLocaleFormatter()

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

  const discountPercent = useMemo(() => {
    return calculateFees({
      tradeAmountUsd: bn(DUMMY_TRADE_AMOUNT_OVER_TRESHOLD_USD),
      foxHeld: bn(0),
      feeModel: 'SWAPPER',
      thorHeld: bn(0),
      foxWifHatHeldCryptoBaseUnit: bn(FOX_WIF_HAT_MINIMUM_AMOUNT_BASE_UNIT),
      isSnapshotApiQueriesRejected: false,
    }).foxDiscountPercent.toFixed(2)
  }, [])

  const claimRows = useMemo(() => {
    if (getFoxWifHatMerkleTreeQuery.isFetching) return <Skeleton height='64px' width='100%' />

    if (!getFoxWifHatMerkleTreeQuery.data)
      return (
        <Text color='text.subtle' translation='foxPage.foxWifHat.noClaims' fontSize='md' p={4} />
      )

    return Object.entries(getFoxWifHatMerkleTreeQuery.data).map(([accountId, claim]) => {
      return (
        <FoxWifHatClaimRow
          key={accountId}
          accountId={accountId}
          amountCryptoBaseUnit={bnOrZero(claim.amount).toFixed()}
          assetId={foxWifHatAssetId}
          // eslint-disable-next-line react-memo/require-usememo
          onClaim={() => handleClaimModalOpen(accountId)}
        />
      )
    })
  }, [
    handleClaimModalOpen,
    getFoxWifHatMerkleTreeQuery.isFetching,
    getFoxWifHatMerkleTreeQuery.data,
  ])

  const discountText = useMemo(() => {
    return translate('foxPage.foxWifHat.discount', {
      percent: discountPercent,
      date: toShortDate(FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS),
    })
  }, [discountPercent, translate, toShortDate])

  if (!isFoxWifHatEnabled) return null
  // Don't show the fox wif hat section before the campaign starts
  if (Date.now() < FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS) return null

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

          <Text color='text.subtle' translation={discountText} fontSize='sm' />
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
