import { getErrorMessage, isApiError, isAxiosError } from './errors';

export type AssignTechnicianErrorCode =
  | 'technician_no_service_area'
  | 'technician_outside_service_area'
  | 'technician_inactive'
  | 'partner_in_progress'
  | 'unknown';

export type AssignTechnicianError = {
  message: string;
  code: AssignTechnicianErrorCode;
  technicianId?: number;
  technicianName?: string;
  serviceCityName?: string;
  editTechnicianPath?: string;
};

function readPayload(error: unknown): Record<string, unknown> | undefined {
  if (isApiError(error)) {
    const data = error.details;
    if (data && typeof data === 'object') return data as Record<string, unknown>;
  }
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') return data as Record<string, unknown>;
  }
  return undefined;
}

export function parseAssignTechnicianError(
  error: unknown,
  fallback = 'Failed to assign technician',
): AssignTechnicianError {
  const payload = readPayload(error);
  const code = (payload?.code as AssignTechnicianErrorCode | undefined) || 'unknown';
  const technicianId =
    typeof payload?.technician_id === 'number' ? payload.technician_id : undefined;
  const technicianName =
    typeof payload?.technician_name === 'string' ? payload.technician_name : undefined;
  const serviceCityName =
    typeof payload?.service_city_name === 'string' ? payload.service_city_name : undefined;
  const message = getErrorMessage(error, fallback);

  return {
    message,
    code,
    technicianId,
    technicianName,
    serviceCityName,
    editTechnicianPath: technicianId ? `/technicians/edit/${technicianId}` : undefined,
  };
}

export function technicianMissingServiceAreas(tech: {
  service_cities?: Array<{ id: number; name: string }>;
}): boolean {
  return !tech.service_cities || tech.service_cities.length === 0;
}

export function buildLocalAssignBlockMessage(
  techName: string,
  bookingCity?: string,
): string {
  const cityPart = bookingCity ? ` for ${bookingCity}` : '';
  return `${techName} has no Service Areas selected${cityPart}. Open Technicians → Edit and add at least one city before assigning.`;
}
