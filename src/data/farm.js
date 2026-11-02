// The farm's phone (docs/FARM.md §4): messages from the old job, in a fixed order (cycled if the day is long).
export const PHONE_MESSAGES = [
  { from: 'Marco (ex team)', text: 'Hai 5 minuti?' },
  { from: 'Calendario', text: 'Daily standup tra 3 minuti' },
  { from: 'Il Cliente', text: 'Una domanda veloce veloce' },
  { from: 'HR', text: 'Ricordati il timesheet di ottobre' },
  { from: 'Partner', text: 'Ti giro una cosa. Niente di urgente. URGENTE.' },
  { from: 'Il Cliente', text: 'E chi è mo questo? (Ah, sei tu.)' },
  { from: 'Recruiter', text: 'Opportunità imperdibile come Senior Consultant' },
  { from: 'Teams', text: 'Sei stato aggiunto a "Allineamento sull\'allineamento"' },
];

// On the bench, if the phone is still in your pocket.
export const FINAL_MESSAGE = { from: 'Partner', text: 'Domani alle 8 call di allineamento?' };
