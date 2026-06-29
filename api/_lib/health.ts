/** HTTP status returned when the service is healthy. */
export const HEALTH_OK_STATUS = 200;

export interface HealthBody {
  status: 'ok';
}

/** Pure health payload, shared by the `GET /api/health` handler and its spec. */
export const buildHealthResponse = (): HealthBody => ({ status: 'ok' });
