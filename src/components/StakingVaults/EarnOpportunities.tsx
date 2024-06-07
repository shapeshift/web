import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Card, CardBody, CardHeader, Heading, HStack, Tooltip } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId, fromAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { EarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { getMetadataForProvider } from 'state/slices/opportunitiesSlice/utils/getMetadataForProvider'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssetById,
  selectAssetEquityItemsByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: AssetId
  accountId?: AccountId
  isLoaded?: boolean
}

const arrowForwardIcon = <ArrowForwardIcon />

export const EarnOpportunities = ({ assetId, accountId }: EarnOpportunitiesProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const { setFarmingAccountId } = useFoxEth()

  useEffect(() => {
    if (accountId) {
      setFarmingAccountId(accountId)
    }
  }, [setFarmingAccountId, accountId])

  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])

  const equityRows = useAppSelector(state => selectAssetEquityItemsByFilter(state, filter))
  const shouldEnableOpportunities = useMemo(() => equityRows.length > 0, [equityRows.length])

  const allRows = useMemo(
    () =>
      !asset
        ? []
        : lpOpportunities.concat(stakingOpportunities).filter(
            row =>
              row.assetId.toLowerCase() === asset.assetId.toLowerCase() ||
              (row.underlyingAssetIds.length && row.underlyingAssetIds.includes(asset.assetId)) ||
              // show foxy opportunity in the foxy asset page
              (row.assetId === foxAssetId && asset.assetId === foxyAssetId),
          ),
    [asset, lpOpportunities, stakingOpportunities],
  )

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const { isReadOnly, type, provider, contractAddress, chainId, assetId, rewardAddress } =
        opportunity

      if (!shouldEnableOpportunities) return

      if (isReadOnly) {
        const url = getMetadataForProvider(opportunity.provider)?.url
        url && window.open(url, '_blank')
      }

      const { assetReference, assetNamespace } = fromAssetId(assetId)
      if (!isConnected) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          chainId,
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress: opportunity.highestBalanceAccountAddress,
          rewardId: rewardAddress,
          provider,
          type,
          modal: 'overview',
        }),
        state: { background: location },
      })
    },
    [dispatch, history, isConnected, location, shouldEnableOpportunities],
  )

  if (!asset) return null
  if (allRows.length === 0) return null

  return (
    <Card variant='dashboard'>
      <CardHeader
        flexDir='row'
        display='flex'
        borderBottom={!Boolean(allRows?.length) ? 'none' : undefined}
      >
        <HStack gap={6} width='full'>
          <Box>
            <Heading as='h5'>
              <Text translation='navBar.defi' />
            </Heading>
            <Text color='text.subtle' translation='defi.earnBody' fontWeight='normal' />
          </Box>
          <Box flex={1} textAlign='right'>
            <Button
              size='sm'
              variant='link'
              colorScheme='blue'
              ml='auto'
              as={NavLink}
              to='/earn'
              rightIcon={arrowForwardIcon}
            >
              <Text translation='common.seeAll' />
            </Button>
          </Box>
        </HStack>
      </CardHeader>
      {Boolean(allRows?.length) && (
        <Tooltip
          label={translate('defi.noAccountsOpportunities')}
          isDisabled={shouldEnableOpportunities}
        >
          <CardBody
            sx={
              !shouldEnableOpportunities
                ? {
                    cursor: 'not-allowed',
                    opacity: 0.2,
                    filter: 'grayscale(1)',
                  }
                : undefined
            }
            pt={0}
            px={4}
          >
            <Box pointerEvents={shouldEnableOpportunities ? 'all' : 'none'}>
              <StakingTable data={allRows} onClick={handleClick} />
            </Box>
          </CardBody>
        </Tooltip>
      )}
    </Card>
  )
}
