/**
 * Historical Import Agent
 * Scans folder or uploaded files containing previous ASYCUDA declarations (XML SAD) and supporting documents (PDF, images).
 * Extracts key data for import into Raya records (shipments, documents, disbursements).
 * 
 * Supports:
 * - ASYCUDA World SAD XML exports (standard General + Item segments)
 * - File classification for invoices, BOL, certificates, manifests
 * - Basic metadata extraction
 * 
 * For full OCR on scanned PDFs/images: install tesseract.js or use external OCR.
 * For production: use browser File System Access API or server upload endpoint.
 */

import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

export interface HistoricalDeclaration {
  id: string;
  declarationNo?: string;
  date?: string;
  regime?: string; // IM / EX etc.
  office?: string;
  importerTax?: string;
  importerName?: string;
  exporterName?: string;
  blNo?: string;
  containerNo?: string;
  totalValue?: number;
  currency?: string;
  totalPackages?: number;
  grossWeight?: number;
  items: Array<{
    hsCode?: string;
    description?: string;
    origin?: string;
    value?: number;
    packages?: number;
    weight?: number;
  }>;
  sourceFiles: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface HistoricalImportResult {
  declarations: HistoricalDeclaration[];
  supportingDocs: Array<{
    filename: string;
    type: string; // invoice, bol, certificate, other
    size?: number;
    extractedText?: string; // basic if text PDF
  }>;
  summary: {
    totalDeclarations: number;
    totalDocs: number;
    dateRange?: string;
  };
}

/** Simple SAD XML parser using browser DOMParser (works in client) */
export function parseSADXML(xmlString: string, filename: string): HistoricalDeclaration | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // Common ASYCUDA SAD XML structure (General Segment + Item Segment)
    // Tags vary slightly by version; look for common ones
    const getText = (tag: string) => doc.querySelector(tag)?.textContent?.trim() || undefined;
    
    const declarationNo = getText('CustomsReferenceNumber') || getText('DeclarationNumber') || getText(' SADNumber') || filename.replace(/\.[^/.]+$/, '');
    const date = getText('RegistrationDate') || getText('DeclarationDate') || getText('Date');
    const regime = getText('DeclarationModel') || getText('ProcedureCode') || getText('Regime');
    const office = getText('OfficeCode') || getText('CustomsOffice');
    
    // Parties (common tags)
    const importerTax = getText('ImporterTaxNumber') || getText('ConsigneeCode') || getText('Importer');
    const importerName = getText('ImporterName') || getText('ConsigneeName');
    const exporterName = getText('ExporterName') || getText('ConsignorName');
    
    // Transport
    const blNo = getText('BillOfLading') || getText('ManifestNumber') || getText('PreviousDocument');
    const containerNo = getText('ContainerNumber') || getText('Container');
    
    // Totals (approximate - may be in valuation or summary)
    const totalValueStr = getText('TotalInvoiceValue') || getText('CustomsValue') || getText('TotalValue');
    const totalValue = totalValueStr ? parseFloat(totalValueStr.replace(/[^0-9.]/g, '')) : undefined;
    const currency = getText('Currency') || getText('InvoiceCurrency') || 'JOD';
    
    const totalPackagesStr = getText('TotalPackages') || getText('NumberOfPackages');
    const totalPackages = totalPackagesStr ? parseInt(totalPackagesStr) : undefined;
    
    const grossWeightStr = getText('GrossWeight') || getText('TotalGrossMass');
    const grossWeight = grossWeightStr ? parseFloat(grossWeightStr) : undefined;
    
    // Items (loop over item segments)
    const items: HistoricalDeclaration['items'] = [];
    const itemNodes = doc.querySelectorAll('Item, SADItem, GoodsItem');
    itemNodes.forEach((item) => {
      const hs = item.querySelector('HSCode, CommodityCode')?.textContent?.trim();
      const desc = item.querySelector('Description, CommercialDescription, GoodsDescription')?.textContent?.trim();
      const origin = item.querySelector('CountryOfOrigin, OriginCountry')?.textContent?.trim();
      const valStr = item.querySelector('ItemValue, CustomsValue, InvoiceValue')?.textContent?.trim();
      const value = valStr ? parseFloat(valStr.replace(/[^0-9.]/g, '')) : undefined;
      const pkgStr = item.querySelector('Packages, NumberOfPackages')?.textContent?.trim();
      const packages = pkgStr ? parseInt(pkgStr) : undefined;
      const wtStr = item.querySelector('GrossWeight, NetWeight, ItemWeight')?.textContent?.trim();
      const weight = wtStr ? parseFloat(wtStr) : undefined;
      
      if (hs || desc) {
        items.push({ hsCode: hs, description: desc, origin, value, packages, weight });
      }
    });
    
    // If no items found in loop, try top level
    if (items.length === 0) {
      const hs = getText('HSCode');
      const desc = getText('Description') || getText('GoodsDescription');
      if (hs || desc) {
        items.push({ hsCode: hs, description: desc, origin: getText('CountryOfOrigin'), value: totalValue, packages: totalPackages, weight: grossWeight });
      }
    }
    
    return {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      declarationNo,
      date,
      regime,
      office,
      importerTax,
      importerName,
      exporterName,
      blNo,
      containerNo,
      totalValue,
      currency,
      totalPackages,
      grossWeight,
      items: items.length > 0 ? items : [{ hsCode: getText('HSCode'), description: getText('Description') }],
      sourceFiles: [filename],
      confidence: items.length > 0 || declarationNo ? 'high' : 'medium',
    };
  } catch (e) {
    console.warn('SAD XML parse error for', filename, e);
    return null;
  }
}

/** Main agent runner */
export function runHistoricalImportAgent(input: AgentRunInput & { folderPath?: string; fileList?: string[] }): AgentRunResult {
  const suggestions: AgentSuggestion[] = [];
  const folderPath = input.folderPath || input.query || 'selected folder / uploaded files';
  
  suggestions.push({
    id: 'historical-policy',
    agentId: 'historical_import',
    titleEn: 'Historical Declarations Import Agent',
    titleAr: 'وكيل استيراد البيانات التاريخية',
    bodyEn: `Scans the provided folder or files for previous ASYCUDA SAD XML exports and supporting documents (invoices, BOL, certificates, etc.). Extracts structured data for import into Raya records. XML parsing is robust for standard ASYCUDA World SAD format. For scanned PDFs/images, basic filename classification + optional OCR recommended.`,
    bodyAr: `يفحص المجلد أو الملفات المحددة بحثاً عن تصديرات XML SAD السابقة من الأسيكودا والوثائق الداعمة (فواتير، بوالص، شهادات منشأ...). يستخرج بيانات منظمة للاستيراد في سجلات راية. تحليل XML قوي لصيغة SAD القياسية. لملفات PDF/صور الممسوحة: تصنيف حسب الاسم + OCR اختياري.`,
    confidence: 'high',
    priority: 100,
    meta: { folder: folderPath },
  });
  
  // Placeholder result - in real UI the processing happens before/after calling run
  suggestions.push({
    id: 'historical-howto',
    agentId: 'historical_import',
    titleEn: 'How to use',
    titleAr: 'كيفية الاستخدام',
    bodyEn: `1. Select this agent\n2. Use the file/folder picker in the UI (supports multiple files or directory in modern browsers)\n3. Click "Scan & Analyze"\n4. Review extracted declarations and docs\n5. Approve to import selected items into Raya Previous Records / Shipments`,
    bodyAr: `1. اختر هذا الوكيل\n2. استخدم منتقي الملفات/المجلد في الواجهة (يدعم ملفات متعددة أو مجلد في المتصفحات الحديثة)\n3. اضغط "Scan & Analyze"\n4. راجع البيانات المستخرجة\n5. اعتمد لاستيراد العناصر المحددة إلى سجلات راية السابقة`,
    confidence: 'high',
    priority: 95,
  });
  
  suggestions.push({
    id: 'historical-next',
    agentId: 'historical_import',
    titleEn: 'After import',
    titleAr: 'بعد الاستيراد',
    bodyEn: `Imported declarations appear in Staff → Records (Previous shipments tab). You can then link them to new cases, copy HS/goods data, or use for accounting reconciliation. Supports bulk import of dozens of historical files.`,
    bodyAr: `تظهر البيانات المستوردة في Staff → Records (تبويب الشحنات السابقة). يمكن ربطها بحالات جديدة أو نسخ بيانات HS/البضاعة أو استخدامها للتسوية المحاسبية. يدعم استيراد جماعي لعشرات الملفات.`,
    confidence: 'high',
    priority: 90,
    links: [
      { href: '/staff/records', labelEn: 'Go to Previous Records', labelAr: 'اذهب إلى السجلات السابقة' },
    ],
  });
  
  return {
    agentId: 'historical_import',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn: 'Processes local files in your browser or safe server path. XML parsing is automatic for standard ASYCUDA SAD. Full OCR for scanned PDFs requires tesseract.js or external tool. Data stays in your browser/session until you approve import.',
    disclaimerAr: 'يعالج الملفات المحلية في المتصفح أو مسار خادم آمن. تحليل XML تلقائي لصيغ SAD القياسية. OCR الكامل لملفات PDF الممسوحة يحتاج tesseract.js أو أداة خارجية. البيانات تبقى في جلستك حتى تعتمد الاستيراد.',
  };
}
