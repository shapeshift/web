import type { StackDirection } from '@chakra-ui/react'
import { Button, Flex, HStack, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { WalletIcon } from 'components/Icons/WalletIcon'
import { bn } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import {
  selectAccountIdsByChainId,
  selectAccountNumberByAccountId,
  selectAssetById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DUMMY_TRADE_AMOUNT_OVER_TRESHOLD_USD } from '../constant'
import { useFoxWifHatClaimedQueryQuery } from '../hooks/useFoxWifHatClaimedQuery'
import { useFoxWifHatMerkleTreeQuery } from '../hooks/useFoxWifHatMerkleTreeQuery'

type FoxWifHatClaimRowProps = {
  accountId: string
  amountCryptoBaseUnit: string
  assetId: AssetId
  onClaim?: () => void
}

const actionsPaddingLeft = { base: 10, md: 0 }
const columnWidth = { base: '100%', md: '50%' }
const columnDirection: StackDirection = { base: 'column', md: 'row' }
const columnAlignItems = { md: 'center' }
const columnJustifyContent = { md: 'space-between' }
const columnSpacing = { base: 4, md: 12, lg: 24, xl: 48 }

export const FoxWifHatClaimRow = ({
  accountId,
  amountCryptoBaseUnit,
  assetId,
  onClaim,
}: FoxWifHatClaimRowProps) => {
  const textColor = useColorModeValue('gray.500', 'gray.400')
  const translate = useTranslate()
  const foxWifHatAsset = useAppSelector(state => selectAssetById(state, assetId))
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, { accountId }),
  )
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const getFoxWifHatMerkleTreeQuery = useFoxWifHatMerkleTreeQuery()

  const numberAccounts = useMemo(() => {
    return accountIdsByChainId[fromAssetId(assetId).chainId]?.length ?? 0
  }, [accountIdsByChainId, assetId])

  const claim = useMemo(() => {
    const claim = getFoxWifHatMerkleTreeQuery.data?.[accountId]
    if (!claim) return null

    return claim
  }, [getFoxWifHatMerkleTreeQuery.data, accountId])

  const amountCryptoPrecision = useMemo(() => {
    return fromBaseUnit(amountCryptoBaseUnit, foxWifHatAsset?.precision ?? 0)
  }, [amountCryptoBaseUnit, foxWifHatAsset])

  const { data: isClaimed } = useFoxWifHatClaimedQueryQuery({ index: claim?.index })

  const discountPercent = useMemo(() => {
    return calculateFees({
      tradeAmountUsd: bn(DUMMY_TRADE_AMOUNT_OVER_TRESHOLD_USD),
      foxHeld: bn(0),
      feeModel: 'SWAPPER',
      thorHeld: bn(0),
      foxWifHatHeldCryptoBaseUnit: bn(amountCryptoBaseUnit),
      isSnapshotApiQueriesRejected: false,
    }).foxDiscountPercent.toFixed(2)
  }, [amountCryptoBaseUnit])

  return (
    <Stack
      width='full'
      px={6}
      py={4}
      spacing={columnSpacing}
      direction={columnDirection}
      alignItems={columnAlignItems}
      justifyContent={columnJustifyContent}
    >
      <Flex width={columnWidth} alignItems='center' justifyContent='space-between'>
        <HStack spacing={4}>
          <WalletIcon color={textColor} boxSize={6} />
          <Flex direction='column' alignItems='flex-start'>
            <Text fontWeight='bold' fontSize='sm'>
              {middleEllipsis(fromAccountId(accountId).account)}
            </Text>
            {numberAccounts > 1 ? (
              <Text color={textColor} fontSize='xs'>
                {translate('accounts.accountNumber', { accountNumber })}
              </Text>
            ) : null}
          </Flex>
        </HStack>

        <Amount.Crypto
          value={amountCryptoPrecision}
          symbol={foxWifHatAsset?.symbol ?? ''}
          fontWeight='bold'
          maximumFractionDigits={2}
        />
      </Flex>

      <Flex
        width={columnWidth}
        alignItems='center'
        justifyContent='space-between'
        pl={actionsPaddingLeft}
      >
        <Text color='green.500' fontSize='sm' fontWeight='bold'>
          {translate('foxPage.foxWifHat.discountText', {
            percent: discountPercent,
          })}
        </Text>

        <Button
          colorScheme={isClaimed ? 'green' : 'gray'}
          size='sm'
          onClick={onClaim}
          isDisabled={isClaimed}
        >
          {isClaimed
            ? translate('foxPage.foxWifHat.claimed')
            : translate('foxPage.foxWifHat.claim')}
        </Button>
      </Flex>
    </Stack>
  )
}
