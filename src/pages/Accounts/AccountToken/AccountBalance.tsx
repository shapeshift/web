import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, Card, CardBody, CardHeader, Flex } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetActions } from 'components/AssetHeader/AssetActions'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectUserCurrencyBalanceIncludingStakingByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AccountBalanceProps = {
  assetId: AssetId
  accountId: AccountId
  backPath?: string
  backLabel?: string
}

export const AccountBalance: React.FC<AccountBalanceProps> = ({
  assetId,
  accountId,
  backPath,
  backLabel,
}) => {
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const opportunitiesFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  // Add back in once we add the performance stuff in
  // const footerBg = useColorModeValue('white.100', 'rgba(255,255,255,.02)')

  const userCurrencyBalance = useAppSelector(s =>
    selectUserCurrencyBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, opportunitiesFilter),
  )
  const accountLabel = accountIdToLabel(accountId)
  if (!asset) return null
  return (
    <Card overflow='hidden'>
      <CardHeader display='flex' justifyContent='space-between' alignItems='center'>
        <Button
          size='sm'
          leftIcon={<ArrowBackIcon />}
          onClick={() => history.push(backPath ?? `/dashboard/accounts/${accountId}`)}
        >
          {backLabel ?? accountLabel}
        </Button>
        <Flex alignItems='center' gap={2}>
          <LazyLoadAvatar src={asset.icon} />
          <RawText fontWeight='bold'>{asset.name}</RawText>
        </Flex>
      </CardHeader>
      <CardBody
        gap={4}
        fontWeight='bold'
        display='flex'
        flexDir={{ base: 'column', md: 'row' }}
        alignItems='flex-start'
      >
        <Flex flexDir='column'>
          <Amount.Crypto
            color='text.subtle'
            value={cryptoHumanBalance}
            symbol={asset.symbol}
            lineHeight='shorter'
          />
          <Amount.Fiat value={userCurrencyBalance} fontSize='4xl' lineHeight='shorter' />
        </Flex>
        <AssetActions assetId={assetId} accountId={accountId} cryptoBalance={cryptoHumanBalance} />
      </CardBody>
      {/* 
      @TODO: Hide for now until we have the data to hook this up
      <CardFooter
        bg={footerBg}
        display='flex'
        alignItems='flex-start'
        justifyContent='space-between'
        gap={4}
      >
        <Heading lineHeight='shorter' flex={1}>
          Performance
        </Heading>
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
      </CardFooter> */}
    </Card>
  )
}
