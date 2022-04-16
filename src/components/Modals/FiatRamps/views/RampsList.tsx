import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { useHistory } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { FiatRamp, supportedFiatRamps } from '../config'
import { FiatRampsRoutes } from '../FiatRampsCommon'

export const RampsList = ({
  setFiatRampProvider,
}: {
  setFiatRampProvider: (fiatRamp: FiatRamp) => void
}) => {
  const history = useHistory()

  return (
    <Flex justifyContent='center' alignItems='center' width={'32rem'}>
      <Card boxShadow='none' borderWidth={0}>
        <Card.Header>
          <Card.Heading>
            <Text translation='fiatRamps.title' />
          </Card.Heading>
        </Card.Header>
        <Card.Body>
          <Text lineHeight={1.2} color='gray.500' translation='fiatRamps.titleMessage' />
          <Stack spacing={2} mt={2} mx={-4}>
            {Object.entries(supportedFiatRamps)
              .filter(([, { isImplemented }]) => isImplemented)
              .map(([fiatRamp, fiatRampConfig]) => (
                <Button
                  key={fiatRamp}
                  width='full'
                  height='auto'
                  justifyContent='space-between'
                  variant='ghost'
                  fontWeight='normal'
                  py={2}
                  onClick={() => {
                    setFiatRampProvider(fiatRamp as FiatRamp)
                    history.push(FiatRampsRoutes.Manager)
                  }}
                  rightIcon={<ChevronRightIcon boxSize={6} />}
                >
                  <Flex
                    flex={1}
                    flexDirection='row'
                    justifyContent='space-between'
                    alignItems='center'
                  >
                    <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                      <AssetIcon src={fiatRampConfig.logo} />
                      <Box textAlign='left' ml={2}>
                        <Text fontWeight='bold' translation={fiatRampConfig.label} />
                        <Text translation={fiatRampConfig.info ?? ''} />
                      </Box>
                    </Flex>
                    <Box>
                      <Tag colorScheme='green' mr={2}>
                        <Text translation='fiatRamps.buy' style={{ textTransform: 'uppercase' }} />
                      </Tag>
                      <Tag colorScheme='gray'>
                        <Text translation='fiatRamps.sell' style={{ textTransform: 'uppercase' }} />
                      </Tag>
                    </Box>
                  </Flex>
                </Button>
              ))}
            {Object.values(supportedFiatRamps)
              .filter(({ isImplemented }) => !isImplemented)
              .map(fiatRampConfig => (
                <Button
                  key={fiatRampConfig.label}
                  width='full'
                  height='auto'
                  justifyContent='flex-start'
                  variant='ghost'
                  fontWeight='normal'
                  py={2}
                >
                  <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                    <AssetIcon src={fiatRampConfig.logo} />
                    <Box textAlign='left' ml={2}>
                      <Text fontWeight='bold' translation={fiatRampConfig.label} />
                      <Text translation='fiatRamps.comingSoon' />
                    </Box>
                  </Flex>
                </Button>
              ))}
          </Stack>
        </Card.Body>
      </Card>
    </Flex>
  )
}
