/**
 * Declaration draft for ASYCUDA-oriented handoff.
 * NOT an official Jordan SAD schema — a structured draft for broker review / future mapping.
 */
import type { PortalShipment } from '@/lib/types';
import { searchJordanTariffs } from '@/lib/tariffSearch';
import { HS_CODES } from '@/data/hsCodes';

export interface DeclarationDraftItem {
  lineNo: number;
  hsCode: string;
  hsConfidence: number | null;
  descriptionEn: string;
  descriptionAr: string;
  originEn: string;
  originAr: string;
  packages: number | null;
  grossMassKg: number | null;
  invoiceValue: number | null;
  currency: string;
}

export interface DeclarationDraft {
  formatVersion: 'raya-draft-1';
  generatedAt: string;
  disclaimerEn: string;
  disclaimerAr: string;
  officeHint: string;
  regimeHint: string;
  parties: {
    importerTaxNumber: string;
    importerNameEn: string;
    importerNameAr: string;
    declarantRef: string;
  };
  transport: {
    blNo: string;
    containerNo?: string;
    dischargeDate?: string;
    lastFreeDay?: string;
  };
  declaration: {
    commercialRef?: string;
    statusInAgency: string;
    selectivityLane?: string | null;
    pcaOpen?: boolean;
  };
  items: DeclarationDraftItem[];
  documents: { type: string; nameEn: string; nameAr: string; available: boolean }[];
  integration: {
    target: 'ASYCUDAWorld';
    mode: 'manual_handoff';
    messageType: 'SAD_DRAFT';
  };
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildDeclarationDraft(
  shipment: PortalShipment,
  opts?: { goodsQuery?: string; forceHs?: string },
): DeclarationDraft {
  const q = (opts?.goodsQuery || shipment.goodsEn || '').trim();
  let hsCode = opts?.forceHs || shipment.hsCodeSuggested || '';
  let hsConfidence: number | null = null;
  let descEn = shipment.goodsEn;
  let descAr = shipment.goodsAr;

  if (!hsCode && q) {
    const ranked = searchJordanTariffs(q, HS_CODES, 1);
    if (ranked[0]) {
      hsCode = ranked[0].item.code;
      hsConfidence = ranked[0].confidence <= 1 ? ranked[0].confidence : ranked[0].confidence / 100;
      descEn = ranked[0].item.descriptionEn;
      descAr = ranked[0].item.descriptionAr;
    }
  }

  return {
    formatVersion: 'raya-draft-1',
    generatedAt: new Date().toISOString(),
    disclaimerEn:
      'Agency draft only — not submitted to Customs. Confirm HS, values, and permits in official ASYCUDA/NSW before registration.',
    disclaimerAr:
      'مسودة الوكالة فقط — غير مُرسلة للجمارك. أكّد HS والقيم والتراخيص في الأسيكودا/النافذة الوطنية قبل التسجيل.',
    officeHint: 'JO… (set customs office in ASYCUDA)',
    regimeHint: 'IM (import) — confirm regime code nationally',
    parties: {
      importerTaxNumber: shipment.taxNumber,
      importerNameEn: shipment.customerNameEn,
      importerNameAr: shipment.customerNameAr,
      declarantRef: shipment.id,
    },
    transport: {
      blNo: shipment.blNo,
      containerNo: shipment.containerNo,
      dischargeDate: shipment.dischargeDate,
      lastFreeDay: shipment.lastFreeDay,
    },
    declaration: {
      commercialRef: shipment.declarationNo,
      statusInAgency: shipment.status,
      selectivityLane: shipment.selectivityLane,
      pcaOpen: shipment.pcaOpen,
    },
    items: [
      {
        lineNo: 1,
        hsCode: hsCode || 'TBD',
        hsConfidence,
        descriptionEn: descEn,
        descriptionAr: descAr,
        originEn: shipment.originEn,
        originAr: shipment.originAr,
        packages: null,
        grossMassKg: null,
        invoiceValue: null,
        currency: 'JOD',
      },
    ],
    documents: shipment.documents.map((d) => ({
      type: d.type,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      available: d.available,
    })),
    integration: {
      target: 'ASYCUDAWorld',
      mode: 'manual_handoff',
      messageType: 'SAD_DRAFT',
    },
  };
}

export function declarationDraftToJson(draft: DeclarationDraft): string {
  return JSON.stringify(draft, null, 2);
}

/** Simplified XML inspired by SAD general + item segments — not official XSD. */
export function declarationDraftToXml(draft: DeclarationDraft): string {
  const items = draft.items
    .map(
      (it) => `
    <Item>
      <LineNo>${it.lineNo}</LineNo>
      <HSCode>${xmlEscape(it.hsCode)}</HSCode>
      <HSConfidence>${it.hsConfidence ?? ''}</HSConfidence>
      <DescriptionEn>${xmlEscape(it.descriptionEn)}</DescriptionEn>
      <DescriptionAr>${xmlEscape(it.descriptionAr)}</DescriptionAr>
      <OriginEn>${xmlEscape(it.originEn)}</OriginEn>
      <OriginAr>${xmlEscape(it.originAr)}</OriginAr>
      <Packages>${it.packages ?? ''}</Packages>
      <GrossMassKg>${it.grossMassKg ?? ''}</GrossMassKg>
      <InvoiceValue>${it.invoiceValue ?? ''}</InvoiceValue>
      <Currency>${xmlEscape(it.currency)}</Currency>
    </Item>`,
    )
    .join('');

  const docs = draft.documents
    .map(
      (d) => `
    <Document type="${xmlEscape(d.type)}" available="${d.available}">
      <NameEn>${xmlEscape(d.nameEn)}</NameEn>
      <NameAr>${xmlEscape(d.nameAr)}</NameAr>
    </Document>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<RayaDeclarationDraft version="${draft.formatVersion}" generatedAt="${xmlEscape(draft.generatedAt)}">
  <Disclaimer lang="en">${xmlEscape(draft.disclaimerEn)}</Disclaimer>
  <Disclaimer lang="ar">${xmlEscape(draft.disclaimerAr)}</Disclaimer>
  <Integration target="${draft.integration.target}" mode="${draft.integration.mode}" messageType="${draft.integration.messageType}"/>
  <OfficeHint>${xmlEscape(draft.officeHint)}</OfficeHint>
  <RegimeHint>${xmlEscape(draft.regimeHint)}</RegimeHint>
  <Parties>
    <ImporterTaxNumber>${xmlEscape(draft.parties.importerTaxNumber)}</ImporterTaxNumber>
    <ImporterNameEn>${xmlEscape(draft.parties.importerNameEn)}</ImporterNameEn>
    <ImporterNameAr>${xmlEscape(draft.parties.importerNameAr)}</ImporterNameAr>
    <DeclarantRef>${xmlEscape(draft.parties.declarantRef)}</DeclarantRef>
  </Parties>
  <Transport>
    <BLNumber>${xmlEscape(draft.transport.blNo)}</BLNumber>
    <ContainerNo>${xmlEscape(draft.transport.containerNo || '')}</ContainerNo>
    <DischargeDate>${xmlEscape(draft.transport.dischargeDate || '')}</DischargeDate>
    <LastFreeDay>${xmlEscape(draft.transport.lastFreeDay || '')}</LastFreeDay>
  </Transport>
  <Declaration>
    <CommercialRef>${xmlEscape(draft.declaration.commercialRef || '')}</CommercialRef>
    <AgencyStatus>${xmlEscape(draft.declaration.statusInAgency)}</AgencyStatus>
    <SelectivityLane>${xmlEscape(draft.declaration.selectivityLane || '')}</SelectivityLane>
    <PCAOpen>${draft.declaration.pcaOpen ? 'true' : 'false'}</PCAOpen>
  </Declaration>
  <Items>${items}
  </Items>
  <Documents>${docs}
  </Documents>
</RayaDeclarationDraft>
`;
}

export function draftFilename(draft: DeclarationDraft, ext: 'json' | 'xml'): string {
  const ref =
    draft.declaration.commercialRef ||
    draft.transport.blNo ||
    draft.parties.declarantRef ||
    'draft';
  const safe = ref.replace(/[^\w./-]+/g, '_');
  return `raya-sad-draft-${safe}.${ext}`;
}
