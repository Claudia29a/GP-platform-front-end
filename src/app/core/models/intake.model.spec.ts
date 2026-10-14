import { areaLabel, durationLabel, symptomLabels } from './intake.model';

describe('intake labels', () => {
  it('shows the area in plain words, or what the patient wrote for Other', () => {
    expect(areaLabel({ complaintArea: 'CHEST_BREATHING', complaintAreaOther: null })).toBe('Chest & breathing');
    expect(areaLabel({ complaintArea: 'OTHER', complaintAreaOther: 'Ears' })).toBe('Other: Ears');
  });

  it('shows the duration in plain words', () => {
    expect(durationLabel('ONE_TO_THREE_DAYS')).toBe('1–3 days');
  });

  it('lists symptoms in checklist order, followed by the patient’s own words', () => {
    expect(symptomLabels({ symptoms: ['TROUBLE_SLEEPING', 'FEVER'], symptomsOther: 'Ringing ears' })).toEqual([
      'Fever',
      'Trouble sleeping',
      'Ringing ears',
    ]);
    expect(symptomLabels({ symptoms: [], symptomsOther: null })).toEqual([]);
  });
});
