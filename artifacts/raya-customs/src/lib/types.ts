export interface HSCodeItem {
  code: string;
  descriptionEn: string;
  descriptionAr: string;
  dutyRateRaw: string;
  chapter?: string;
  parentCode?: string;
  matchStatus?: string;
}

export interface TariffSearchResult {
  item: HSCodeItem;
  score: number;
  confidence: number;
  matchedConcepts: string[];
  needsReview: boolean;
  matchKind?: 'exact_code' | 'code_prefix' | 'description';
}

export interface Authority {
  id: string;
  icon: string;
  titleEn: string;
  titleAr: string;
  roleEn: string;
  roleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  documentsEn: string;
  documentsAr: string;
  portalUrl?: string;
  n4CapUrl?: string;
  whenRequiredEn: string;
  whenRequiredAr: string;
  typicalTimelineEn: string;
  typicalTimelineAr: string;
}

export interface WorkflowStep {
  id: string;
  phaseId: string;
  number: string;
  titleEn: string;
  titleAr: string;
  actorEn: string;
  actorAr: string;
  detailEn: string;
  detailAr: string;
  documentsEn: string[];
  documentsAr: string[];
  risksEn: string[];
  risksAr: string[];
  tipsEn: string[];
  tipsAr: string[];
  systemsEn?: string;
  systemsAr?: string;
}

export interface WorkflowPhase {
  id: string;
  number: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  steps: WorkflowStep[];
}

export interface LawRegulation {
  id: string;
  category: 'import' | 'export' | 'customs' | 'tax' | 'special' | 'transport';
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  keyPointsEn: string[];
  keyPointsAr: string[];
  authorityEn: string;
  authorityAr: string;
  relevanceEn: string;
  relevanceAr: string;
}

export interface AsycudaStep {
  number: string;
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  notesEn?: string;
  notesAr?: string;
}

export interface ActFreeDayRule {
  cargoTypeEn: string;
  cargoTypeAr: string;
  freeDays: number;
  noteEn: string;
  noteAr: string;
}

export interface ProcedureStep {
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
}

export interface ProcedurePhase {
  id: string;
  number: string;
  titleEn: string;
  titleAr: string;
  steps: ProcedureStep[];
}

export interface NavItem {
  href: string;
  labelEn: string;
  labelAr: string;
}

/** Customer portal session (mirrors production: signed, 8h expiry, scoped to tax number) */
export interface PortalSession {
  token: string;
  /** Server JWT when API is available */
  accessToken?: string;
  refreshToken?: string;
  taxNumber: string;
  customerNameEn: string;
  customerNameAr: string;
  issuedAt: string;
  expiresAt: string;
  shipmentIds: string[];
  serverValidated?: boolean;
}

export type ShipmentStatus =
  | 'pre_arrival'
  | 'at_terminal'
  | 'declared'
  | 'doc_check'
  | 'under_inspection'
  | 'duties_paid'
  | 'released'
  | 'delivered'
  | 'closed';

/** ASYCUDA selectivity lane after declaration registration */
export type SelectivityLane = 'green' | 'yellow' | 'red' | 'blue';

/** Inspection Act outcome when physical exam occurred */
export type InspectionOutcome = 'conform' | 'discrepancy' | 'sample_pending' | 'hold';

export interface PortalShipment {
  id: string;
  accessCode: string;
  taxNumber: string;
  customerNameEn: string;
  customerNameAr: string;
  declarationNo?: string;
  blNo: string;
  containerNo?: string;
  status: ShipmentStatus;
  statusEn: string;
  statusAr: string;
  /** Set once declaration is registered and selectivity has run */
  selectivityLane?: SelectivityLane | null;
  /** Filled after Inspection Act when red (or ordered) exam completes */
  inspectionOutcome?: InspectionOutcome | null;
  inspectionNoteEn?: string;
  inspectionNoteAr?: string;
  /** True when blue lane or PCA file remains open after release */
  pcaOpen?: boolean;
  originEn: string;
  originAr: string;
  goodsEn: string;
  goodsAr: string;
  dischargeDate?: string;
  lastFreeDay?: string;
  updatedAt: string;
  documents: PortalDocument[];
  /** Suggested / confirmed HS from assist agent */
  hsCodeSuggested?: string;
  hsConfidence?: number;
  agentNoteEn?: string;
  agentNoteAr?: string;
}

export interface PortalDocument {
  id: string;
  nameEn: string;
  nameAr: string;
  type: 'invoice' | 'bl' | 'release' | 'permit' | 'other';
  available: boolean;
}

/** Chart-of-accounts style code used in Raya disbursement modeling */
export type AccountCode =
  | '122100' // Clearing receivable (pay-first asset)
  | '222100' // Clearing payable / client prepay liability
  | '111000' // Cash / bank
  | '411100' // Agency service revenue
  | '511100'; // Direct cost of service (if any)

export type DisbursementMode = 'pay_first' | 'client_prepay';

export interface JournalLine {
  account: AccountCode;
  accountNameEn: string;
  accountNameAr: string;
  debit: number;
  credit: number;
  memoEn: string;
  memoAr: string;
}

export interface DisbursementCase {
  id: string;
  declarationNo: string;
  clientNameEn: string;
  clientNameAr: string;
  mode: DisbursementMode;
  currency: 'JOD';
  duties: number;
  portFees: number;
  otherGovCharges: number;
  agencyFee: number;
  status: 'open' | 'recovered' | 'closed';
  statusEn: string;
  statusAr: string;
  createdAt: string;
  /** Last payout / recovery / true-up date (for aging) */
  lastMovementAt?: string;
  /** Pass-through already recovered from client (pay-first partial) */
  recoveredPassThrough?: number;
  /** Prepay cash received from client */
  prepayReceived?: number;
  /** Pass-through already applied against prepay */
  appliedPassThrough?: number;
  /** Flagged reconciling exception (demo) */
  exceptionEn?: string;
  exceptionAr?: string;
}

export type ClearingAccount = '122100' | '222100';

export type AgingBucket = '0-7' | '8-15' | '16-30' | '30+';

export interface SubledgerLine {
  caseId: string;
  declarationNo: string;
  clientNameEn: string;
  clientNameAr: string;
  account: ClearingAccount;
  /** Positive = debit balance (receivable) or credit balance amount for liability display */
  openBalance: number;
  /** Debit-normal signed: + = asset open, - = liability open */
  signedBalance: number;
  agingDays: number;
  agingBucket: AgingBucket;
  status: DisbursementCase['status'];
  lastMovementAt: string;
  exceptionEn?: string;
  exceptionAr?: string;
}

export interface ClearingReconciliation {
  asOf: string;
  lines: SubledgerLine[];
  subledger122100: number;
  subledger222100: number;
  /** Demo stand-in for posted GL control balances */
  gl122100: number;
  gl222100: number;
  diff122100: number;
  diff222100: number;
  tiedOut: boolean;
  aging: Record<AgingBucket, { count: number; amount122100: number; amount222100: number }>;
  exceptions: SubledgerLine[];
}

export interface AccountDefinition {
  code: string;
  nameEn: string;
  nameAr: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  roleEn: string;
  roleAr: string;
}
