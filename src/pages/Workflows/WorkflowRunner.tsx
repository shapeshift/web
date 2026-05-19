import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FiCheck, FiClock, FiX } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'

import { useWorkflowExecution } from '@/features/agenticChat/hooks/useWorkflowExecution'
import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates'
import type { WorkflowPlanOutput } from '@/features/agenticChat/types/toolOutput'
import type { WorkflowStepStatus } from '@/lib/workflows/types'

const STEP_TYPE_LABELS: Record<string, string> = {
  swap: 'Swap',
  yieldEnter: 'Stake / Deposit',
  perpOpen: 'Open Perp',
  condition: 'Wait for Condition',
  loop: 'Repeat',
}

function StepStatusIcon({ status }: { status: WorkflowStepStatus | 'pending' }) {
  if (status === 'success') return <FiCheck color='green' />
  if (status === 'failed') return <FiX color='red' />
  if (status === 'running') return <Spinner size='xs' />
  if (status === 'waiting') return <FiClock />
  return <Box w={3} h={3} borderRadius='full' bg='gray.400' />
}

export const WorkflowRunner = memo(() => {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId)

  const plan = useMemo<WorkflowPlanOutput | null>(() => {
    if (!template) return null
    return {
      templateId: template.id,
      templateName: template.name,
      description: template.description,
      parameterValues: Object.fromEntries(
        template.parameters.map(p => [p.id, p.default ?? '']),
      ),
      steps: template.steps.map(s => ({ id: s.id, label: s.label, type: s.type })),
    }
  }, [template])

  const { instance, isApproved, approve, abort, pendingSignatureStepId, signStep } =
    useWorkflowExecution(plan)

  const handleBack = useCallback(() => navigate('/workflows'), [navigate])

  if (!template) {
    return (
      <Container maxW='container.md' py={8}>
        <Text>Workflow not found.</Text>
        <Button mt={4} onClick={handleBack}>
          Back to catalog
        </Button>
      </Container>
    )
  }

  const isComplete = instance?.status === 'completed'
  const isFailed = instance?.status === 'failed'

  return (
    <Container maxW='container.md' py={8}>
      <Button variant='ghost' onClick={handleBack} mb={4} px={0}>
        ← Back
      </Button>

      <Flex alignItems='center' gap={3} mb={2}>
        <Heading size='lg'>{template.name}</Heading>
        {isComplete && <Badge colorScheme='green'>Complete</Badge>}
        {isFailed && <Badge colorScheme='red'>Failed</Badge>}
      </Flex>
      <Text color={mutedColor} mb={6}>
        {template.description}
      </Text>

      <Box borderWidth={1} borderColor={borderColor} borderRadius='xl' p={5} mb={4}>
        <Text fontWeight='semibold' mb={3}>
          Steps
        </Text>
        <Flex direction='column' gap={3}>
          {template.steps.map(step => {
            const instanceStep = instance?.steps.find(s => s.stepId === step.id)
            const status = (instanceStep?.status ?? 'pending') as WorkflowStepStatus | 'pending'
            const isPendingSig = pendingSignatureStepId === step.id

            return (
              <Flex key={step.id} alignItems='center' gap={3}>
                <StepStatusIcon status={status} />
                <Flex direction='column' flex={1}>
                  <Text fontSize='sm' fontWeight='medium'>
                    {step.label}
                  </Text>
                  <Text fontSize='xs' color={mutedColor}>
                    {STEP_TYPE_LABELS[step.type] ?? step.type}
                  </Text>
                </Flex>
                {isPendingSig && (
                  <Button
                    size='xs'
                    colorScheme='blue'
                    onClick={() => signStep(step.id, 'mock-tx-hash')}
                  >
                    Sign
                  </Button>
                )}
              </Flex>
            )
          })}
        </Flex>
      </Box>

      {!isApproved && !isComplete && !isFailed && (
        <Flex gap={3}>
          <Button colorScheme='blue' flex={1} onClick={approve}>
            Approve &amp; Run
          </Button>
          <Button variant='outline' onClick={handleBack}>
            Cancel
          </Button>
        </Flex>
      )}

      {isApproved && !isComplete && !isFailed && !pendingSignatureStepId && (
        <Flex alignItems='center' gap={3}>
          <Spinner size='sm' />
          <Text fontSize='sm' color={mutedColor}>
            Workflow running…
          </Text>
          <Button size='sm' colorScheme='red' variant='ghost' ml='auto' onClick={abort}>
            Abort
          </Button>
        </Flex>
      )}

      {isComplete && (
        <Button colorScheme='green' onClick={handleBack}>
          Done
        </Button>
      )}
    </Container>
  )
})

WorkflowRunner.displayName = 'WorkflowRunner'
