import { Button, Flex, Skeleton, Stack, Text as CText } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { selectAssetById, selectPortfolioFiatBalanceByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type FoxFarmingEmptyProps = {
  assets: Asset[]
  assetId: AssetId
  apy: string | undefined
  onClick?: () => void
  opportunityName: string
}

export const FoxFarmingEmpty = ({
  assets,
  assetId,
  apy,
  onClick,
  opportunityName,
}: FoxFarmingEmptyProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const fiatBalance =
    useAppSelector(state => selectPortfolioFiatBalanceByAssetId(state, { assetId })) ?? '0'
  const history = useHistory()
  const {
    receive: { open },
  } = useModal()

  const handleLpDepositClick = useCallback(() => {
    return history.push(
      '?type=lp&provider=Uniswap%20V2&chainId=eip155%3A1&assetNamespace=erc20&assetReference=0x470e8de2ebaef52014a47cb5e6af86884947f08c&rewardId=&modal=deposit',
    )
  }, [history])

  const renderFooter = useMemo(() => {
    if (!asset) return null
    return (
      <Flex flexDir='column' gap={4} width='full'>
        {bnOrZero(fiatBalance).gt(0) ? (
          <Button size='lg' width='full' colorScheme='blue' onClick={onClick}>
            <Text translation='common.continue' />
          </Button>
        ) : (
          <>
            <RawText textAlign='center' fontWeight='medium'>
              <Button variant='link' textDecoration='underline' onClick={() => open({ asset })}>
                {translate('common.receive')}
              </Button>{' '}
              {translate('defi.modals.foxFarmingOverview.emptyBalanceBody')}
            </RawText>
            <Button size='lg' width='full' colorScheme='blue' onClick={handleLpDepositClick}>
              {translate('defi.modals.foxFarmingOverview.emptyCta')}
            </Button>
          </>
        )}
      </Flex>
    )
  }, [asset, fiatBalance, handleLpDepositClick, onClick, open, translate])

  return (
    <DefiModalContent>
      <EmptyOverview assets={assets} footer={renderFooter}>
        <Stack spacing={1} justifyContent='center' mb={4}>
          <Text
            translation={[
              'defi.modals.foxFarmingOverview.header',
              { opportunity: opportunityName },
            ]}
          />
          <CText color='green.500'>
            <Skeleton isLoaded={Boolean(apy)}>
              <Amount.Percent value={apy ?? ''} suffix='APR' />
            </Skeleton>
          </CText>
        </Stack>
        <RawText color='gray.500'>
          <Text as='span' translation='defi.modals.foxFarmingOverview.body' />{' '}
          <Text as='span' translation='defi.modals.foxFarmingOverview.rewards' />
        </RawText>
      </EmptyOverview>
    </DefiModalContent>
  )
}
