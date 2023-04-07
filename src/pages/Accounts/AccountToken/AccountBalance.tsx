import { Flex } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetActions } from 'components/AssetHeader/AssetActions'
import { Card } from 'components/Card/Card'
import {
  selectAssetById,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectFiatBalanceIncludingStakingByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AccountBalanceProps = {
  assetId: AssetId
  accountId: AccountId
}

export const AccountBalance: React.FC<AccountBalanceProps> = ({ assetId, accountId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])

  const fiatBalance = useAppSelector(s =>
    selectFiatBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  if (!asset) return null
  return (
    <Card>
      <Card.Body gap={4} fontWeight='bold' display='flex' alignItems='flex-start'>
        <Flex flexDir='column'>
          <Amount.Crypto
            color='gray.500'
            value={cryptoHumanBalance}
            symbol={asset.symbol}
            lineHeight='shorter'
          />
          <Amount.Fiat value={fiatBalance} fontSize='4xl' lineHeight='shorter' />
        </Flex>
        <AssetActions assetId={assetId} accountId={accountId} cryptoBalance={cryptoHumanBalance} />
      </Card.Body>
    </Card>
  )
}
