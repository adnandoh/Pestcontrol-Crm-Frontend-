import { describe, expect, it } from 'vitest';
import { technicianMatchesStaffSearch, type StaffSearchable } from './technicianStaffSearch';

const adnan: StaffSearchable = {
  name: 'ADNAN SHAIKH',
  mobile: '8828936896',
  base_services: ['Cockroach/ Ants', 'Bed Bugs', 'Termite'],
};

const akshay: StaffSearchable = {
  name: 'AKSHAY KUMAR',
  mobile: '9876543210',
  phone: '',
  base_services: ['Rodent', 'Mosquito'],
};

const staff = [adnan, akshay];

function matching(query: string) {
  return staff.filter((tech) => technicianMatchesStaffSearch(tech, query)).map((tech) => tech.name);
}

describe('technician staff search', () => {
  it('keeps the full list when the query is empty or whitespace', () => {
    expect(matching('')).toEqual(['ADNAN SHAIKH', 'AKSHAY KUMAR']);
    expect(matching('   ')).toEqual(['ADNAN SHAIKH', 'AKSHAY KUMAR']);
  });

  it('filters by partial name without matching every mobile', () => {
    expect(matching('adnan')).toEqual(['ADNAN SHAIKH']);
    expect(matching('SHAIKH')).toEqual(['ADNAN SHAIKH']);
    expect(matching('kuma')).toEqual(['AKSHAY KUMAR']);
    expect(matching('zzz')).toEqual([]);
  });

  it('filters by partial mobile and ignores spaces or dashes in the query', () => {
    expect(matching('88289')).toEqual(['ADNAN SHAIKH']);
    expect(matching('8828 936')).toEqual(['ADNAN SHAIKH']);
    expect(matching('98765')).toEqual(['AKSHAY KUMAR']);
    expect(matching('0000')).toEqual([]);
  });

  it('matches phone and alternative mobile when the primary number does not', () => {
    const tech: StaffSearchable = {
      name: 'RIYA',
      mobile: '9000000001',
      phone: '+91 77111 22233',
      alternative_mobile: '6666-555-444',
    };
    expect(technicianMatchesStaffSearch(tech, '771112')).toBe(true);
    expect(technicianMatchesStaffSearch(tech, '6666555')).toBe(true);
    expect(technicianMatchesStaffSearch(tech, '900000')).toBe(true);
  });

  it('still matches a base service label by partial text', () => {
    expect(matching('termite')).toEqual(['ADNAN SHAIKH']);
    expect(matching('mosq')).toEqual(['AKSHAY KUMAR']);
  });
});
