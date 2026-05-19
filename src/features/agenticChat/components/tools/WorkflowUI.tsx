import { Badge, Box, Button, Flex, Spinner, Text, useColorModeValue } from '@chakra-ui/react'
import { getToolOrDynamicToolName } from 'ai'
import { FiCheck, FiClock, FiX } from 'react-icons/fi'

import { useWorkflowExecution } from '../../hooks/useWorkflowExecution'
import type { ToolUIProps } from '../../types/toolInvocation'
import type { WorkflowPlanOutput } from '../../types/toolOutput'
import { DisplayToolCard } from './DisplayToolCard'

const STEP_TYPE_LABELS: Record<string, string> = {
  swap: 'Swap',
  yieldEnter: 'Stake / Deposit',
  perpOpen: 'Open Perp',
  condition: 'Wait for Condition',
  loop: 'Repeat',
}

function StepStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <FiCheck color='green' />
  if (status === 'failed') return <FiX color='red' />
  if (status === 'running') return <Spinner size='xs' />
  if (status === 'waiting') return <FiClock />
  return <Box w={3} h={3} borderRadius='full' bg='gray.400' />
}

type WorkflowStepRowProps = {
  label: string
  type: string
  status: string
  isPending?: boolean
}

function WorkflowStepRow({ label, type, status, isPending }: WorkflowStepRowProps) {
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  return (
    <Flex alignItems='center' gap={3} py={2}>
      <StepStatusIcon status={isPending ? 'pending' : status} />
      <Flex direction='column' flex={1}>
        <Text fontSize='sm' fontWeight='medium'>
          {label}
        </Text>
        <Text fontSize='xs' color={mutedColor}>
          {STEP_TYPE_LABELS[type] ?? type}
        </Text>
      </Flex>
      {status === 'pending' && isPending && (
        <Badge colorScheme='yellow' fontSize='xs'>
          Awaiting signature
        </Badge>
      )}
    </Flex>
  )
}

export function WorkflowUI({ toolPart }: ToolUIProps<'planWorkflowTool'>) {
  const plan = toolPart.output as WorkflowPlanOutput | undefined
  const toolName = getToolOrDynamicToolName(toolPart)
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const { instance, isApproved, approve, abort, pendingSignatureStepId, signStep } =
    useWorkflowExecution(plan ?? null)

  if (!plan || toolName !== 'planWorkflowTool') return null

  const isComplete = instance?.status === 'completed'
  const isFailed = instance?.status === 'failed'

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Text fontWeight='semibold' fontSize='md'>
            {plan.templateName}
          </Text>
          {isComplete && (
            <Badge colorScheme='green' fontSize='xs'>
              Complete
            </Badge>
          )}
          {isFailed && (
            <Badge colorScheme='red' fontSize='xs'>
              Failed
            </Badge>
          )}
        </DisplayToolCard.HeaderRow>
        <Text fontSize='sm' color={useColorModeValue('gray.600', 'gray.400')}>
          {plan.description}
        </Text>
      </DisplayToolCard.Header>

      <DisplayToolCard.Content>
        <Box
          borderTopWidth={1}
          borderColor={borderColor}
          pt={3}
          divideY={1}
        >
          {plan.steps.map(step => {
            const instanceStep = instance?.steps.find(s => s.stepId === step.id)
            const status = instanceStep?.status ?? 'pending'
            const isPendingSig = pendingSignatureStepId === step.id

            return (
              <WorkflowStepRow
                key={step.id}
                label={step.label}
                type={step.type}
                status={status}
                isPending={isPendingSig}
              />
            )
          })}
        </Box>

        {pendingSignatureStepId && (
          <Flex mt={3} gap={2}>
            <Button
              size='sm'
              colorScheme='blue'
              onClick={() => signStep(pendingSignatureStepId, 'mock-tx-hash')}
              flex={1}
            >
              Sign transaction
            </Button>
          </Flex>
        )}

        {!isApproved && !isComplete && !isFailed && (
          <Flex mt={3} gap={2}>
            <Button size='sm' colorScheme='blue' onClick={approve} flex={1}>
              Approve &amp; Run
            </Button>
            <Button size='sm' variant='outline' onClick={abort}>
              Cancel
            </Button>
          </Flex>
        )}

        {isApproved && !isComplete && !isFailed && !pendingSignatureStepId && (
          <Flex mt={3} alignItems='center' gap={2}>
            <Spinner size='xs' />
            <Text fontSize='sm' color={useColorModeValue('gray.600', 'gray.400')}>
              Running workflow…
            </Text>
            <Button size='xs' variant='ghost' colorScheme='red' ml='auto' onClick={abort}>
              Abort
            </Button>
          </Flex>
        )}
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}
