import { useState, useEffect, useContext, useRef } from 'react';
import {
  Package, Search, Plus, Eye, X, Download, Printer,
  FileText, ChevronUp, ChevronDown,
  TrendingUp
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

let LOGO_DATA_URL = null;
async function getLogoDataUrl() {
  if (LOGO_DATA_URL) return LOGO_DATA_URL;
  try {
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

// ── Sortable column header ─────────────────────────────────
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);



// ── Main Component ─────────────────────────────────────────
const PurchaseReturns = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [returns,       setReturns]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [sortField,     setSortField]     = useState('returnDate');
  const [sortDir,       setSortDir]       = useState('desc');
  const [detailsModal,  setDetailsModal]  = useState(null);

  useEffect(() => { fetchReturns(); }, []);

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
      if (enriched.length === 0)
        toast.info(lang === 'ar' ? 'لا توجد مرتجعات في النظام' : 'No returns found in the system');
    } catch {
      toast.error(lang === 'ar' ? 'فشل تحميل مرتجعات الشراء' : 'Failed to load purchase returns');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleExportExcel = () => {
    if (displayed.length === 0) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const data = displayed.map((ret) => ({
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

  // Filter + Sort
  const displayed = returns
    .filter(ret => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        ret.returnNo?.toString().includes(searchTerm) ||
        ret.supplierId?.nameEn?.toLowerCase().includes(q) ||
        ret.supplierId?.nameAr?.includes(searchTerm) ||
        ret.supplierId?.code?.toLowerCase().includes(q) ||
        ret.notes?.toLowerCase().includes(q) ||
        ret.items?.some(item =>
          item.material?.nameEn?.toLowerCase().includes(q) ||
          item.material?.nameAr?.includes(searchTerm) ||
          item.material?.code?.toLowerCase().includes(q)
        );
      const matchStart = !startDate || new Date(ret.returnDate) >= new Date(startDate);
      const matchEnd   = !endDate   || new Date(ret.returnDate) <= new Date(endDate);
      return matchSearch && matchStart && matchEnd;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (sortField === 'returnDate' || sortField === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const totalAmount = displayed.reduce((s, r) => s + (r.totalAmount || 0), 0);

  if (loading) return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل مرتجعات الشراء...' : 'Loading purchase returns...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'مرتجعات المشتريات' : 'Purchase Returns'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'عرض وإدارة جميع مرتجعات المشتريات' : 'View and manage all purchase returns.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={() => navigate('/purchases/returns/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'مرتجع جديد' : 'New Return'}
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</p>
            <p className="text-2xl font-bold text-gray-900">{displayed.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'إجمالي المبلغ' : 'Total Amount'}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, lang)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}</p>
            <p className="text-2xl font-bold text-gray-900">{displayed.reduce((s, r) => s + (r.items?.length || 0), 0)}</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث برقم المرتجع، المورد، أو المادة...' : 'Search by return #, supplier, or material...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Start Date */}
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />

          {/* End Date */}
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />

          {(searchTerm || startDate || endDate) && (
            <button
              onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
              className="text-sm text-orange-600 hover:underline"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear'}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {lang === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'رقم المرتجع'   : 'Return #'}     field="returnNo"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المورد'         : 'Supplier'}     field="supplierId"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'تاريخ المرتجع' : 'Return Date'}  field="returnDate"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'عدد الأصناف'   : 'Items'}        field="items"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المبلغ الإجمالي': 'Total Amount'} field="totalAmount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'أنشئ بواسطة'   : 'Created By'}   field="createdBy"   sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(ret => (
                  <tr key={ret._id} className="hover:bg-gray-50/60 transition">

                    {/* Return No */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">#{ret.returnNo}</span>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {lang === 'ar' ? ret.supplierId?.nameAr : ret.supplierId?.nameEn}
                        </p>
                        {ret.supplierId?.code && (
                          <p className="text-xs text-gray-400">{ret.supplierId.code}</p>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">{formatDate(ret.returnDate)}</td>

                    {/* Items Count */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {ret.items?.length || 0} {lang === 'ar' ? 'صنف' : 'items'}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      {formatCurrency(ret.totalAmount || 0, lang)}
                    </td>

                    {/* Created By */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {ret.createdBy?.name || 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setDetailsModal(ret)}
                        className="p-1.5 rounded-md hover:bg-orange-50 transition text-gray-400 hover:text-orange-600"
                        title={lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* ── Details Modal ── */}
      {detailsModal && (
        <ReturnDetailsModal
          returnDoc={detailsModal}
          onClose={() => setDetailsModal(null)}
          lang={lang}
        />
      )}
    </div>
  );
};

export default PurchaseReturns;


/* ════════════════════════════════════════════════════════════
   RETURN DETAILS MODAL — unchanged, Mega Build branded
════════════════════════════════════════════════════════════ */
function ReturnDetailsModal({ returnDoc, onClose, lang }) {
  const isAr = lang === 'ar';
  const tr   = (ar, en) => isAr ? ar : en;

  const invoiceRef  = useRef(null);
  const [logoSrc, setLogoSrc]         = useState(null);
  const [isPrinting, setIsPrinting]   = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handlePrint = () => {
    const el = invoiceRef.current;
    if (!el) return;
    setIsPrinting(true);
    const printWindow = window.open('', '_blank', 'width=900,height=800');
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

  const handleDownloadPDF = async () => {
    const el = invoiceRef.current;
    if (!el) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = (canvas.height * pdfW) / canvas.width;
      const pageH   = pdf.internal.pageSize.getHeight();
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

  const InvoiceContent = () => (
    <div ref={invoiceRef} style={{ background: '#fff', fontFamily: isAr ? 'Tahoma,Arial,sans-serif' : 'Segoe UI,Arial,sans-serif', direction: isAr ? 'rtl' : 'ltr', width: '100%' }}>
      <div style={{ padding: '24px 36px 18px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {logoSrc
            ? <img src={logoSrc} alt="Mega Build" style={{ width: 70, height: 70, objectFit: 'contain' }} />
            : <div style={{ width: 70, height: 70, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>LOGO</div>
          }
          <p style={{ fontSize: 8, color: '#aaa', marginTop: 3, letterSpacing: 0.8 }}>{tr('نبني القيمة', 'We Build Value')}</p>
        </div>
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
      <div style={{ height: 3, background: RED }} />
      <div style={{ height: 1, background: '#eee' }} />
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
      <div style={{ padding: '16px 36px', display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ background: RED, color: '#fff', padding: '9px 22px', fontWeight: 800, fontSize: 13, borderRadius: '4px 0 0 4px', letterSpacing: 1 }}>{tr('الإجمالي الكلي', 'GRAND TOTAL')}</div>
          <div style={{ border: `2px solid ${RED}`, padding: '7px 22px', fontWeight: 900, fontSize: 16, minWidth: 160, textAlign: 'center', color: RED, borderRadius: '0 4px 4px 0' }}>{formatCurrency(total, lang)}</div>
        </div>
      </div>
      {returnDoc.notes && (
        <div style={{ padding: '16px 36px', borderTop: '1px solid #eee', background: '#fafafa' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{tr('ملاحظات', 'Notes')}</p>
          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, margin: 0 }}>{returnDoc.notes}</p>
        </div>
      )}
      <div style={{ padding: '12px 36px', borderTop: '1px solid #eee', textAlign: 'center', background: '#fafafa' }}>
        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
          {tr('هذا مستند من إنتاج الكمبيوتر', 'This is a computer-generated document')} — {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
        </p>
      </div>
      <div style={{ display: 'flex', height: 24 }}>
        <div style={{ width: '38%', background: RED }} />
        <div style={{ width: '2%',  background: '#fff' }} />
        <div style={{ flex: 1,      background: BLUE }} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">

        {/* Title bar */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {tr('تفاصيل مرتجع الشراء', 'Purchase Return Details')}
              </h3>
              <p className="text-xs text-gray-500">#{returnDoc.returnNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice (scrollable) */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)]">
          <InvoiceContent />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {tr('إغلاق', 'Close')}
          </button>
          <button onClick={handlePrint} disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50">
            <Printer className="w-4 h-4" />
            {tr('طباعة', 'Print')}
          </button>
          <button onClick={handleDownloadPDF} disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-medium text-sm disabled:opacity-50">
            {isExporting
              ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{tr('جاري التحميل...', 'Exporting...')}</>
              : <><Download className="w-4 h-4" />{tr('تحميل PDF', 'Download PDF')}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}