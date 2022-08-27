import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Icon, Stack, useColorModeValue } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { capitalize, words } from 'lodash'
import { useMemo } from 'react'
import { FaWallet } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectTotalCryptoBalanceWithDelegations,
  selectTotalFiatBalanceWithDelegations,
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
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, asset?.chainId),
  )
  const filter = useMemo(
    () => ({ assetId: rowAssetId, accountId, accountSpecifier }),
    [rowAssetId, accountId, accountSpecifier],
  )
  const fiatBalance = useAppSelector(state => selectTotalFiatBalanceWithDelegations(state, filter))
  const cryptoHumanBalance = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, filter),
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
