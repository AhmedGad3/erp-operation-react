import { useState, useEffect, useContext, useRef } from 'react';
import {
  Package, Search, Calendar, User, FileText, Plus, Eye,
  X, Filter, Download, Printer, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import FullPageLoader from '../Loader/Loader';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';
import { formatCurrency, formatDateShort } from '../../utils/dateFormat';

/* ─── brand colors ─── */
const RED  = "#C41E3A";
const BLUE = "#003764";

// Logo as inline base64-ready URL — we fetch it once and cache it
// so it works in both print CSS and html2canvas (cross-origin SVG blocks canvas)
let LOGO_DATA_URL = null;
async function getLogoDataUrl() {
  if (LOGO_DATA_URL) return LOGO_DATA_URL;
  try {
    // dynamic import of the svg asset (vite resolves to /assets/…)
    const mod = await import('../../assets/megabuild1.svg');
    const url = mod.default;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => { LOGO_DATA_URL = reader.result; resolve(LOGO_DATA_URL); };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
const PurchaseReturns = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [returns, setReturns]                   = useState([]);
  const [filteredReturns, setFilteredReturns]   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [searchTerm, setSearchTerm]             = useState('');
  const [startDate, setStartDate]               = useState('');
  const [endDate, setEndDate]                   = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(null);

  useEffect(() => { fetchReturns(); }, []);
  useEffect(() => { filterReturns(); }, [searchTerm, startDate, endDate, returns]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/purchases/return');
      const data = response.data.result || [];
      const enriched = data.map((ret) => ({
        ...ret,
        items: ret.items.map((item) => ({ ...item, material: item.materialId, unit: item.unitId })),
      }));
      setReturns(enriched);
      setFilteredReturns(enriched);
      if (enriched.length === 0)
        toast.info(lang === 'ar' ? 'لا توجد مرتجعات في النظام' : 'No returns found in the system');
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل مرتجعات الشراء' : 'Failed to load purchase returns');
      setReturns([]); setFilteredReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReturns = () => {
    let filtered = [...returns];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ret =>
        ret.returnNo?.toString().includes(searchTerm) ||
        ret.supplierId?.nameEn?.toLowerCase().includes(term) ||
        ret.supplierId?.nameAr?.includes(searchTerm) ||
        ret.supplierId?.code?.toLowerCase().includes(term) ||
        ret.notes?.toLowerCase().includes(term) ||
        ret.items?.some(item =>
          item.material?.nameEn?.toLowerCase().includes(term) ||
          item.material?.nameAr?.includes(searchTerm) ||
          item.material?.code?.toLowerCase().includes(term)
        )
      );
    }
    if (startDate) filtered = filtered.filter(ret => new Date(ret.returnDate) >= new Date(startDate));
    if (endDate)   filtered = filtered.filter(ret => new Date(ret.returnDate) <= new Date(endDate));
    setFilteredReturns(filtered);
  };

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleExportExcel = () => {
    if (filteredReturns.length === 0) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const data = filteredReturns.map((ret) => ({
      [lang === 'ar' ? 'رقم المرتجع'    : 'Return #']:       ret.returnNo,
      [lang === 'ar' ? 'المورد'          : 'Supplier']:       lang === 'ar' ? ret.supplierId?.nameAr : ret.supplierId?.nameEn,
      [lang === 'ar' ? 'كود المورد'      : 'Supplier Code']:  ret.supplierId?.code || '',
      [lang === 'ar' ? 'تاريخ المرتجع'  : 'Return Date']:    formatDate(ret.returnDate),
      [lang === 'ar' ? 'عدد الأصناف'    : 'Items Count']:    ret.items?.length || 0,
      [lang === 'ar' ? 'المبلغ الإجمالي': 'Total Amount']:   (ret.totalAmount || 0).toFixed(2),
      [lang === 'ar' ? 'أنشئ بواسطة'    : 'Created By']:     ret.createdBy?.name || 'N/A',
      [lang === 'ar' ? 'ملاحظات'         : 'Notes']:          ret.notes || '',
    }));
    exportToExcel(data, Object.keys(data[0]).map(k => ({ [k]: k })), lang === 'ar' ? 'مرتجعات_المشتريات' : 'Purchase_Returns', lang);
    toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
  };

  const totalAmount = filteredReturns.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalItems  = filteredReturns.reduce((s, r) => s + (r.items?.length || 0), 0);

  if (loading) return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل مرتجعات الشراء...' : 'Loading purchase returns...'} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">{lang === 'ar' ? 'مرتجعات المشتريات' : 'Purchase Returns'}</h1>
                  <p className="text-orange-100 mt-1">{lang === 'ar' ? 'عرض وإدارة جميع مرتجعات المشتريات' : 'View and manage all purchase returns'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3 bg-white text-red-700 rounded-lg hover:border-2 border-black transition font-semibold shadow-md">
                  <Download className="w-5 h-5" />{lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button onClick={() => navigate('/purchases/returns/create')} className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 hover:bg-orange-50 rounded-lg transition font-semibold shadow-md">
                  <Plus className="w-5 h-5" />{lang === 'ar' ? 'مرتجع جديد' : 'New Return'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</p><p className="text-2xl font-bold text-gray-900">{filteredReturns.length}</p></div>
                <Package className="w-10 h-10 text-orange-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, lang)}</p></div>
                <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}</p><p className="text-2xl font-bold text-gray-900">{totalItems}</p></div>
                <FileText className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">{lang === 'ar' ? 'الفلاتر' : 'Filters'}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input type="text"
                placeholder={lang === 'ar' ? 'بحث برقم المرتجع، المورد، أو المادة...' : 'Search by return #, supplier, or material...'}
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
            </div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition" />
          </div>
          {(searchTerm || startDate || endDate) && (
            <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }} className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium">
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredReturns.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{lang === 'ar' ? 'لا توجد مرتجعات' : 'No Returns Found'}</h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? (searchTerm ? 'حاول تعديل معايير البحث' : 'ابدأ بإنشاء مرتجع جديد') : (searchTerm ? 'Try adjusting your search criteria' : 'Start by creating a new purchase return')}
              </p>
              <button onClick={() => navigate('/purchases/returns/create')} className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold">
                <Plus className="w-5 h-5" />{lang === 'ar' ? 'إنشاء مرتجع جديد' : 'Create First Return'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[lang === 'ar' ? 'رقم المرتجع' : 'Return #', lang === 'ar' ? 'المورد' : 'Supplier', lang === 'ar' ? 'التاريخ' : 'Date', lang === 'ar' ? 'عدد الأصناف' : 'Items', lang === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount', lang === 'ar' ? 'أنشئ بواسطة' : 'Created By', lang === 'ar' ? 'إجراءات' : 'Actions'].map((h, i) => (
                      <th key={i} className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReturns.map((ret) => (
                    <tr key={ret._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" /><span className="font-semibold text-gray-900">#{ret.returnNo}</span></div></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-lg">{(lang === 'ar' ? ret.supplierId?.nameAr : ret.supplierId?.nameEn)?.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{lang === 'ar' ? ret.supplierId?.nameAr : ret.supplierId?.nameEn}</p>
                            <p className="text-sm text-gray-500">{ret.supplierId?.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2 text-gray-700"><Calendar className="w-4 h-4 text-gray-400" />{formatDate(ret.returnDate)}</div></td>
                      <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{ret.items?.length || 0} {lang === 'ar' ? 'صنف' : 'items'}</span></td>
                      <td className="px-6 py-4"><span className="font-semibold text-gray-900">{formatCurrency(ret.totalAmount || 0, lang)}</span></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{ret.createdBy?.name || 'N/A'}</span></div></td>
                      <td className="px-6 py-4">
                        <button onClick={() => setShowDetailsModal(ret)} className="flex items-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition font-medium">
                          <Eye className="w-4 h-4" />{lang === 'ar' ? 'عرض' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDetailsModal && (
        <ReturnDetailsModal returnDoc={showDetailsModal} onClose={() => setShowDetailsModal(null)} lang={lang} />
      )}
    </div>
  );
};

export default PurchaseReturns;


/* ════════════════════════════════════════════════════════════
   RETURN DETAILS MODAL — Mega Build branded
   ✅ Print: صفحة واحدة، لوجو ظاهر
   ✅ PDF:   html2canvas → jsPDF بنفس الاستايل
════════════════════════════════════════════════════════════ */
function ReturnDetailsModal({ returnDoc, onClose, lang }) {
  const isAr = lang === 'ar';
  const tr   = (ar, en) => isAr ? ar : en;

  const invoiceRef  = useRef(null);
  const [logoSrc, setLogoSrc]       = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load logo as data URL once (fixes print + canvas)
  useEffect(() => {
    getLogoDataUrl().then(url => { if (url) setLogoSrc(url); });
  }, []);

  const supplierName = isAr
    ? (returnDoc.supplierId?.nameAr || returnDoc.supplier?.nameAr)
    : (returnDoc.supplierId?.nameEn || returnDoc.supplier?.nameEn);

  const getMaterialName = (item) =>
    isAr ? (item.material?.nameAr || item.materialId?.nameAr) : (item.material?.nameEn || item.materialId?.nameEn);

  const getUnitName = (item) =>
    isAr ? (item.unit?.nameAr || item.unitId?.nameAr) : (item.unit?.nameEn || item.unitId?.nameEn);

  const getItemTotal = (item) => item.total ?? (item.quantity * item.unitPrice);

  const total = returnDoc.totalAmount ||
    (returnDoc.items || []).reduce((s, i) => s + getItemTotal(i), 0);

  /* ── PRINT (صفحة واحدة فقط) ── */
  const handlePrint = () => {
    const el = invoiceRef.current;
    if (!el) return;
    setIsPrinting(true);

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8"/>
        <title>${tr('مرتجع مشتريات', 'Purchase Return')} #${returnDoc.returnNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: ${isAr ? 'Tahoma,Arial,sans-serif' : 'Segoe UI,Arial,sans-serif'}; }
          @page { margin: 0; size: A4; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${el.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      setIsPrinting(false);
    };
  };

  /* ── PDF DOWNLOAD (html2canvas → jsPDF) ── */
  const handleDownloadPDF = async () => {
    const el = invoiceRef.current;
    if (!el) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = (canvas.height * pdfW) / canvas.width;

      // If content taller than A4, split across pages
      const pageH = pdf.internal.pageSize.getHeight();
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      } else {
        let yOffset = 0;
        while (yOffset < pdfH) {
          pdf.addImage(imgData, 'JPEG', 0, -yOffset, pdfW, pdfH);
          yOffset += pageH;
          if (yOffset < pdfH) pdf.addPage();
        }
      }

      pdf.save(`${tr('مرتجع', 'Return')}_${returnDoc.returnNo}.pdf`);
      toast.success(tr('تم تحميل PDF بنجاح', 'PDF downloaded successfully'));
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error(tr('فشل تحميل PDF', 'PDF download failed'));
    } finally {
      setIsExporting(false);
    }
  };

  /* ── INVOICE HTML (shared between modal view + print/PDF) ── */
  const InvoiceContent = () => (
    <div ref={invoiceRef} style={{ background: '#fff', fontFamily: isAr ? 'Tahoma,Arial,sans-serif' : 'Segoe UI,Arial,sans-serif', direction: isAr ? 'rtl' : 'ltr', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '24px 36px 18px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {logoSrc
            ? <img src={logoSrc} alt="Mega Build" style={{ width: 70, height: 70, objectFit: 'contain' }} />
            : <div style={{ width: 70, height: 70, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>LOGO</div>
          }
          <p style={{ fontSize: 8, color: '#aaa', marginTop: 3, letterSpacing: 0.8 }}>{tr('نبني القيمة', 'We Build Value')}</p>
        </div>

        {/* Brand info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: RED,  letterSpacing: 2, lineHeight: 1 }}>MEGA</span>
            <span style={{ fontSize: 26, fontWeight: 900, color: BLUE, letterSpacing: 2, lineHeight: 1 }}>BUILD</span>
          </div>
          <p style={{ fontSize: 10, color: '#999', fontStyle: 'italic', margin: 0 }}>We Build Value</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: isAr ? 'flex-start' : 'flex-end', marginTop: 4 }}>
            {['23 RD Of July St, Suez – Suez P.O. Box: 43511','C.R: 59034    T.C: 454-990-006','Tel: 062 3456452    Mob: 01111696211','Meegabuild@gmail.com','www.Megbuild.com'].map((line, i) => (
              <p key={i} style={{ fontSize: 10.5, color: '#444', margin: 0 }}>{line}</p>
            ))}
          </div>
          <div style={{ marginTop: 8, background: RED, color: '#fff', padding: '5px 16px', borderRadius: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>{tr('مرتجع مشتريات', 'PURCHASE RETURN')}</span>
          </div>
          <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
            <strong style={{ color: BLUE }}>{tr('رقم:', 'No:')}</strong>{' '}{returnDoc.returnNo || tr('غير محدد', 'N/A')}
          </p>
        </div>
      </div>

      {/* Red divider */}
      <div style={{ height: 3, background: RED }} />
      <div style={{ height: 1, background: '#eee' }} />

      {/* Supplier / Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '20px 36px', borderBottom: '1px solid #eee', borderInlineEnd: '1px solid #eee' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{tr('المورد', 'Supplier')}</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>{supplierName}</p>
          {returnDoc.supplierId?.code && (
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{tr('الكود:', 'Code:')} {returnDoc.supplierId.code}</p>
          )}
        </div>
        <div style={{ padding: '20px 36px', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            [tr('تاريخ المرتجع', 'Return Date'),  formatDateShort(returnDoc.returnDate, lang)],
            [tr('تاريخ الإنشاء', 'Created At'),   formatDateShort(returnDoc.createdAt, lang)],
            [tr('أنشئ بواسطة',  'Created By'),   returnDoc.createdBy?.name || tr('غير محدد', 'N/A')],
            ...(returnDoc.createdBy?.email ? [[tr('البريد', 'Email'), returnDoc.createdBy.email]] : []),
          ].map(([label, value], i) => (
            <div key={i} style={{ textAlign: isAr ? 'left' : 'right' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: BLUE }}>
            {[tr('المادة','Item'), tr('الكود','Code'), tr('الوحدة','Unit'), tr('الكمية','Qty'), tr('سعر الوحدة','Unit Price'), tr('الإجمالي','Amount')].map((h, i) => (
              <th key={i} style={{ padding: '11px 20px', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: i === 0 ? (isAr ? 'right' : 'left') : 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {returnDoc.items?.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e8e8e8' }}>
              <td style={{ padding: '12px 20px', fontSize: 13, color: '#222', fontWeight: 600, textAlign: isAr ? 'right' : 'left' }}>{getMaterialName(item) || tr('غير معروف', 'Unknown')}</td>
              <td style={{ padding: '12px 20px', fontSize: 12, color: '#777', textAlign: 'center' }}>{item.material?.code || item.materialId?.code || '—'}</td>
              <td style={{ padding: '12px 20px', fontSize: 12, color: '#777', textAlign: 'center' }}>{getUnitName(item) || '—'}</td>
              <td style={{ padding: '12px 20px', fontSize: 13, color: '#555', textAlign: 'center' }}>{item.quantity?.toLocaleString(isAr ? 'ar-EG' : 'en-US')}</td>
              <td style={{ padding: '12px 20px', fontSize: 13, color: '#555', textAlign: 'center' }}>{formatCurrency(item.unitPrice, lang)}</td>
              <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: 700, color: RED, textAlign: 'center' }}>{formatCurrency(getItemTotal(item), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Grand Total */}
      <div style={{ padding: '16px 36px', display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ background: RED, color: '#fff', padding: '9px 22px', fontWeight: 800, fontSize: 13, borderRadius: '4px 0 0 4px', letterSpacing: 1 }}>{tr('الإجمالي الكلي', 'GRAND TOTAL')}</div>
          <div style={{ border: `2px solid ${RED}`, padding: '7px 22px', fontWeight: 900, fontSize: 16, minWidth: 160, textAlign: 'center', color: RED, borderRadius: '0 4px 4px 0' }}>{formatCurrency(total, lang)}</div>
        </div>
      </div>

      {/* Notes */}
      {returnDoc.notes && (
        <div style={{ padding: '16px 36px', borderTop: '1px solid #eee', background: '#fafafa' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{tr('ملاحظات', 'Notes')}</p>
          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, margin: 0 }}>{returnDoc.notes}</p>
        </div>
      )}

      {/* Footer text */}
      <div style={{ padding: '12px 36px', borderTop: '1px solid #eee', textAlign: 'center', background: '#fafafa' }}>
        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
          {tr('هذا مستند من إنتاج الكمبيوتر', 'This is a computer-generated document')} — {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
        </p>
      </div>

      {/* Footer bar */}
      <div style={{ display: 'flex', height: 24 }}>
        <div style={{ width: '38%', background: RED }} />
        <div style={{ width: '2%',  background: '#fff' }} />
        <div style={{ flex: 1,      background: BLUE }} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">

        {/* Title bar */}
        <div className="bg-gradient-to-r from-red-700 to-blue-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={24} />
            <h3 className="text-xl font-bold">{tr('تفاصيل مرتجع الشراء', 'Purchase Return Details')}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={22} /></button>
        </div>

        {/* Invoice (scrollable) */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)]">
          <InvoiceContent />
        </div>

        {/* Action buttons */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
          {/* PDF download */}
          <button onClick={handleDownloadPDF} disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-60">
            {isExporting
              ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{tr('جاري التحميل...', 'Exporting...')}</>
              : <><Download size={18} />{tr('تحميل PDF', 'Download PDF')}</>
            }
          </button>
          {/* Print */}
          <button onClick={handlePrint} disabled={isPrinting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-60">
            <Printer size={18} />{tr('طباعة', 'Print')}
          </button>
          {/* Close */}
          <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold">
            {tr('إغلاق', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}