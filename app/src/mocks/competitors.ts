import type { Competitor } from '../domain/competitor';

/**
 * Mock competitor dataset for UI/logic development before the research
 * backend (M5) and DB (M6) land. Ratings are illustrative, not researched.
 */
export const MOCK_COMPETITORS: Competitor[] = [
  {
    id: 'aveva-pi',
    name: 'AVEVA PI System',
    website: 'https://www.aveva.com/en/products/pi-system/',
    description:
      'Industrial data historian and real-time operations platform widely used for process monitoring.',
    features: {
      'realtime-dashboards': 'strong',
      'data-integration': 'strong',
      'trend-analytics': 'strong',
      'quality-analytics': 'adequate',
      alerting: 'strong',
      reporting: 'adequate',
    },
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'siemens-mindsphere',
    name: 'Siemens Insights Hub',
    website: 'https://www.siemens.com/insights-hub',
    description:
      'Industrial IoT-as-a-service platform for connecting production assets and analyzing operational data.',
    features: {
      'realtime-dashboards': 'adequate',
      'data-integration': 'strong',
      'trend-analytics': 'adequate',
      'quality-analytics': 'weak',
      alerting: 'adequate',
      reporting: 'weak',
    },
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'inficon-fabguard',
    name: 'INFICON FabGuard',
    website: 'https://www.inficon.com/en/products/fabguard',
    description:
      'Fault detection and process control suite targeted at vacuum and semiconductor manufacturing.',
    features: {
      'realtime-dashboards': 'adequate',
      'data-integration': 'adequate',
      'trend-analytics': 'weak',
      'quality-analytics': 'strong',
      alerting: 'strong',
      reporting: 'adequate',
    },
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'seeq',
    name: 'Seeq',
    website: 'https://www.seeq.com/',
    description:
      'Advanced analytics application for engineers working with time-series process data.',
    features: {
      'realtime-dashboards': 'weak',
      'data-integration': 'adequate',
      'trend-analytics': 'strong',
      'quality-analytics': 'adequate',
      alerting: 'weak',
      reporting: 'strong',
    },
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];
