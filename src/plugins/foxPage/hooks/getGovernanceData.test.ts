import { parseGovernanceData } from './getGovernanceData'

const EMPTY_RESULTS_PROPOSAL = {
  refId: 'refId1',
  id: 'id1',
  title: 'Proposal 1',
  content: 'Content 1',
  protocol: 'shapeshift',
  adapter: 'default',
  proposer: '0x9Fca79Fb30aa631a82312A7a34d0f05359C626ad',
  totalVotes: 5,
  blockNumber: 14963724,
  externalUrl: 'https://snapshot.org/#/shapeshiftdao.eth/proposal/id1',
  startTime: { timestamp: 1655239110 },
  endTime: { timestamp: 1655498315 },
  startTimestamp: '1655239110',
  endTimestamp: '1655498315',
  currentState: 'active',
  choices: ['YES', 'NO'],
  results: [],
  events: [],
}
const PARTIAL_RESULTS_PROPOSAL = {
  refId: 'refId2',
  id: 'id2',
  title: 'Proposal 2',
  content: 'Content 2',
  protocol: 'shapeshift',
  adapter: 'default',
  proposer: '0x9Fca79Fb30aa631a82312A7a34d0f05359C626ad',
  totalVotes: 5,
  blockNumber: 14963724,
  externalUrl: 'https://snapshot.org/#/shapeshiftdao.eth/proposal/id2',
  startTime: { timestamp: 1655239110 },
  endTime: { timestamp: 1655498315 },
  startTimestamp: '1655239110',
  endTimestamp: '1655498315',
  currentState: 'active',
  choices: ['YES', 'NO'],
  results: [
    {
      total: 362512.22,
      choice: 0,
    },
  ],
  events: [],
}

const ALL_RESULTS_PROPOSAL = {
  refId: 'refId3',
  id: 'id3',
  title: 'Proposal 3',
  content: 'Content 3',
  protocol: 'shapeshift',
  adapter: 'default',
  proposer: '0x82c6b4E75Ef8A3669359F7368266FF8F7C719D93',
  totalVotes: 48,
  blockNumber: 14896948,
  externalUrl: 'https://snapshot.org/#/shapeshiftdao.eth/proposal/id3',
  startTime: { timestamp: 1654256993 },
  endTime: { timestamp: 1654516193 },
  startTimestamp: '1654256993',
  endTimestamp: '1654516193',
  currentState: 'closed',
  choices: ['Yes (For)', 'No (Against)'],
  results: [
    {
      total: 4122544.5,
      choice: 0,
    },
    {
      total: 200,
      choice: 1,
    },
  ],
  events: [],
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
})
