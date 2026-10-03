import { describe, expect, it } from 'vitest';
import { technicianMatchesStaffSearch } from './technicianStaffSearch';
import {
  bookingCityLabel,
  bookingLocationLabel,
  lineupRoleLabel,
  splitAssignedTechnicians,
  technicianAreaChips,
  technicianCoversCity,
  technicianIsAssignedToBooking,
} from './assignTechnicianLineup';

const booking = {
  master_city_name: 'Mumbai',
  master_location_name: 'Andheri',
  city: 'Mumbai',
  schedule_datetime: '2026-09-27T04:30:00Z',
  time_slot: '10:00 AM - 12:00 PM',
};

describe('assign technician lineup areas', () => {
  it('lists every selected city and marks only the booking city', () => {
    const chips = technicianAreaChips(
      {
        service_cities: [
          { name: 'Mumbai', state_name: 'Maharashtra' },
          { name: 'Navi Mumbai' },
          { name: 'Thane' },
        ],
        city: 'Mumbai, Navi Mumbai, Thane',
        service_area: 'Mumbai, Navi Mumbai, Thane',
      },
      booking,
    );
    expect(chips.map((chip) => chip.label)).toEqual(['Mumbai', 'Navi Mumbai', 'Thane']);
    expect(chips.filter((chip) => chip.matchesBooking).map((chip) => chip.label)).toEqual(['Mumbai']);
  });

  it('falls back to free-text city and service area when no cities are selected', () => {
    const chips = technicianAreaChips(
      { service_cities: [], city: 'Pune', service_area: 'Pune / Navi Mumbai' },
      booking,
    );
    expect(chips.map((chip) => chip.label)).toEqual(['Pune', 'Navi Mumbai']);
    expect(chips.find((chip) => chip.label === 'Navi Mumbai')?.matchesBooking).toBe(false);
  });

  it('reads the booking city and location separately', () => {
    expect(bookingCityLabel(booking)).toBe('Mumbai');
    expect(bookingLocationLabel(booking)).toBe('Andheri');
  });

  it('filters technicians by assign city chip', () => {
    const tech = {
      service_cities: [{ name: 'Pune' }, { name: 'Lonavala' }],
    };
    expect(technicianCoversCity(tech, '')).toBe(true);
    expect(technicianCoversCity(tech, 'Pune')).toBe(true);
    expect(technicianCoversCity(tech, 'Mumbai')).toBe(false);
  });
});

describe('assign technician lineup sections', () => {
  const adnan = {
    id: 1,
    name: 'ADNAN SHAIKH',
    mobile: '8828936896',
    technician_type: 'partner',
    base_services: ['Cockroach/ Ants'],
    assigned_service_lines: [],
  };
  const akshay = {
    id: 2,
    name: 'AKSHAY KUMAR',
    mobile: '9876543210',
    technician_type: 'secondary',
    base_services: ['Termite'],
    assigned_service_lines: [{ id: 3303, service_type: 'Termite' }],
  };

  it('labels partner as Priority and secondary as Secondary', () => {
    expect(lineupRoleLabel(adnan.technician_type)).toBe('Priority');
    expect(lineupRoleLabel(akshay.technician_type)).toBe('Secondary');
    expect(lineupRoleLabel('salaried')).toBe('Salaried');
  });

  it('splits staff who already have this booking from everyone else', () => {
    const { assigned, unassigned } = splitAssignedTechnicians([adnan, akshay], booking);
    expect(assigned.map((tech) => tech.name)).toEqual(['AKSHAY KUMAR']);
    expect(unassigned.map((tech) => tech.name)).toEqual(['ADNAN SHAIKH']);
    expect(technicianIsAssignedToBooking(akshay, booking)).toBe(true);
  });

  it('keeps name and mobile search working before the split', () => {
    const staff = [adnan, akshay];
    const matched = staff.filter((tech) => technicianMatchesStaffSearch(tech, 'aksh'));
    const { assigned, unassigned } = splitAssignedTechnicians(matched, booking);
    expect(assigned.map((tech) => tech.name)).toEqual(['AKSHAY KUMAR']);
    expect(unassigned).toEqual([]);
    expect(staff.filter((tech) => technicianMatchesStaffSearch(tech, 'shaikh'))).toHaveLength(1);
    expect(staff.filter((tech) => technicianMatchesStaffSearch(tech, '88289'))).toHaveLength(1);
  });
});
