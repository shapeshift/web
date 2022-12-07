import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { FaArrowDown } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectFirstAccountIdByChainId,
  selectUnbondingEntriesByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type WithdrawCardProps = {
  asset: Asset
  accountId?: AccountId | undefined
}

export const WithdrawCard = ({ asset, accountId: routeAccountId }: WithdrawCardProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress } = query

  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, asset.chainId))

  const filter = useMemo(
    () => ({
      accountId: routeAccountId ?? accountId,
      validatorAddress: contractAddress,
      assetId: asset.assetId,
    }),
    [accountId, asset.assetId, contractAddress, routeAccountId],
  )
  const undelegationEntries = useAppSelector(s => selectUnbondingEntriesByAccountId(s, filter))

  const hasClaim = useMemo(() => Boolean(undelegationEntries.length), [undelegationEntries])
  const textColor = useColorModeValue('black', 'white')
  const pendingColor = useColorModeValue('yellow.500', 'yellow.200')

  const undelegationNodes = useMemo(
    () =>
      undelegationEntries.map(({ amount, completionTime }) => {
        return (
          <Button
            variant='input'
            _hover={{ cursor: 'auto', borderRadius: 'auto', borderColor: 'auto' }}
            _active={{ cursor: 'auto', borderRadius: 'auto', borderColor: 'auto' }}
            width='full'
            maxHeight='auto'
            height='auto'
            alignItems='center'
            justifyContent='flex-start'
            textAlign='left'
            py={2}
            leftIcon={
              <IconCircle>
                <FaArrowDown />
              </IconCircle>
            }
          >
            <Stack spacing={0}>
              <Text color={textColor} translation='common.withdrawal' />
              <Text
                color={pendingColor}
                fontWeight='normal'
                lineHeight='shorter'
                translation={'common.pending'}
              />
            </Stack>
            <Stack spacing={0} ml='auto' textAlign='right'>
              <Amount.Crypto
                color={textColor}
                value={bnOrZero(amount).div(`1e+${asset.precision}`).toString()}
                symbol={asset.symbol}
                maximumFractionDigits={asset.precision}
              />
              <Text
                fontWeight='normal'
                lineHeight='shorter'
                translation={[
                  'defi.modals.cosmosOverview.availableDate',
                  { date: dayjs().to(dayjs.unix(completionTime)) },
                ]}
              />
            </Stack>
          </Button>
        )
      }),
    [asset.precision, asset.symbol, textColor, pendingColor, undelegationEntries],
  )

  return (
    <Stack px={8} py={6}>
      <Text fontWeight='medium' translation='defi.modals.cosmosOverview.withdrawals' />
      {!hasClaim ? (
        <Text color='gray.500' translation='defi.modals.cosmosOverview.emptyWithdraws' />
      ) : (
        undelegationNodes
      )}
    </Stack>
  )
}
