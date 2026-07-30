import { normalizeTelemetry } from '../telematics/cartrack.live';
import { MockGhlProvider } from './ghl.mock';

describe('MockGhlProvider', () => {
  it('returns deterministic mock contact and opportunity ids', async () => {
    const provider = new MockGhlProvider();
    const contact = await provider.upsertContact({
      clientId: '11111111-2222-3333-4444-555555555555',
      firstName: 'Thabo',
      lastName: 'Mokoena',
      email: null,
      phone: '+27821234567',
      idNumber: '9001015800083',
      addressLine1: '1 Main Rd',
      city: 'Randburg',
      province: 'GP',
      postalCode: '2194',
    });
    expect(contact.contactId).toMatch(/^MOCK-CONTACT-/);

    const opportunity = await provider.createOpportunity({
      contractId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      contactId: contact.contactId,
      clientName: 'Thabo Mokoena',
      vehicleRegistration: 'GP123ABC',
      planType: 'CIP_10',
      endDate: new Date().toISOString(),
      daysRemaining: 45,
    });
    expect(opportunity.opportunityId).toMatch(/^MOCK-OPP-/);

    const workflow = await provider.emitWorkflow({
      event: 'MISSED_PAYMENT',
      occurredAt: new Date().toISOString(),
      detail: 'test',
    });
    expect(workflow.messageId).toMatch(/^mock-msg-/);
  });
});

describe('normalizeTelemetry still available for breach codes', () => {
  it('maps speeding events used by GHL routing', () => {
    const snapshot = normalizeTelemetry('DEV', {
      lat: -26.1,
      lng: 28.0,
      odometerKm: 1000,
      events: [{ type: 'SPEEDING', severity: 'high', message: 'fast' }],
    });
    expect(snapshot.ruleBreaches[0]?.code).toBe('SPEEDING');
  });
});
