import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Heading,
  IconButton,
  Stack,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import type { PropsWithChildren } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useRouteMatch } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { DynamicComponent } from 'components/DynamicComponent'
import { Main } from 'components/Layout/Main'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { RawText, Text } from 'components/Text'

import { AddLiquidity } from '../components/AddLiquitity/AddLiquidity'
import { PoolIcon } from '../components/PoolIcon'
import { RemoveLiquidity } from '../components/RemoveLiquidity/RemoveLiquidity'
import { Faq } from './components/Faq'
import { PoolInfo } from './components/PoolInfo'

const containerPadding = { base: 6, '2xl': 8 }
const maxWidth = { base: '100%', md: '450px' }
const responsiveFlex = { base: 'auto', lg: 1 }

const PoolHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const { path } = useRouteMatch()
  const handleBack = useCallback(() => {
    const isPoolPage = matchPath('/lending/pool/:poolAssetId', path)
    const isPoolAccountPage = matchPath('/lending/poolAccount/:poolAccountId/:poolAssetId', path)

    if (isPoolAccountPage) {
      history.push('/lending/loans')
    } else if (isPoolPage) {
      history.push('/lending')
    }
  }, [history, path])
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  return (
    <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
      <Flex gap={4} alignItems='center'>
        <IconButton icon={backIcon} aria-label={translate('pools.pools')} onClick={handleBack} />
        <Heading>{translate('pools.pools')}</Heading>
      </Flex>
    </Container>
  )
}

type FormHeaderProps = {
  setStepIndex: (index: number) => void
  activeIndex: number
}
type FormHeaderTabProps = {
  index: number
  onClick: (index: number) => void
  isActive?: boolean
} & PropsWithChildren

const activeStyle = { color: 'text.base' }

const FormHeaderTab: React.FC<FormHeaderTabProps> = ({ index, onClick, isActive, children }) => {
  const handleClick = useCallback(() => {
    onClick(index)
  }, [index, onClick])
  return (
    <Button
      onClick={handleClick}
      isActive={isActive}
      variant='unstyled'
      color='text.subtle'
      _active={activeStyle}
    >
      {children}
    </Button>
  )
}

const FormHeader: React.FC<FormHeaderProps> = ({ setStepIndex, activeIndex }) => {
  const translate = useTranslate()
  const handleClick = useCallback(
    (index: number) => {
      setStepIndex(index)
    },
    [setStepIndex],
  )
  return (
    <Flex px={6} py={4} gap={4}>
      <FormHeaderTab index={0} onClick={handleClick} isActive={activeIndex === 0}>
        {translate('pools.addLiquidity')}
      </FormHeaderTab>
      <FormHeaderTab index={1} onClick={handleClick} isActive={activeIndex === 1}>
        {translate('pools.removeLiquidity')}
      </FormHeaderTab>
    </Flex>
  )
}

const flexDirPool: ResponsiveValue<Property.FlexDirection> = { base: 'column-reverse', lg: 'row' }

export const Pool = () => {
  const [stepIndex, setStepIndex] = useState<number>(0)

  const headerComponent = useMemo(() => <PoolHeader />, [])

  const poolAssetIds = useMemo(() => [usdcAssetId, ethAssetId], [])

  const liquidityValueComponent = useMemo(() => <Amount.Fiat value='200' fontSize='2xl' />, [])

  const TabHeader = useMemo(
    () => <FormHeader setStepIndex={setStepIndex} activeIndex={stepIndex} />,
    [stepIndex],
  )

  return (
    <Main headerComponent={headerComponent}>
      <Flex gap={4} flexDir={flexDirPool}>
        <Stack gap={6} flex={1}>
          <Card>
            <CardHeader px={8} py={8}>
              <Flex gap={4} alignItems='center'>
                <PoolIcon assetIds={poolAssetIds} size='md' />
                <Heading as='h3'>USDC LP</Heading>
              </Flex>
            </CardHeader>
            <CardBody gap={6} display='flex' flexDir='column' px={8} pb={8} pt={0}>
              <Text translation='pools.yourPosition' fontWeight='medium' />
              <Flex gap={12} flexWrap='wrap'>
                <Stack flex={1}>
                  <DynamicComponent
                    label='pools.liquidityValue'
                    component={liquidityValueComponent}
                    flex={responsiveFlex}
                    flexDirection='column-reverse'
                  />
                  <Card borderRadius='lg'>
                    <Stack px={4} py={2} spacing={4}>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={usdcAssetId} />
                          <RawText>USDC</RawText>
                        </Flex>
                        <Amount.Crypto value='100' symbol='USDC' />
                      </Flex>
                    </Stack>
                  </Card>
                </Stack>
                <Stack flex={1}>
                  <DynamicComponent
                    label='pools.unclaimedFees'
                    component={liquidityValueComponent}
                    flex={responsiveFlex}
                    flexDirection='column-reverse'
                  />
                  <Card borderRadius='lg'>
                    <Stack px={4} py={2} spacing={4}>
                      <Flex
                        fontSize='sm'
                        justifyContent='space-between'
                        alignItems='center'
                        fontWeight='medium'
                      >
                        <Flex alignItems='center' gap={2}>
                          <AssetIcon size='xs' assetId={usdcAssetId} />
                          <RawText>USDC</RawText>
                        </Flex>
                        <Amount.Crypto value='100' symbol='USDC' />
                      </Flex>
                    </Stack>
                  </Card>
                </Stack>
              </Flex>
            </CardBody>
            <CardFooter
              gap={6}
              display='flex'
              flexDir='column'
              px={8}
              py={8}
              borderTopWidth={1}
              borderColor='border.base'
            >
              <PoolInfo />
            </CardFooter>
          </Card>
          <Faq />
        </Stack>
        <Stack flex={1} maxWidth={maxWidth}>
          <Card>
            <Tabs onChange={setStepIndex} variant='unstyled' index={stepIndex}>
              <TabPanels>
                <TabPanel px={0} py={0}>
                  <AddLiquidity headerComponent={TabHeader} />
                </TabPanel>
                <TabPanel px={0} py={0}>
                  <RemoveLiquidity headerComponent={TabHeader} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Card>
        </Stack>
      </Flex>
    </Main>
  )
}
