export type AgentId = 'hs' | 'docs' | 'next_action' | 'money' | 'carrier_track' | 'historical_import' | 'workflow_report' | 'declaration_lookup' | 'project_audit' | 'legal_research' | 'employee_portal' | 'ui_polish' | 'logistics_benchmark';

export type Confidence = 'high' | 'medium' | 'low';

export interface AgentSuggestion {
  id: string;
  agentId: AgentId;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  confidence: Confidence;
  /** Soft priority for sorting */
  priority: number;
  links?: { href: string; labelEn: string; labelAr: string }[];
  meta?: Record<string, string>;
}

export interface AgentRunInput {
  /** Free text: goods description, invoice line, question */
  query?: string;
  declarationNo?: string;
  taxNumber?: string;
  selectivityLane?: string | null;
  status?: string;
  lastFreeDay?: string;
  dischargeDate?: string;
  duties?: number;
  portFees?: number;
  otherGov?: number;
  agencyFee?: number;
  mode?: 'pay_first' | 'client_prepay';
  goodsEn?: string;
  originEn?: string;
  containerNo?: string;
  blNo?: string;
}

export interface AgentRunResult {
  agentId: AgentId;
  ranAt: string;
  suggestions: AgentSuggestion[];
  disclaimerEn: string;
  disclaimerAr: string;
}
