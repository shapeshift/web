import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Icon, SimpleGridProps, Stack } from '@chakra-ui/react'
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
} & SimpleGridProps

export const AssetAccountRow = ({ accountId, assetId, onClick }: AssetAccountRowProps) => {
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
      justifyContent='space-between'
      fontSize='sm'
      rightIcon={<ChevronRightIcon boxSize={6} />}
      onClick={onClick}
    >
      <Stack direction='row' alignItems='center' width='full'>
        <Icon as={FaWallet} color='whiteAlpha.500' />
        <Stack spacing={0} width='full' justifyContent='center' alignItems='flex-start'>
          <RawText color='whiteAlpha.800'>Account #0</RawText>
          <RawText>{words(label).map(capitalize).join(' ')}</RawText>
        </Stack>
        <Stack spacing={0} width='full' justifyContent='center' alignItems='flex-start'>
          <Amount.Fiat color='whiteAlpha.800' value={fiatBalance} />
          <Amount.Crypto value={cryptoHumanBalance} symbol={asset?.symbol} />
        </Stack>
      </Stack>
    </Button>
  )
}
