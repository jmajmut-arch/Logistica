import { checkZoneVerification, findVerificationFindings } from '@/domain/rules/verificationRules';
import type { Zone } from '@/domain/entities/Zone';

const TODAY = new Date(2026, 0, 31); // 2026-01-31

function daysAgo(days: number): number {
  return TODAY.getTime() - days * 24 * 60 * 60 * 1000;
}

describe('checkZoneVerification', () => {
  it('is high severity when the zone has never been verified', () => {
    const finding = checkZoneVerification(1, undefined, TODAY);
    expect(finding?.severity).toBe('high');
    expect(finding?.daysSinceLastVerification).toBeNull();
  });

  it('returns null when verified within the last 30 days', () => {
    expect(checkZoneVerification(1, daysAgo(10), TODAY)).toBeNull();
  });

  it('returns null at exactly the 30 day threshold', () => {
    expect(checkZoneVerification(1, daysAgo(30), TODAY)).toBeNull();
  });

  it('is medium severity just past the threshold', () => {
    expect(checkZoneVerification(1, daysAgo(31), TODAY)?.severity).toBe('medium');
  });

  it('is high severity at the 15-day overdue escalation point', () => {
    expect(checkZoneVerification(1, daysAgo(45), TODAY)?.severity).toBe('high');
  });
});

describe('findVerificationFindings', () => {
  it('only returns zones that are overdue or never verified', () => {
    const zones: Zone[] = [
      { id: 1, name: 'Rack A1', code: 'A1' },
      { id: 2, name: 'Rack A2', code: 'A2' },
      { id: 3, name: 'Rack B1', code: 'B1' },
    ];
    const latestByZone = new Map([
      [1, daysAgo(5)],
      [2, daysAgo(60)],
    ]);

    const findings = findVerificationFindings(zones, latestByZone, TODAY);

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.zoneId).sort()).toEqual([2, 3]);
  });
});
