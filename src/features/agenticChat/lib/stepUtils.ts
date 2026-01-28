export enum StepStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

export function createStepPhaseMap<TStep extends number>(mapping: Record<number, string>) {
  const stepToPhase = mapping
  const phaseToStep: Record<string, TStep> = {}
  for (const [step, phase] of Object.entries(mapping)) {
    phaseToStep[phase] = Number(step) as TStep
  }

  return {
    toPhases: (completedSteps: TStep[] | Set<TStep>, error?: string): string[] => {
      const stepsArray = Array.isArray(completedSteps) ? completedSteps : Array.from(completedSteps)
      return [
        ...stepsArray.map(s => stepToPhase[s]).filter((p): p is string => Boolean(p)),
        ...(error ? ['error'] : []),
      ]
    },
    fromPhases: (phases: string[]): TStep[] =>
      phases
        .filter(p => p in phaseToStep)
        .map(p => phaseToStep[p])
        .filter((s): s is TStep => s !== undefined),
  }
}

interface StepState<TStep extends number> {
  currentStep: TStep
  completedSteps: TStep[]
  failedStep?: TStep
  error?: string
}

export function getStepStatus<TStep extends number>(
  step: TStep,
  state: StepState<TStep>,
): StepStatus {
  if (state.failedStep === step) return StepStatus.FAILED
  if (state.completedSteps.includes(step)) return StepStatus.COMPLETE
  if (state.currentStep === step) return StepStatus.IN_PROGRESS
  if (state.currentStep < step) return StepStatus.NOT_STARTED
  return StepStatus.SKIPPED
}
