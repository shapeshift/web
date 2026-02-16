import { describe, expect, it } from 'vitest'

import { createStepPhaseMap, getStepStatus, StepStatus } from '../lib/stepUtils'

enum TestStep {
  FIRST = 0,
  SECOND = 1,
  THIRD = 2,
  FOURTH = 3,
}

const TEST_PHASES = createStepPhaseMap<TestStep>({
  [TestStep.FIRST]: 'first_complete',
  [TestStep.SECOND]: 'second_complete',
  [TestStep.THIRD]: 'third_complete',
})

describe('createStepPhaseMap', () => {
  describe('toPhases', () => {
    it('should convert completed steps array to phase strings', () => {
      const phases = TEST_PHASES.toPhases([TestStep.FIRST, TestStep.SECOND])
      expect(phases).toEqual(['first_complete', 'second_complete'])
    })

    it('should convert completed steps Set to phase strings', () => {
      const phases = TEST_PHASES.toPhases(new Set([TestStep.FIRST, TestStep.THIRD]))
      expect(phases).toEqual(['first_complete', 'third_complete'])
    })

    it('should return empty array for empty steps', () => {
      const phases = TEST_PHASES.toPhases([])
      expect(phases).toEqual([])
    })

    it('should append error phase when error is provided', () => {
      const phases = TEST_PHASES.toPhases([TestStep.FIRST], 'something went wrong')
      expect(phases).toEqual(['first_complete', 'error'])
    })

    it('should not append error phase when error is undefined', () => {
      const phases = TEST_PHASES.toPhases([TestStep.FIRST], undefined)
      expect(phases).toEqual(['first_complete'])
    })

    it('should not append error phase when error is empty string', () => {
      const phases = TEST_PHASES.toPhases([TestStep.FIRST], '')
      expect(phases).toEqual(['first_complete'])
    })

    it('should filter out steps with no mapping', () => {
      const phases = TEST_PHASES.toPhases([TestStep.FIRST, TestStep.FOURTH])
      expect(phases).toEqual(['first_complete'])
    })

    it('should handle all steps completed with error', () => {
      const phases = TEST_PHASES.toPhases(
        [TestStep.FIRST, TestStep.SECOND, TestStep.THIRD],
        'failed',
      )
      expect(phases).toEqual(['first_complete', 'second_complete', 'third_complete', 'error'])
    })
  })

  describe('fromPhases', () => {
    it('should convert phase strings back to steps', () => {
      const steps = TEST_PHASES.fromPhases(['first_complete', 'second_complete'])
      expect(steps).toEqual([TestStep.FIRST, TestStep.SECOND])
    })

    it('should return empty array for empty phases', () => {
      const steps = TEST_PHASES.fromPhases([])
      expect(steps).toEqual([])
    })

    it('should filter out unknown phases including error', () => {
      const steps = TEST_PHASES.fromPhases(['first_complete', 'error', 'unknown_phase'])
      expect(steps).toEqual([TestStep.FIRST])
    })

    it('should handle all valid phases', () => {
      const steps = TEST_PHASES.fromPhases(['first_complete', 'second_complete', 'third_complete'])
      expect(steps).toEqual([TestStep.FIRST, TestStep.SECOND, TestStep.THIRD])
    })
  })

  describe('roundtrip', () => {
    it('should roundtrip completed steps without error', () => {
      const originalSteps = [TestStep.FIRST, TestStep.SECOND]
      const phases = TEST_PHASES.toPhases(originalSteps)
      const recoveredSteps = TEST_PHASES.fromPhases(phases)
      expect(recoveredSteps).toEqual(originalSteps)
    })

    it('should roundtrip completed steps with error (error is stripped on fromPhases)', () => {
      const originalSteps = [TestStep.FIRST, TestStep.SECOND]
      const phases = TEST_PHASES.toPhases(originalSteps, 'some error')
      const recoveredSteps = TEST_PHASES.fromPhases(phases)
      expect(recoveredSteps).toEqual(originalSteps)
    })

    it('should roundtrip empty steps', () => {
      const phases = TEST_PHASES.toPhases([])
      const recoveredSteps = TEST_PHASES.fromPhases(phases)
      expect(recoveredSteps).toEqual([])
    })

    it('should roundtrip single step', () => {
      const originalSteps = [TestStep.THIRD]
      const phases = TEST_PHASES.toPhases(originalSteps)
      const recoveredSteps = TEST_PHASES.fromPhases(phases)
      expect(recoveredSteps).toEqual(originalSteps)
    })
  })
})

describe('getStepStatus', () => {
  it('should return FAILED when step matches failedStep', () => {
    const status = getStepStatus(TestStep.SECOND, {
      currentStep: TestStep.SECOND,
      completedSteps: [],
      failedStep: TestStep.SECOND,
      error: 'tx failed',
    })
    expect(status).toBe(StepStatus.FAILED)
  })

  it('should return COMPLETE when step is in completedSteps', () => {
    const status = getStepStatus(TestStep.FIRST, {
      currentStep: TestStep.THIRD,
      completedSteps: [TestStep.FIRST, TestStep.SECOND],
    })
    expect(status).toBe(StepStatus.COMPLETE)
  })

  it('should return IN_PROGRESS when step is current step', () => {
    const status = getStepStatus(TestStep.SECOND, {
      currentStep: TestStep.SECOND,
      completedSteps: [TestStep.FIRST],
    })
    expect(status).toBe(StepStatus.IN_PROGRESS)
  })

  it('should return NOT_STARTED when step is after current step', () => {
    const status = getStepStatus(TestStep.THIRD, {
      currentStep: TestStep.FIRST,
      completedSteps: [],
    })
    expect(status).toBe(StepStatus.NOT_STARTED)
  })

  it('should return SKIPPED when step is before current step but not completed', () => {
    const status = getStepStatus(TestStep.SECOND, {
      currentStep: TestStep.FOURTH,
      completedSteps: [TestStep.FIRST, TestStep.THIRD],
    })
    expect(status).toBe(StepStatus.SKIPPED)
  })

  it('should prioritize FAILED over COMPLETE', () => {
    const status = getStepStatus(TestStep.SECOND, {
      currentStep: TestStep.SECOND,
      completedSteps: [TestStep.SECOND],
      failedStep: TestStep.SECOND,
    })
    expect(status).toBe(StepStatus.FAILED)
  })

  it('should prioritize COMPLETE over IN_PROGRESS', () => {
    const status = getStepStatus(TestStep.FIRST, {
      currentStep: TestStep.FIRST,
      completedSteps: [TestStep.FIRST],
    })
    expect(status).toBe(StepStatus.COMPLETE)
  })
})
