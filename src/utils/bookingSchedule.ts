import dayjs from 'dayjs';
import {
  AMC_INTERVAL_LABELS,
  isAmcPlan,
  isTermiteService,
  parseAmcCountFromPlan,
} from '../constants/bookingPropertyTypes';

export interface ServiceSchedulePreview {
  service: string;
  plan: string;
  area: string;
  totalVisits: number;
  nextScheduledVisit: string | null;
  visitType: string;
  upcomingVisits: Array<{ visitNumber: number; date: string; label: string }>;
}

const AMC_INTERVAL_MONTHS: Record<number, number> = {
  3: 4,
  4: 3,
  6: 2,
  12: 1,
};

function visitTypeLabel(service: string, plan: string, cycle = 1): string {
  const svc = service.toLowerCase();
  if (isTermiteService(service)) return cycle > 1 ? 'TERMITE CHECK-UP' : 'TERMITE TREATMENT';
  if (svc.includes('rodent')) return isAmcPlan(plan) ? 'RODENT AMC' : 'RODENT SERVICE';
  if (svc.includes('mosquito')) return isAmcPlan(plan) ? 'MOSQUITO AMC' : 'MOSQUITO SERVICE';
  if (svc.includes('cockroach') || svc.includes('ants')) {
    return isAmcPlan(plan) ? 'COCKROACH AMC' : 'COCKROACH SERVICE';
  }
  if (isAmcPlan(plan)) return 'AMC VISIT';
  return 'SERVICE VISIT';
}

function buildVisitDates(
  service: string,
  plan: string,
  scheduleDate: string,
): Array<{ visitNumber: number; date: dayjs.Dayjs; label: string }> {
  const start = dayjs(scheduleDate);
  if (!start.isValid()) return [];

  if (isTermiteService(service)) {
    return Array.from({ length: 5 }, (_, i) => ({
      visitNumber: i + 1,
      date: start.add(6 * i, 'month'),
      label: i === 0 ? 'TERMITE TREATMENT' : `TERMITE CHECK-UP ${i}`,
    }));
  }

  const count = parseAmcCountFromPlan(plan);
  if (!count) {
    return [{ visitNumber: 1, date: start, label: visitTypeLabel(service, plan, 1) }];
  }

  const interval = AMC_INTERVAL_MONTHS[count] ?? 4;
  return Array.from({ length: count }, (_, i) => ({
    visitNumber: i + 1,
    date: start.add(interval * i, 'month'),
    label: visitTypeLabel(service, plan, i + 1),
  }));
}

export function previewServiceSchedule(
  service: string,
  plan: string,
  scheduleDate: string,
): {
  totalVisits: number;
  nextScheduledVisit: string | null;
  visitType: string;
  upcomingVisits: Array<{ visitNumber: number; date: string; label: string }>;
  intervalHint: string | null;
} {
  const visitType = visitTypeLabel(service, plan, 1);
  const count = parseAmcCountFromPlan(plan);
  const intervalHint = count ? AMC_INTERVAL_LABELS[count] || null : null;

  if (!scheduleDate?.trim()) {
    const totalVisits = isTermiteService(service) ? 5 : count || 1;
    return {
      totalVisits,
      nextScheduledVisit: null,
      visitType,
      upcomingVisits: [],
      intervalHint,
    };
  }

  const visits = buildVisitDates(service, plan, scheduleDate);
  const upcomingVisits = visits.map((v) => ({
    visitNumber: v.visitNumber,
    date: v.date.format('DD MMM YYYY'),
    label: v.label,
  }));

  const next = visits.length > 1 ? visits[1] : null;
  return {
    totalVisits: visits.length,
    nextScheduledVisit: next ? next.date.format('DD MMM YYYY') : null,
    visitType,
    upcomingVisits,
    intervalHint,
  };
}

export function previewAllServiceSchedules(
  items: Array<{ service: string; plan: string; area: string }>,
  scheduleDate: string,
): ServiceSchedulePreview[] {
  return items
    .filter((i) => i.service && i.plan && i.area)
    .map((item) => {
      const p = previewServiceSchedule(item.service, item.plan, scheduleDate);
      return {
        service: item.service,
        plan: item.plan,
        area: item.area,
        totalVisits: p.totalVisits,
        nextScheduledVisit: p.nextScheduledVisit,
        visitType: p.visitType,
        upcomingVisits: p.upcomingVisits,
      };
    });
}
