import type { BoardroomGovernanceResult } from './getGovernanceData'
import { parseGovernanceData } from './getGovernanceData'

const EMPTY_RESULTS_PROPOSAL: BoardroomGovernanceResult = {
  refId: 'refId1',
  title: 'Proposal 1',
  currentState: 'active',
  choices: ['YES', 'NO'],
  indexedResult: [],
}
const PARTIAL_RESULTS_PROPOSAL: BoardroomGovernanceResult = {
  refId: 'refId2',
  title: 'Proposal 2',
  currentState: 'active',
  choices: ['YES', 'NO'],
  indexedResult: [
    {
      total: 362512.22,
      choice: 0,
    },
  ],
}

const ALL_RESULTS_PROPOSAL: BoardroomGovernanceResult = {
  refId: 'refId3',
  title: 'Proposal 3',
  currentState: 'closed',
  choices: ['Yes (For)', 'No (Against)'],
  indexedResult: [
    {
      total: 4122544.5,
      choice: 0,
    },
    {
      total: 200,
      choice: 1,
    },
  ],
}

const INACTIVE_PROPOSAL: BoardroomGovernanceResult = {
  refId: 'refId4',
  title: 'Proposal 4',
  currentState: 'closed',
  choices: ['For', 'Against'],
  indexedResult: [
    {
      total: 5876468,
      choice: 0,
    },
  ],
}

const INACTIVE_PROPOSAL_TWO: BoardroomGovernanceResult = {
  refId: 'refId5',
  title: 'Proposal 5',
  currentState: 'closed',
  choices: ['For', 'Against'],
  indexedResult: [
    {
      total: 5876468,
      choice: 0,
    },
  ],
}

describe('parseGovernanceData', () => {
  const ZERO_RESULT = {
    absolute: '0',
    percent: '0',
  }
  it('populates and zeros out boardroom response with no results', () => {
    const data = [EMPTY_RESULTS_PROPOSAL]
    const parsedData = parseGovernanceData(data)
    expect(parsedData).toHaveLength(1)
    expect(parsedData[0].results).toHaveLength(2)
    expect(parsedData[0].results[0]).toMatchObject(ZERO_RESULT)
    expect(parsedData[0].results[1]).toMatchObject(ZERO_RESULT)
  })
  it('populates and zeros out the missing result items of a boardroom response with partial results', () => {
    const data = [PARTIAL_RESULTS_PROPOSAL]
    const parsedData = parseGovernanceData(data)
    expect(parsedData).toHaveLength(1)
    expect(parsedData[0].results).toHaveLength(2)
    expect(parsedData[0].results[0]).toMatchObject({
      absolute: '362512.22',
      percent: '1',
    })
    expect(parsedData[0].results[1]).toMatchObject(ZERO_RESULT)
  })
  it('parses a boardroom response with results for all choices', () => {
    const data = [ALL_RESULTS_PROPOSAL]
    const parsedData = parseGovernanceData(data)
    expect(parsedData).toHaveLength(1)
    expect(parsedData[0].results).toHaveLength(2)
    expect(parsedData[0].results[0]).toMatchObject({
      absolute: '4122544.5',
      percent: '0.99995148862608391085',
    })
    expect(parsedData[0].results[1]).toMatchObject({
      absolute: '200',
      percent: '0.00004851137391608915',
    })
  })
  it('builds a parsed response with the latest inactive proposal if all inactive', () => {
    const data = [INACTIVE_PROPOSAL, INACTIVE_PROPOSAL_TWO, ALL_RESULTS_PROPOSAL]
    const parsedData = parseGovernanceData(data)
    expect(parsedData).toHaveLength(1)
    expect(parsedData[0].results).toHaveLength(2)
    expect(parsedData[0].refId).toEqual(INACTIVE_PROPOSAL.refId)
    expect(parsedData[0].results[0]).toMatchObject({
      absolute: '5876468',
      percent: '1',
    })
  })
  it('builds a parsed response with all active proposals', () => {
    const data = [EMPTY_RESULTS_PROPOSAL, PARTIAL_RESULTS_PROPOSAL]
    const parsedData = parseGovernanceData(data)
    expect(parsedData).toHaveLength(2)
    expect(parsedData[0].results).toHaveLength(2)
    expect(parsedData[0].refId).toEqual(EMPTY_RESULTS_PROPOSAL.refId)
    expect(parsedData[1].refId).toEqual(PARTIAL_RESULTS_PROPOSAL.refId)
    expect(parsedData[0].results[0]).toMatchObject(ZERO_RESULT)
    expect(parsedData[1].results[0]).toMatchObject({
      absolute: '362512.22',
      percent: '1',
    })
  })
})
