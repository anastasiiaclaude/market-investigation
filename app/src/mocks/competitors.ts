import type { Competitor } from '../domain/competitor';

/**
 * VA-INDIGO — the VON ARDENNE analysis suite the comparison is centred on
 * (the "home" product). Kept separate from the rival list so gap detection
 * reads as "VA-INDIGO vs. competitors". Ratings are illustrative, not
 * researched; the weak `alerting` and absent `reporting` areas exist to
 * demonstrate gap highlighting (M3, FR-4).
 */
export const VA_INDIGO: Competitor = {
  id: 'va-indigo',
  name: 'VA-INDIGO Analysis Suite',
  website: 'https://www.vonardenne.biz/',
  description:
    'VON ARDENNE analysis suite for monitoring and optimizing vacuum-coating production lines.',
  features: {
    'realtime-dashboards': 'strong',
    'data-integration': 'adequate',
    'trend-analytics': 'strong',
    'quality-analytics': 'weak',
    alerting: 'weak',
    reporting: 'absent',
  },
  updatedAt: '2026-06-01T00:00:00.000Z',
};

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
