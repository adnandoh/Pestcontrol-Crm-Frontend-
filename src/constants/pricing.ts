export interface ServicePrice {
  '1 RK': number;
  '1 BHK': number;
  '2 BHK': number;
  '3 BHK': number;
  '4 BHK': number;
}

export interface PricingData {
  [service: string]: {
    [type: string]: ServicePrice | number | { [key: string]: number };
  };
}

export const PRICING_DATA: any = {
  'Cockroach / Ants': {
    'AMC 3 Services': {
      '1 RK': 1800,
      '1 BHK': 2200,
      '2 BHK': 2500,
      '3 BHK': 3000,
      '4 BHK': 3500
    },
    'One Time Service': {
      '1 RK': 1000,
      '1 BHK': 1200,
      '2 BHK': 1500,
      '3 BHK': 1800,
      '4 BHK': 2000
    }
  },
  'Bed Bugs': {
    'One Time Service': {
      '1 RK': 2000,
      '1 BHK': 2500,
      '2 BHK': 3000,
      '3 BHK': 3500,
      '4 BHK': 4000
    }
  },
  'Termite': {
    'One Time Service': {
      '1 RK': 2000,
      '1 BHK': 2500,
      '2 BHK': 3000,
      '3 BHK': 3500,
      '4 BHK': 4000
    }
  },
  'Rodent': {
    'One Time Service': {
      'Windows': 1000,
      'Society Area': 0 // Depends on visit
    }
  },
  'Mosquito': {
    'One Time Service': {
      '1 RK': 800,
      '1 BHK': 1000,
      '2 BHK': 1500,
      '3 BHK': 1800,
      '4 BHK': 2000
    }
  },
  'Hotel / Commercial': {
    'One Time Service': {
      'Commercial Space': 0 // Inspection Required
    }
  }
};

export const PROPERTY_LOCATIONS = [
  '1 RK',
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK'
];

export const SERVICE_TYPES: any = {
  'Cockroach / Ants': ['One Time Service', 'AMC 3 Services'],
  'Bed Bugs': ['One Time Service', 'AMC 3 Services'],
  'Termite': ['One Time Service', 'AMC 3 Services'],
  'Rodent': ['One Time Service', 'AMC 3 Services'],
  'Mosquito': ['One Time Service', 'AMC 3 Services'],
  'Hotel / Commercial': ['One Time Service', 'AMC 3 Services']
};
