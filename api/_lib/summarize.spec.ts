import { describe, it, expect } from 'vitest';
import { buildResearchPrompt, parseResearchReply } from './summarize';
import { FEATURE_AREAS } from '../../app/src/domain/competitor';

const validReply = {
  name: 'Acme Analytics',
  description: 'Time-series analytics for process engineers.',
  features: {
    'realtime-dashboards': 'strong',
    'data-integration': 'adequate',
    'trend-analytics': 'weak',
    'quality-analytics': 'absent',
    alerting: 'adequate',
    reporting: 'weak',
  },
};

describe('buildResearchPrompt', () => {
  it('produces a system + user message pair', () => {
    const messages = buildResearchPrompt('page text');
    expect(messages.map((m) => m.role)).toEqual(['system', 'user']);
  });

  it('names every feature area the model must rate', () => {
    const system = buildResearchPrompt('page text')[0]!.content;
    for (const area of FEATURE_AREAS) {
      expect(system).toContain(area);
    }
  });

  it('includes the extracted page text in the user message', () => {
    const user = buildResearchPrompt('DISTINCTIVE PAGE BODY')[1]!.content;
    expect(user).toContain('DISTINCTIVE PAGE BODY');
  });
});

describe('parseResearchReply', () => {
  it('parses a plain JSON reply', () => {
    expect(parseResearchReply(JSON.stringify(validReply))).toEqual(validReply);
  });

  it('parses JSON wrapped in a ```json fenced block', () => {
    const fenced = '```json\n' + JSON.stringify(validReply) + '\n```';
    expect(parseResearchReply(fenced)).toEqual(validReply);
  });

  it('parses JSON with surrounding prose', () => {
    const noisy = `Here is the result:\n${JSON.stringify(validReply)}\nHope that helps!`;
    expect(parseResearchReply(noisy)).toEqual(validReply);
  });

  it('throws when the reply contains no JSON object', () => {
    expect(() => parseResearchReply('I could not analyze that page.')).toThrow();
  });

  it('throws when the JSON fails schema validation', () => {
    const bad = JSON.stringify({ ...validReply, features: { 'realtime-dashboards': 'strong' } });
    expect(() => parseResearchReply(bad)).toThrow();
  });
});
