import { describe, expect, it } from 'vitest';
import {
  payoutStatusLabel,
  previewVisitPayout,
  resolveVisitDivisor,
  splitPoolEqually,
} from './revenuePayoutPreview';

describe('splitPoolEqually', () => {
  it('splits 400 across 3 partners like backend', () => {
    expect(splitPoolEqually(400, 3)).toEqual([133.34, 133.33, 133.33]);
    expect(splitPoolEqually(400, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(400, 2);
  });

  it('returns single share for one partner', () => {
    expect(splitPoolEqually(880, 1)).toEqual([880]);
  });
});

describe('previewVisitPayout', () => {
  it('computes one-time 40/60', () => {
    const preview = previewVisitPayout({
      billableAmount: 1000,
      economics: 'one_time',
      eligiblePartnerCount: 1,
    });
    expect(preview.visitRevenue).toBe(1000);
    expect(preview.technicianPool).toBe(400);
    expect(preview.companyShare).toBe(600);
    expect(preview.perPartnerShares).toEqual([400]);
    expect(preview.held).toBe(false);
  });

  it('computes AMC per-visit share for 2200 / 3', () => {
    const preview = previewVisitPayout({
      billableAmount: 2200,
      economics: 'amc',
      plannedVisitCount: 3,
      eligiblePartnerCount: 1,
    });
    expect(preview.visitRevenue).toBe(733.33);
    expect(preview.technicianPool).toBe(293.33);
  });

  it('holds when no eligible partners', () => {
    const preview = previewVisitPayout({
      billableAmount: 5000,
      economics: 'contractual',
      plannedVisitCount: 5,
      eligiblePartnerCount: 0,
    });
    expect(preview.held).toBe(true);
    expect(preview.perPartnerShares).toEqual([]);
  });

  it('uses maxCycle when plannedVisitCount missing', () => {
    expect(resolveVisitDivisor(null, 4)).toBe(4);
  });
});

describe('payoutStatusLabel', () => {
  it('labels legacy bookings', () => {
    expect(payoutStatusLabel('legacy_exempt')).toContain('Legacy');
  });
});
