import { ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  IconButton,
  Input,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TagLeftIcon,
} from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'

import { Borrow } from './components/Borrow/Borrow'
import { Faq } from './components/Faq'
import { DynamicComponent } from './components/PoolStat'

const containerPadding = { base: 6, '2xl': 8 }
const tabSelected = { color: 'text.base' }
const maxWidth = { base: '100%', md: '450px' }
const PoolHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const handleBack = useCallback(() => {
    history.goBack()
  }, [history])
  return (
    <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
      <Flex gap={4} alignItems='center'>
        <IconButton icon={<ArrowBackIcon />} aria-label='Back to lending' onClick={handleBack} />
        <Heading>{translate('lending.lending')}</Heading>
      </Flex>
    </Container>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }

export const Pool = () => {
  const [value, setValue] = useState<number | string>()
  return (
    <Main headerComponent={<PoolHeader />}>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Card>
            <CardHeader px={8} py={8}>
              <Flex gap={4} alignItems='center'>
                <AssetIcon assetId={btcAssetId} />
                <Heading as='h3'>Bitcoin</Heading>
              </Flex>
            </CardHeader>
            <CardBody gap={8} display='flex' flexDir='column' px={8} pb={8} pt={0}>
              <Text translation='lending.myLoanInformation' fontWeight='medium' />
              <Flex>
                <DynamicComponent
                  label='lending.collateralBalance'
                  toolTipLabel='tbd'
                  component={
                    <Amount.Crypto fontSize='2xl' value='25' symbol='BTC' fontWeight='medium' />
                  }
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
                <DynamicComponent
                  label='lending.collateralValue'
                  toolTipLabel='tbd'
                  component={<Amount.Fiat fontSize='2xl' value={25} fontWeight='medium' />}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
              </Flex>
              <Flex>
                <DynamicComponent
                  label='lending.debtBalance'
                  toolTipLabel='tbd'
                  component={<Amount.Fiat fontSize='2xl' value='2500' fontWeight='medium' />}
                  flex={1}
                  {...(value ? { newValue: { value } } : {})}
                />
                <DynamicComponent
                  label='lending.repaymentLock'
                  toolTipLabel='tbd'
                  component={
                    <RawText fontSize='2xl' fontWeight='medium'>
                      20 days
                    </RawText>
                  }
                  flex={1}
                  {...(value ? { newValue: { children: '30 days' } } : {})}
                />
              </Flex>
            </CardBody>
            <CardFooter
              gap={8}
              display='flex'
              flexDir='column'
              px={8}
              py={8}
              borderTopWidth={1}
              borderColor='border.base'
            >
              <Flex gap={4} alignItems='center'>
                <Text translation='lending.poolInformation' fontWeight='medium' />
                <Tag colorScheme='green'>
                  <TagLeftIcon as={CheckCircleIcon} />
                  Healthy
                </Tag>
              </Flex>
              <Flex>
                <DynamicComponent
                  label='lending.totalCollateral'
                  component={<Amount.Crypto fontSize='lg' value='25' symbol='BTC' />}
                  flex={1}
                  labelProps={{ fontSize: 'sm ' }}
                />
                <DynamicComponent
                  label='lending.totalDebtBalance'
                  component={<Amount.Fiat fontSize='lg' value={25} />}
                  flex={1}
                  labelProps={{ fontSize: 'sm ' }}
                />
              </Flex>
              <Flex>
                <DynamicComponent
                  label='lending.estCollateralizationRatio'
                  component={<Amount.Percent value={2.93} color='text.success' fontSize='lg' />}
                  flex={1}
                  labelProps={{ fontSize: 'sm ' }}
                />
                <DynamicComponent
                  label='lending.totalBorrowers'
                  component={<RawText fontSize='lg'>123</RawText>}
                  flex={1}
                  labelProps={{ fontSize: 'sm ' }}
                />
              </Flex>
            </CardFooter>
          </Card>
          <Faq />
        </Stack>
        <Stack flex={1} maxWidth={maxWidth}>
          <Card>
            <Tabs variant='unstyled'>
              <TabList px={2} py={4}>
                <Tab color='text.subtle' fontWeight='bold' _selected={tabSelected}>
                  Borrow
                </Tab>
                <Tab color='text.subtle' fontWeight='bold' _selected={tabSelected}>
                  Repay
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0} py={0}>
                  <Borrow />
                </TabPanel>
                <TabPanel>Repay</TabPanel>
              </TabPanels>
            </Tabs>
            <Input value={value} onChange={value => setValue(value.target.value)} />
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}
