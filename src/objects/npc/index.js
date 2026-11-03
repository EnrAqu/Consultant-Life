import Micromanager from './Micromanager.js';
import FiveMinutesDoor from './FiveMinutesDoor.js';
import InternDesk from '../team/InternDesk.js';
import Rival from './Rival.js';
import Worker from './Worker.js';
import PmStaffing from './PmStaffing.js';
import Recruiter from './Recruiter.js';
import TeamBuilding from './TeamBuilding.js';
import Contractor from './Contractor.js';
import JuniorStall from './JuniorStall.js';
import { TempAgency, JobPost } from './HiringDesk.js';

export const NPC_CLASSES = {
  micromanager: Micromanager,
  fiveMinutes: FiveMinutesDoor,
  intern: InternDesk,
  rival: Rival,
  worker: Worker,
  pmStaffing: PmStaffing,
  recruiter: Recruiter,
  teamBuilding: TeamBuilding,
  contractor: Contractor,
  juniorStall: JuniorStall,
  tempAgency: TempAgency,
  jobPost: JobPost,
};
