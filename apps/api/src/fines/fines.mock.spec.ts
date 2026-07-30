import { MockFinesProvider } from './fines.mock';

describe('MockFinesProvider', () => {
  it('returns deterministic fines for some registrations', async () => {
    const provider = new MockFinesProvider();
    const a = await provider.fetchOutstandingByRegistration('GP123ABC');
    const b = await provider.fetchOutstandingByRegistration('GP123ABC');
    expect(a).toEqual(b);
    expect(a.every((fine) => fine.amount > 0)).toBe(true);
  });
});
