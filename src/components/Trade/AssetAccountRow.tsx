import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Icon, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { capitalize, words } from 'lodash'
import { useMemo } from 'react'
import { FaWallet } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectFiatBalanceIncludingStakingByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetAccountRowProps = {
  accountId: AccountSpecifier
  onClick: () => void
  assetId?: AssetId
}

export const AssetAccountRow = ({ accountId, assetId, onClick }: AssetAccountRowProps) => {
  const backgroundColor = useColorModeValue('whiteAlpha.800', 'gray.850')
  const textColor = useColorModeValue('blackAlpha.800', 'whiteAlpha.800')
  const iconColor = useColorModeValue('blackAlpha.800', 'whiteAlpha.500')
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const rowAssetId = assetId ? assetId : feeAssetId
  const asset = useAppSelector(state => selectAssetById(state, rowAssetId))
  const filter = useMemo(() => ({ assetId: rowAssetId, accountId }), [rowAssetId, accountId])
  // i don't care if this change works - this is all dead code only used by old swapper
  const fiatBalance = useAppSelector(s => selectFiatBalanceIncludingStakingByFilter(s, filter))
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, filter),
  )

  const label = accountIdToLabel(accountId)

  if (!asset) return null
  return (
    <Button
      variant='ghost'
      size='lg'
      width='full'
      justifyContent='space-between'
      fontSize='sm'
      rightIcon={<ChevronRightIcon boxSize={6} />}
      onClick={onClick}
      backgroundColor={backgroundColor}
    >
      <Stack direction='row' alignItems='center' width='full'>
        <Icon as={FaWallet} color={iconColor} />
        <Stack spacing={0} width='full' justifyContent='center' alignItems='flex-start'>
          <RawText color={textColor}>Account #0</RawText>
          <RawText>{words(label).map(capitalize).join(' ')}</RawText>
        </Stack>
        <Stack spacing={0} width='full' justifyContent='center' alignItems='flex-start'>
          <Amount.Fiat color={textColor} value={fiatBalance} />
          <Amount.Crypto value={cryptoHumanBalance} symbol={asset?.symbol} />
        </Stack>
      </Stack>
    </Button>
  )
}
