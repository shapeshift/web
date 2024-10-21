import type { FlexProps } from '@chakra-ui/react'
import {
  Box,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  Link,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text as CText,
} from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useDispatch } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { snapshotApi, useGetProposalsQuery } from 'state/apis/snapshot/snapshot'
import { selectAssetById, selectWalletAccountIds } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxGovernanceProposal } from './FoxGovernanceProposal'

const containerPaddingX = { base: 4, xl: 0 }
const headerTitleMb = { base: 4, md: 0 }
const headerTitleMaxWidth = { base: '100%', md: '50%' }
const headerSx: FlexProps['sx'] = {
  alignItems: { base: 'flex-start', md: 'center' },
  justifyContent: 'space-between',
  mb: 8,
  flexDir: {
    base: 'column',
    md: 'row',
  },
}

const flexPropsMd1 = { base: '1 0 auto', md: 1 }
const flexPropsMdAuto = { base: 1, md: 'auto' }
const widthBaseFull = { base: 'full' }
const widthMdAuto = { base: 'full', md: 'auto' }
const tabListPaddingLeft = { base: 6, md: 0 }

export const FoxGovernance = () => {
  const translate = useTranslate()
  const isFoxGovernanceEnabled = useFeatureFlag('FoxPageGovernance')
  const dispatch = useDispatch()
  const {
    data: { activeProposals, closedProposals } = { activeProposals: [], closedProposals: [] },
  } = useGetProposalsQuery()

  const accountIds = useAppSelector(selectWalletAccountIds)

  const foxEthAsset = useAppSelector(state => selectAssetById(state, foxAssetId))

  const votingPower = useAppSelector(state => selectVotingPower(state, { feeModel: 'SWAPPER' }))
  const isVotingPowerQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)

  useEffect(() => {
    dispatch(
      snapshotApi.endpoints.getVotingPower.initiate({ model: 'SWAPPER' }, { forceRefetch: true }),
    )
  }, [dispatch, accountIds])

  const ActiveProposals = useCallback(() => {
    if (!activeProposals.length)
      return <Text color='text.subtle' translation='foxPage.governance.noActiveProposals' />

    return (
      <>
        {activeProposals.map(proposal => (
          <FoxGovernanceProposal {...proposal} />
        ))}
      </>
    )
  }, [activeProposals])

  const ClosedProposals = useCallback(() => {
    if (!closedProposals.length)
      return <Text color='text.subtle' translation='foxPage.governance.noClosedProposals' />

    return (
      <>
        {closedProposals.map(proposal => (
          <FoxGovernanceProposal {...proposal} />
        ))}
      </>
    )
  }, [closedProposals])

  if (!isFoxGovernanceEnabled) return null
  if (!foxEthAsset) return null

  return (
    <>
      <Divider mb={4} />
      <Box py={4} px={containerPaddingX}>
        <Flex sx={headerSx}>
          <Box mb={headerTitleMb} maxWidth={headerTitleMaxWidth}>
            <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
              <CText as='span' me={2}>
                🏛️
              </CText>
              {translate('foxPage.governance.title')}
            </Heading>
            <Flex alignItems='center'>
              <Text
                fontSize='md'
                color='text.subtle'
                translation='foxPage.governance.description.0'
              />
              <Link
                colorScheme='blue'
                color='blue.300'
                href='https://forum.shapeshift.com/'
                isExternal
                mx={1}
              >
                {translate('foxPage.governance.description.1')}
              </Link>
              <Text
                fontSize='md'
                color='text.subtle'
                translation='foxPage.governance.description.2'
              />
            </Flex>
          </Box>

          <Card width='100%' maxWidth='400px'>
            <CardBody py={4} px={4}>
              <Flex alignItems='center' justifyContent='space-between'>
                <Box width='100%'>
                  <Text
                    fontSize='md'
                    color='text.subtle'
                    translation='foxPage.governance.totalVotingPower'
                  />

                  <Skeleton
                    isLoaded={Boolean(votingPower !== undefined && !isVotingPowerQueriesPending)}
                  >
                    <Amount.Crypto value={votingPower ?? '0'} symbol={foxEthAsset.symbol ?? ''} />
                  </Skeleton>
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </Flex>

        <Tabs isLazy lazyBehavior='keepMounted' variant='soft-rounded' size='sm'>
          <Flex flex={flexPropsMd1} width={widthBaseFull}>
            <TabList m={0} width={widthMdAuto} pl={tabListPaddingLeft}>
              <Tab flex={flexPropsMdAuto} me={2}>
                {translate('common.active')}
              </Tab>
              <Tab flex={flexPropsMdAuto}>{translate('common.closed')}</Tab>
            </TabList>
          </Flex>
          <TabPanels>
            <TabPanel px={0}>
              <ActiveProposals />
            </TabPanel>
            <TabPanel px={0}>
              <ClosedProposals />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </>
  )
}
