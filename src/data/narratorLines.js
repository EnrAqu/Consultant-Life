export const NARRATOR_LINES = [
  // levelStart
  { id: 'start_1', event: 'levelStart', text: 'Benvenuto a bordo! Il cliente è molto... motivato.' },
  { id: 'start_2', event: 'levelStart', text: 'Primo giorno. Le aspettative sono basse, ma tu puoi abbassarle ancora.' },
  { id: 'pivot_1', event: 'levelStartPivot', text: "Non è un problema, è un'opportunità. ({pivotLabel})" },
  { id: 'pivot_2', event: 'levelStartPivot', text: 'Abbiamo fatto tesoro delle lessons learned. Su {pivotLabel}, almeno.' },

  // generic deaths
  { id: 'death_generic_1', event: 'death', text: 'Ottimo lavoro. Rifacciamolo.' },
  { id: 'death_generic_2', event: 'death', text: 'Interessante approccio. Non replicabile, spero.' },
  { id: 'death_generic_3', event: 'death', text: 'Lo segno come "work in progress".' },

  // per cause
  { id: 'death_pit_1', event: 'death', when: { cause: 'pit' }, text: 'Il burrone era in scope. Era nella slide 47.' },
  { id: 'death_pit_2', event: 'death', when: { cause: 'pit' }, text: 'Hai toccato il fondo. Metaforicamente ce lo aspettavamo.' },
  { id: 'death_spike_1', event: 'death', when: { cause: 'spike' }, text: "Le deadline sono puntuali. Tu un po' meno." },
  { id: 'death_spike_2', event: 'death', when: { cause: 'spike' }, text: 'Era una deadline, non un suggerimento.' },
  { id: 'death_replyall_1', event: 'death', when: { cause: 'replyAll' }, text: 'Bastava silenziare il thread. Come da mia precedente email.' },
  { id: 'death_replyall_2', event: 'death', when: { cause: 'replyAll' }, text: 'Ti ho messo in CC. Anzi, ti ho messo sotto.' },
  { id: 'death_scope_1', event: 'death', when: { cause: 'scopeCreep' }, text: 'Il cliente ha solo aggiunto una piccola cosa.' },
  { id: 'death_scope_2', event: 'death', when: { cause: 'scopeCreep' }, text: 'Era una change request minore. Minore per chi, è da vedere.' },
  { id: 'death_deck_1', event: 'death', when: { cause: 'deckCollapse' }, text: 'La v7 era quella buona. La v8 ti è caduta addosso.' },
  { id: 'death_deck_2', event: 'death', when: { cause: 'deckCollapse' }, text: 'Sessanta slide di backup. Tutte su di te.' },
  { id: 'death_self_1', event: 'death', when: { cause: 'selfRestart' }, text: 'Dimissioni accettate. Ti riassumiamo subito, stessa RAL.' },
  { id: 'death_self_2', event: 'death', when: { cause: 'selfRestart' }, text: 'Ripartire da zero è molto agile. Costa uguale.' },

  // same spot
  { id: 'spot_1', event: 'death', when: { minSpot: 3 }, text: 'È la {spotCount}ª volta che muori esattamente qui. Lo mettiamo a processo?' },
  { id: 'spot_2', event: 'death', when: { minSpot: 3 }, text: '{spotCount}ª volta qui. Ormai è il tuo ufficio.' },

  // milestones
  { id: 'ms_1', event: 'death', when: { runDeathsExact: 1 }, text: 'La prima non si scorda mai. Né si fattura.' },
  { id: 'ms_5', event: 'death', when: { runDeathsExact: 5 }, text: '5 tentativi. Lo chiamerei "approccio iterativo".' },
  { id: 'ms_10', event: 'death', when: { runDeathsExact: 10 }, text: '10. Il cliente chiede se è normale. Gli ho detto di sì.' },
  { id: 'ms_25', event: 'death', when: { runDeathsExact: 25 }, text: '25 tentativi. Proporrei un workshop.' },
  { id: 'ms_50', event: 'death', when: { runDeathsExact: 50 }, text: '50. Ti candido per il premio "resilienza".' },

  // other events
  { id: 'kt_fake_1', event: 'ktFake', text: "Ottimo, un'ora di KT. Ora sai esattamente quanto prima." },
  { id: 'kt_fake_2', event: 'ktFake', text: 'KT completato. Domande? Bene, nessuna risposta.' },
  { id: 'kt_real_1', event: 'ktReal', text: "Questa volta il KT l'ha fatto qualcuno che sapeva le cose. Strano." },
  { id: 'standup_1', event: 'standupStart', text: "Giro veloce: cosa hai fatto ieri, cosa fai oggi, perché sei a mezz'aria." },
  { id: 'standup_2', event: 'standupStart', text: 'Due minuti, promesso. Come sempre.' },
  { id: 'overrun_1', event: 'standupOverrun', text: 'Si è aggiunto il cliente. Ha "solo un paio di domande".' },
  { id: 'budget_low_1', event: 'budgetLow', text: 'Le GU stanno finendo. Facciamo un allineamento veloce?' },
  { id: 'checkpoint_1', event: 'checkpoint', text: 'Pausa caffè registrata. Non abituarti.' },
  { id: 'idle_1', event: 'idle', text: 'Tutto ok? Ti vedo offline su Teams.' },
  { id: 'budget_over_1', event: 'budgetOver', text: 'Abbiamo sforato. Ne parliamo con il cliente. Cioè, ne parli tu.' },
  { id: 'complete_1', event: 'levelComplete', text: 'Consegnato. Il cliente ha già delle osservazioni.' },
];
