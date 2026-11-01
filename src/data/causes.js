export const CAUSES = {
  pit: { label: 'il burrone delle deadline', pivotable: false },
  spike: { label: 'le deadline appuntite', pivotable: false },
  selfRestart: { label: 'le dimissioni volontarie', pivotable: false },
  replyAll: {
    label: 'le email in "Rispondi a tutti"',
    pivotable: true,
    lesson: 'Le email cadenti diventano piattaforme su cui salire.',
  },
  scopeCreep: {
    label: 'lo scope creep',
    pivotable: true,
    lesson: 'Lo scope creep ora allunga i ponti sopra i burroni.',
  },
  deckCollapse: {
    label: 'il deck_FINAL_v7_DEF_ok.pptx',
    pivotable: true,
    lesson: 'Le slide che crollano ora diventano un ponte.',
  },
  fakeKT: {
    label: 'i finti KT',
    pivotable: true,
    lesson: 'Questa volta il KT è vero: rivela la strada nascosta.',
  },
  micromanager: {
    label: 'il micromanagement',
    pivotable: true,
    lesson: 'Il micromanager ora ti precede e ti indica le trappole.',
  },
  clientSwitch: { label: 'il cliente che cambia idea', pivotable: false },
  intern: { label: 'il budget formazione', pivotable: false },
  rival: { label: "l'arrivista", pivotable: false },
  escalation: { label: "l'escalation", pivotable: false },
  fiveMinutes: {
    label: 'i "hai 5 minuti?"',
    pivotable: true,
    lesson: 'Il collega dei 5 minuti ora ti apre una scorciatoia.',
  },
};

export const DEFAULT_PIVOT_CAUSE = 'replyAll';

// Level skins (docs/LEVELS.md): the same cause, told the way that career lives it. Level 1 is a junior's project:
// AMS tickets, fixes on someone else's code, documentation. The lesson bridges to the next (consultant) project.
const SKIN_TEXT = {
  junior: {
    replyAll: { label: 'i ticket AMS in coda', lesson: 'Da consulente i ticket diventano email: e le email cadenti diventano piattaforme su cui salire.' },
    scopeCreep: { label: 'i fix sul codice di altri', lesson: 'Da consulente i fix diventano change request: ora allungano i ponti sopra i burroni.' },
    deckCollapse: { label: 'la Documentazione_v12_DEF.docx', lesson: 'Da consulente la documentazione diventa un deck: le slide che crollano ora fanno da ponte.' },
  },
};

export const causeLabel = (cause, skin = null) => SKIN_TEXT[skin]?.[cause]?.label ?? CAUSES[cause]?.label;
export const causeLesson = (cause, skin = null) => SKIN_TEXT[skin]?.[cause]?.lesson ?? CAUSES[cause]?.lesson;

// Lessons Learned weight of non-death incidents (a death always weighs 1).
export const INCIDENT_WEIGHT = { death: 1, fakeKT: 2, micromanager: 1, fiveMinutes: 1 };
