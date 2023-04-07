import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetActions } from 'components/AssetHeader/AssetActions'
import { Card } from 'components/Card/Card'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { EarnOpportunities } from 'components/StakingVaults/EarnOpportunities'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
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
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const footerBg = useColorModeValue('white.100', 'rgba(255,255,255,.02)')

  const fiatBalance = useAppSelector(s =>
    selectFiatBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const accountLabel = accountIdToLabel(accountId)
  if (!asset) return null
  return (
    <Card variant='footer-stub' overflow='hidden'>
      <Card.Body display='flex' justifyContent='space-between' alignItems='center'>
        <Button
          size='sm'
          leftIcon={<ArrowBackIcon />}
          onClick={() => history.push(`/dashboard/accounts/${accountId}`)}
        >
          {accountLabel}
        </Button>
        <LazyLoadAvatar src={asset.icon} />
      </Card.Body>
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
      <Card.Body px={2}>
        <EarnOpportunities assetId={assetId} accountId={accountId} />
      </Card.Body>
      <Card.Footer
        bg={footerBg}
        display='flex'
        alignItems='flex-start'
        justifyContent='space-between'
        gap={4}
      >
        <Card.Heading lineHeight='shorter' flex={1}>
          Performance
        </Card.Heading>
        <StatGroup gap={8} flex={1}>
          <Stat>
            <StatLabel lineHeight='shorter'>24hr return</StatLabel>
            <StatNumber>
              <Amount.Percent value='0.2' autoColor />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel lineHeight='shorter'>24hr return</StatLabel>
            <StatNumber>
              <Amount.Percent value='0.2' autoColor />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel lineHeight='shorter'>24hr return</StatLabel>
            <StatNumber>
              <Amount.Percent value='0.2' autoColor />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Footer>
    </Card>
  )
}
