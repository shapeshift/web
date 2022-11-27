import { ModalContent } from '@chakra-ui/modal'
import { Button, HStack, Modal, ModalCloseButton, ModalHeader, ModalOverlay, VStack, Image, Link, Alert, AlertDescription, AlertIcon, Box, Stack, Divider } from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { RawText, Text } from 'components/Text'

import { ProposalTypes, SessionTypes, SignClientTypes } from '@walletconnect/types'
import { WalletConnectSignClient } from 'kkdesktop/walletconnect/utils'
import { getSdkError } from '@walletconnect/utils'
import { Card } from 'components/Card/Card'
import { formatChainName } from 'plugins/walletConnectToDapps/utils/formatChainName'

export const SessionProposalModal = () => {
    const { proposals, removeProposal } = useWalletConnect()

    const currentProposal = proposals[0] as SignClientTypes.EventArguments['session_proposal']

    const { id, params } = currentProposal
    const { proposer, requiredNamespaces, relays } = params

    console.log(currentProposal)

    const onApprove = async () => {
        if (currentProposal) {
            const namespaces: SessionTypes.Namespaces = {}
            // Object.keys(requiredNamespaces).forEach(key => {
            //     const accounts: string[] = []
            //     requiredNamespaces[key].chains.map(chain => {
            //         selectedAccounts[key].map(acc => accounts.push(`${chain}:${acc}`))
            //     })
            //     namespaces[key] = {
            //         accounts,
            //         methods: requiredNamespaces[key].methods,
            //         events: requiredNamespaces[key].events
            //     }
            // })

            const { acknowledged } = await WalletConnectSignClient.approve({
                id,
                relayProtocol: relays[0].protocol,
                namespaces
            })
            await acknowledged()
        }
        removeProposal(id)
    }

    // Hanlde reject action
    const onReject = async () => {
        if (currentProposal) {
            await WalletConnectSignClient.reject({
                id,
                reason: getSdkError('USER_REJECTED_METHODS')
            })
        }
        removeProposal(id)
    }

    return (
        <Modal
            isOpen={!!currentProposal}
            onClose={() =>
                WalletConnectSignClient.reject({
                    id,
                    reason: getSdkError('USER_REJECTED_METHODS')
                })
            }
            variant='header-nav'
        >
            <ModalOverlay />
            <ModalContent
                width='full'
                borderRadius={{ base: 0, md: 'xl' }}
                minWidth={{ base: '100%', md: '500px' }}
                maxWidth={{ base: 'full', md: '500px' }}
            >
                <ModalHeader py={2}>
                    <HStack alignItems='center' spacing={2}>
                        <WalletConnectIcon />
                        <Text fontSize='md' translation='plugins.walletConnectToDapps.modal.sessionProposal.title' flex={1} />
                        {Object.keys(requiredNamespaces).map(chain => <RawText rounded='lg' fontSize='sm' px='2' bgColor='purple.600'>{chain}</RawText>)}

                        <ModalCloseButton position='static' />
                    </HStack>
                </ModalHeader>
                <Stack spacing={4} mb={4} p={4}>
                    <Box display='flex' flexDirection='row' justifyContent='center' alignItems='center'>
                        <Image
                            src={
                                proposer.metadata.icons[0]
                            }
                            borderRadius='full'
                            height='10'
                            width='10'
                        />
                        <Box display='flex' flexDirection='column'>
                            <Link href={proposer.metadata.url} pl='2'>
                                {proposer.metadata.name}
                            </Link>
                            <RawText pl={2} color='gray.500' fontSize='sm'>
                                {proposer.metadata.description}
                            </RawText>
                        </Box>
                    </Box>
                    <Divider />
                    {Object.keys(requiredNamespaces).map(chain => {
                        return (
                            <Stack>
                                <RawText mb={5}>{`Review ${chain} permissions`}</RawText>
                                {requiredNamespaces[chain].chains.map((chainId) => {
                                    const extensionMethods: ProposalTypes.RequiredNamespace['methods'] = []
                                    const extensionEvents: ProposalTypes.RequiredNamespace['events'] = []

                                    requiredNamespaces[chain].extension?.map(({ chains, methods, events }) => {
                                        if (chains.includes(chainId)) {
                                            extensionMethods.push(...methods)
                                            extensionEvents.push(...events)
                                        }
                                    })

                                    const allMethods = [...requiredNamespaces[chain].methods, ...extensionMethods]
                                    const allEvents = [...requiredNamespaces[chain].events, ...extensionEvents]
                                    return (
                                        <Card>
                                            <Card.Header>
                                                <Card.Heading>{formatChainName(chainId)}</Card.Heading>
                                            </Card.Header>
                                            <Card.Body>
                                                <Card.Heading>
                                                    <Text translation='plugins.walletConnectToDapps.modal.sessionProposal.methods' />
                                                </Card.Heading>
                                                <RawText color='gray.500'>
                                                    {allMethods.length ? allMethods.join(', ') : '-'}
                                                </RawText>
                                                <Divider mt={2} mb={2} />
                                                <Card.Heading>
                                                    <Text translation='plugins.walletConnectToDapps.modal.sessionProposal.events' />
                                                </Card.Heading>
                                                <RawText color='gray.500'>
                                                    {allEvents.length ? allEvents.join(', ') : '-'}
                                                </RawText>
                                            </Card.Body>
                                        </Card>
                                    )
                                }
                                )}
                                {/* <SessionProposalChainCard requiredNamespace={requiredNamespaces[chain]} />
                                {renderAccountSelection(chain)} */}
                                <Divider />
                            </Stack>
                        )
                    })}
                    <Button
                        width='full'
                        size='lg'
                        colorScheme='blue'
                        onClick={onApprove}
                    >
                        <Text translation={'plugins.walletConnectToDapps.modal.sessionProposal.approve'} />
                    </Button>
                    <Button
                        width='full'
                        size='lg'
                        colorScheme='red'
                        onClick={onReject}
                    >
                        <Text translation={'plugins.walletConnectToDapps.modal.sessionProposal.reject'} />
                    </Button>
                </Stack>
            </ModalContent>
        </Modal>
    )
}
