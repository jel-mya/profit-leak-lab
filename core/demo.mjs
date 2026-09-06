export const demoDate = '2026-09-06';
export const demo = {
  jobs: [
    { id: 'J101', name: 'Riverside bathroom', revenue: 24000, materials: 8200, subcontractors: 3100, labour: 7400, other: 850 },
    { id: 'J102', name: 'Northside switchboard', revenue: 12800, materials: 3900, subcontractors: 0, labour: 2900, other: 600 },
    { id: 'J103', name: 'Workshop fit-out', revenue: 36500, materials: 13200, subcontractors: 7200, labour: 9100, other: 1200 },
    { id: 'J104', name: 'Hill Street service', revenue: 4800, materials: 850, subcontractors: 0, labour: 1600, other: 200 },
  ],
  debtors: [
    { id: 'D101', customer: 'Example Property Co', dueDate: '2026-06-01', outstanding: 6400 },
    { id: 'D102', customer: 'Sample Workshop Ltd', dueDate: '2026-08-01', outstanding: 3800 },
    { id: 'D103', customer: 'Demo Homeowner', dueDate: '2026-09-15', outstanding: 2200 },
  ],
  payments: [
    { id: 'P101', supplierId: 'S1', supplier: 'Example Trade Supply', invoice: 'INV-204', amount: 1250 },
    { id: 'P102', supplierId: 'S1', supplier: 'Example Trade Supply', invoice: 'INV 204', amount: 1250 },
    { id: 'P103', supplierId: 'S2', supplier: 'Sample Electrical', invoice: 'E-92', amount: 840 },
  ],
  labour: [
    { id: 'L101', jobId: 'J101', person: 'Demo crew A', claimedHours: 96, approvedHours: 80, rate: 65 },
    { id: 'L102', jobId: 'J103', person: 'Demo crew B', claimedHours: 120, approvedHours: 112, rate: 70 },
  ],
};
