/** Seed shipments — server source of truth baseline */
export const SEED_SHIPMENTS = [
  {
    "id": "shp-39568",
    "accessCode": "RAYA-DEMO-01",
    "taxNumber": "100123456",
    "customerNameEn": "Safari Est. for Aluminum & Kitchen Accessories",
    "customerNameAr": "مؤسسة سفاري للألمنيوم وإكسسوارات المطابخ",
    "declarationNo": "39568/4/2026",
    "blNo": "KWSTAO26040161",
    "containerNo": "CICU6890660",
    "status": "under_inspection",
    "statusEn": "Red lane — physical examination",
    "statusAr": "مسرب أحمر — معاينة فعلية",
    "selectivityLane": "red",
    "inspectionOutcome": "sample_pending",
    "inspectionNoteEn": "Sample drawn for composition check",
    "inspectionNoteAr": "أُخذت عينة لفحص التركيب",
    "pcaOpen": false,
    "originEn": "Kuwait",
    "originAr": "الكويت",
    "goodsEn": "Silicone sealant & paste (HS 32141090)",
    "goodsAr": "معجون وسيليكون مانع للتسرب (HS 32141090)",
    "dischargeDate": "2026-07-20",
    "lastFreeDay": "2026-07-25",
    "updatedAt": "2026-07-23T14:30:00+03:00",
    "documents": [
      {
        "id": "d1",
        "nameEn": "Commercial invoice",
        "nameAr": "الفاتورة التجارية",
        "type": "invoice",
        "available": true
      },
      {
        "id": "d2",
        "nameEn": "Bill of lading",
        "nameAr": "بوليصة الشحن",
        "type": "bl",
        "available": true
      },
      {
        "id": "d3",
        "nameEn": "Customs release",
        "nameAr": "أمر الإفراج الجمركي",
        "type": "release",
        "available": false
      },
      {
        "id": "d3b",
        "nameEn": "Inspection act (draft)",
        "nameAr": "محضر معاينة (مسودة)",
        "type": "other",
        "available": false
      }
    ]
  },
  {
    "id": "shp-40102",
    "accessCode": "RAYA-DEMO-02",
    "taxNumber": "100123456",
    "customerNameEn": "Safari Est. for Aluminum & Kitchen Accessories",
    "customerNameAr": "مؤسسة سفاري للألمنيوم وإكسسوارات المطابخ",
    "blNo": "MSCUJO26051200",
    "containerNo": "MSCU4455123",
    "status": "pre_arrival",
    "statusEn": "Pre-arrival — not yet registered in ASYCUDA",
    "statusAr": "قبل الوصول — لم يُسجَّل في الأسيكودا بعد",
    "selectivityLane": null,
    "pcaOpen": false,
    "originEn": "China",
    "originAr": "الصين",
    "goodsEn": "Kitchen fittings",
    "goodsAr": "تركيبات مطابخ",
    "updatedAt": "2026-07-22T10:00:00+03:00",
    "documents": [
      {
        "id": "d1",
        "nameEn": "Commercial invoice",
        "nameAr": "الفاتورة التجارية",
        "type": "invoice",
        "available": true
      },
      {
        "id": "d2",
        "nameEn": "Bill of lading",
        "nameAr": "بوليصة الشحن",
        "type": "bl",
        "available": true
      }
    ]
  },
  {
    "id": "shp-39110",
    "accessCode": "RAYA-DEMO-05",
    "taxNumber": "100123456",
    "customerNameEn": "Safari Est. for Aluminum & Kitchen Accessories",
    "customerNameAr": "مؤسسة سفاري للألمنيوم وإكسسوارات المطابخ",
    "declarationNo": "39110/2/2026",
    "blNo": "HLCUJO26030011",
    "status": "released",
    "statusEn": "Green lane — released",
    "statusAr": "مسرب أخضر — مُفرَج",
    "selectivityLane": "green",
    "pcaOpen": false,
    "originEn": "Turkey",
    "originAr": "تركيا",
    "goodsEn": "Aluminum profiles",
    "goodsAr": "بروفيلات ألمنيوم",
    "dischargeDate": "2026-07-10",
    "lastFreeDay": "2026-07-15",
    "updatedAt": "2026-07-18T12:00:00+03:00",
    "documents": [
      {
        "id": "d1",
        "nameEn": "Commercial invoice",
        "nameAr": "الفاتورة التجارية",
        "type": "invoice",
        "available": true
      },
      {
        "id": "d2",
        "nameEn": "Bill of lading",
        "nameAr": "بوليصة الشحن",
        "type": "bl",
        "available": true
      },
      {
        "id": "d3",
        "nameEn": "Customs release",
        "nameAr": "أمر الإفراج الجمركي",
        "type": "release",
        "available": true
      }
    ]
  },
  {
    "id": "shp-38801",
    "accessCode": "RAYA-DEMO-03",
    "taxNumber": "200987654",
    "customerNameEn": "Al-Nour Trading",
    "customerNameAr": "شركة النور",
    "declarationNo": "38801/9/2026",
    "blNo": "MAEUJO26021009",
    "status": "delivered",
    "statusEn": "Delivered — PCA open (blue)",
    "statusAr": "مُسلَّم — تدقيق لاحق مفتوح",
    "selectivityLane": "blue",
    "pcaOpen": true,
    "originEn": "Italy",
    "originAr": "إيطاليا",
    "goodsEn": "Food ingredients",
    "goodsAr": "مكونات غذائية",
    "dischargeDate": "2026-06-01",
    "lastFreeDay": "2026-06-06",
    "updatedAt": "2026-06-20T09:00:00+03:00",
    "documents": [
      {
        "id": "d1",
        "nameEn": "Commercial invoice",
        "nameAr": "الفاتورة التجارية",
        "type": "invoice",
        "available": true
      },
      {
        "id": "d2",
        "nameEn": "Bill of lading",
        "nameAr": "بوليصة الشحن",
        "type": "bl",
        "available": true
      },
      {
        "id": "d3",
        "nameEn": "Customs release",
        "nameAr": "أمر الإفراج الجمركي",
        "type": "release",
        "available": true
      }
    ]
  },
  {
    "id": "shp-40220",
    "accessCode": "RAYA-DEMO-04",
    "taxNumber": "200987654",
    "customerNameEn": "Al-Nour Trading",
    "customerNameAr": "شركة النور",
    "declarationNo": "40220/1/2026",
    "blNo": "OOLUJO26070102",
    "status": "doc_check",
    "statusEn": "Yellow — documentary check",
    "statusAr": "أصفر — فحص وثائقي",
    "selectivityLane": "yellow",
    "pcaOpen": false,
    "originEn": "Germany",
    "originAr": "ألمانيا",
    "goodsEn": "Industrial parts",
    "goodsAr": "قطع صناعية",
    "dischargeDate": "2026-07-22",
    "lastFreeDay": "2026-07-27",
    "updatedAt": "2026-07-24T11:00:00+03:00",
    "documents": [
      {
        "id": "d1",
        "nameEn": "Commercial invoice",
        "nameAr": "الفاتورة التجارية",
        "type": "invoice",
        "available": true
      },
      {
        "id": "d2",
        "nameEn": "Bill of lading",
        "nameAr": "بوليصة الشحن",
        "type": "bl",
        "available": true
      },
      {
        "id": "d4",
        "nameEn": "Certificate of origin",
        "nameAr": "شهادة المنشأ",
        "type": "other",
        "available": false
      }
    ]
  }
];
