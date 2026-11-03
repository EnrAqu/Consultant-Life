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
  // the client's pranks (level 1): not pivotable, so the lesson chain to level 2 does not change
  hiddenClient: { label: 'il cliente in copia nascosta', pivotable: false },
  requirementChange: { label: 'il requisito che cambia a metà salto', pivotable: false },
  intern: { label: 'il budget formazione', pivotable: false },
  // the junior's stupid question (docs/JUNIOR_QUESTION.md): 0.5 GU, not a lesson
  juniorQuestion: { label: 'le domande dei junior', pivotable: false },
  // the LinkedIn job post (docs/HIRING.md): 1 GU, not a lesson
  jobPost: { label: 'gli annunci su LinkedIn', pivotable: false },
  rival: { label: "l'arrivista", pivotable: false },
  escalation: { label: "l'escalation", pivotable: false },
  // the PM and LinkedIn (docs/PM_LINKEDIN.md): born in level 2, lessons with slots in level 3
  pm: {
    label: 'il PM che ripianifica',
    pivotable: true,
    lesson: 'Il PM ora ripianifica a tuo favore: le barre del Gantt ti portano avanti, e le risorse te le presta lui.',
  },
  linkedin: {
    label: 'i post virali su LinkedIn',
    pivotable: true,
    // the user's line (2026-11-03): the post that kills you was "an opportunity"; from now on the posts hold
    lesson: "LinkedIn: hai evitato un'opportunità, errore.",
  },
  // IT and HR (docs/IT_HR_EXTERNAL.md): IT born in level 2 (slots in level 3), HR born in level 3 (slot in level 4)
  it: {
    label: "l'IT",
    pivotable: true,
    lesson: "L'IT ora è dalla tua parte: hai il numero diretto del sistemista.",
  },
  hr: {
    label: "l'HR",
    pivotable: true,
    lesson: "Hai capito come funziona HR: l'attestato ce l'hai già, e il team building lo salti.",
  },
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
export const INCIDENT_WEIGHT = { death: 1, fakeKT: 2, micromanager: 1, fiveMinutes: 1, pm: 1, linkedin: 1, it: 1, hr: 1 };
