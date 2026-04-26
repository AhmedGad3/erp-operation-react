import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wrench, FileText, Download,
  DollarSign, User, Tag, Activity, RefreshCw, Plus
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import FullPageLoader from '../Loader/Loader';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import megabuildLogo from '../../assets/megabuild1.svg';

/* ── Brand colors ── */
const RED        = '#C41E3A';
const BLUE       = '#003764';
const LIGHT_RED  = '#FFF5F6';
const LIGHT_BLUE = '#F0F4FA';

const ASSET_STATUS = [
  { value: 'AVAILABLE',   labelAr: 'متاح',          labelEn: 'Available',   color: 'bg-green-100 text-green-700'   },
  { value: 'IN_USE',      labelAr: 'قيد الاستخدام', labelEn: 'In Use',      color: 'bg-blue-100 text-blue-700'    },
  { value: 'MAINTENANCE', labelAr: 'في الصيانة',     labelEn: 'Maintenance', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'RETIRED',     labelAr: 'متقاعد',         labelEn: 'Retired',     color: 'bg-gray-100 text-gray-600'    },
];

const PAYMENT_METHODS = [
  { value: 'CASH',     labelAr: 'نقدي',       labelEn: 'Cash'          },
  { value: 'TRANSFER', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
  { value: 'CHEQUE',   labelAr: 'شيك',         labelEn: 'Cheque'        },
];

/* ── Shared UI ── */
const MegaBuildLogo = ({ size = 56 }) => (
  <img src={megabuildLogo} alt="Mega Build Logo"
    style={{ width: size, height: size, objectFit: 'contain' }} />
);

const FooterBar = () => (
  <div style={{ display: 'flex', height: 28 }}>
    <div style={{ width: '38%', background: BLUE }} />
    <div style={{ width: '2%',  background: '#fff' }} />
    <div style={{ flex: 1,      background: RED }} />
  </div>
);

const InfoRow = ({ icon: Icon, label, value, badge, badgeColor }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Icon className="w-4 h-4" />
      {label}
    </div>
    {badge
      ? <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor}`}>{value}</span>
      : <span className="text-sm font-medium text-gray-900">{value || '—'}</span>}
  </div>
);

const PrintInfoRow = ({ label, value, align = 'left' }) => (
  <div style={{ textAlign: align }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
      {label}
    </p>
    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{value || '—'}</p>
  </div>
);

/* ════════════════════════════════════════ */
export default function AssetDetails() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { lang }   = useContext(LanguageContext);
  const invoiceRef = useRef();
  const isAr       = lang === 'ar';
  const t          = (ar, en) => isAr ? ar : en;

  const [asset,       setAsset]       = useState(null);
  const [invoice,     setInvoice]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetRes, invoiceRes] = await Promise.all([
        axiosInstance.get(`/assets/${id}`),
        axiosInstance.get(`/asset-invoices/by-asset/${id}`).catch(() => ({ data: null })),
      ]);
      setAsset(assetRes.data.result || assetRes.data);
      setInvoice(invoiceRes.data?.result ?? null);
    } catch {
      toast.error(t('فشل تحميل البيانات', 'Failed to load data'));
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : '—';

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      style: 'currency', currency: 'EGP', minimumFractionDigits: 0
    }).format(amount ?? 0);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    try {
      setDownloading(true);
      const element    = invoiceRef.current;
      const canvas     = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: invoiceRef.current.scrollWidth,
      });
      const imgData    = canvas.toDataURL('image/png');
      const pdf        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth  = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth   = pageWidth - 20;
      const imgHeight  = (canvas.height * imgWidth) / canvas.width;
      let heightLeft   = imgHeight;
      let position     = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`Asset_Invoice_${asset?.code || id}.pdf`);
      toast.success(t('تم تحميل الفاتورة', 'Invoice downloaded'));
    } catch {
      toast.error(t('فشل تحميل الفاتورة', 'Failed to download invoice'));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <FullPageLoader text={t('جاري تحميل البيانات...', 'Loading...')} />;
  if (!asset)  return null;

  const statusInfo   = ASSET_STATUS.find(s => s.value === asset.status);
  const paymentLabel = PAYMENT_METHODS.find(m => m.value === invoice?.paymentMethod)?.[isAr ? 'labelAr' : 'labelEn'];

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: isAr ? 'Tahoma,Arial,sans-serif' : 'Segoe UI,Arial,sans-serif', direction: isAr ? 'rtl' : 'ltr' }}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/assets')}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition bg-white">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isAr ? asset.nameAr : asset.nameEn}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{asset.code}</p>
            </div>
          </div>
          <button onClick={fetchData}
            className="p-2.5 border border-gray-200 text-gray-500 bg-white rounded-xl hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ── Asset Info Card ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {t('بيانات الأصل', 'Asset Information')}
              </h2>
              <p className="text-xs text-gray-400">
                {t(`أُضيف بواسطة: ${asset.createdBy?.name || '—'}`,
                   `Added by: ${asset.createdBy?.name || '—'}`)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <InfoRow icon={Tag} label={t('الاسم بالعربية',    'Name (Arabic)')}  value={asset.nameAr} />
              <InfoRow icon={Tag} label={t('الاسم بالإنجليزية', 'Name (English)')} value={asset.nameEn} />
              <InfoRow icon={Tag} label={t('الكود',              'Code')}           value={asset.code}   />
            </div>
            <div>
              <InfoRow icon={Activity} label={t('النوع',  'Type')}
                value={isAr ? asset.assetTypeAr : asset.assetTypeEn} />
              <InfoRow icon={Activity} label={t('الحالة', 'Status')}
                value={statusInfo?.[isAr ? 'labelAr' : 'labelEn']}
                badge badgeColor={statusInfo?.color} />
              <InfoRow icon={Activity} label={t('النشاط', 'Active')}
                value={asset.isActive !== false ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                badge
                badgeColor={asset.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} />
            </div>
          </div>
          {asset.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">{t('ملاحظات', 'Notes')}</p>
              <p className="text-sm text-gray-700">{asset.notes}</p>
            </div>
          )}
        </div>

        {/* ── Invoice Section ── */}
        {invoice ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {t('فاتورة الشراء', 'Purchase Invoice')}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {t(`رقم الفاتورة: ${invoice.invoiceNo}`, `Invoice No: ${invoice.invoiceNo}`)}
                  </p>
                </div>
              </div>
              <button onClick={handleDownloadPDF} disabled={downloading}
                style={{ background: RED }}
                className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition font-medium text-sm disabled:opacity-50 hover:opacity-90">
                {downloading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Download className="w-4 h-4" />}
                {t('تحميل PDF', 'Download PDF')}
              </button>
            </div>

            {/* ══════════ PRINTABLE INVOICE ══════════ */}
            <div ref={invoiceRef} style={{
              background: '#fff',
              fontFamily: 'Tahoma, Arial, sans-serif',
              direction: isAr ? 'rtl' : 'ltr',
              fontSize: '14px',
              color: '#000',
            }}>

              {/* ── HEADER ── */}
              <div style={{ padding: '24px 36px 18px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                  {/* Logo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <MegaBuildLogo size={68} />
                    <p style={{ fontSize: 8, color: '#aaa', marginTop: 3, letterSpacing: 0.8 }}>
                      {t('نبني القيمة', 'We Build Value')}
                    </p>
                  </div>

                  {/* Company info + badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: RED,  letterSpacing: 2, lineHeight: 1 }}>MEGA</span>
                      <span style={{ fontSize: 26, fontWeight: 900, color: BLUE, letterSpacing: 2, lineHeight: 1 }}>BUILD</span>
                    </div>
                    <p style={{ fontSize: 10, color: '#999', fontStyle: 'italic', margin: 0 }}>We Build Value</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: isAr ? 'flex-start' : 'flex-end', marginTop: 4 }}>
                      {[
                        '23 RD Of July St, Suez – Suez P.O. Box: 43511',
                        'C.R: 59034    T.C: 454-990-006',
                        'Tel: 062 3456452    Mob: 01111696211',
                        'Meegabuild@gmail.com',
                        'www.Megbuild.com',
                      ].map((line, i) => (
                        <p key={i} style={{ fontSize: 10.5, color: '#444', margin: 0 }}>{line}</p>
                      ))}
                    </div>
                    {/* Badge */}
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap: 4 }}>
                      <div style={{ background: BLUE, color: '#fff', padding: '5px 16px', borderRadius: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>
                          {t('فاتورة شراء أصل', 'ASSET PURCHASE INVOICE')}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                        <span style={{ fontWeight: 700, color: BLUE }}>{t('رقم:', 'No:')}</span>{' '}
                        AST-{invoice.invoiceNo}
                      </p>
                      {invoice.createdBy?.name && (
                        <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                          <span style={{ fontWeight: 700, color: BLUE }}>{t('بواسطة:', 'By:')}</span>{' '}
                          {invoice.createdBy.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Red divider */}
              <div style={{ height: 3, background: RED }} />
              <div style={{ height: 1, background: '#eee' }} />

              {/* ── VENDOR / DATE / METHOD ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '20px 36px', borderBottom: '1px solid #eee', borderInlineEnd: '1px solid #eee' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {t('المورد', 'Vendor')}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                    {invoice.vendorName || t('غير محدد', 'Not specified')}
                  </p>
                  <p style={{ fontSize: 12, color: '#777', marginTop: 4, margin: 0 }}>
                    {t('مورد / جهة خارجية', 'Vendor / External Party')}
                  </p>
                </div>
                <div style={{ padding: '20px 36px', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <PrintInfoRow label={t('تاريخ الفاتورة', 'Invoice Date')} value={formatDate(invoice.invoiceDate)} align={isAr ? 'left' : 'right'} />
                  <PrintInfoRow label={t('طريقة الدفع', 'Payment Method')} value={paymentLabel} align={isAr ? 'left' : 'right'} />
                  {invoice.referenceNo && (
                    <PrintInfoRow label={t('رقم المرجع', 'Reference #')} value={invoice.referenceNo} align={isAr ? 'left' : 'right'} />
                  )}
                </div>
              </div>

              {/* ── ASSET INFO BAR ── */}
              <div style={{ background: LIGHT_BLUE, padding: '14px 36px', borderBottom: `1px solid #dde4f0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                    {t('الأصل', 'Asset')}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: BLUE, margin: 0 }}>
                    {isAr ? asset.nameAr : asset.nameEn}
                  </p>
                  <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                    {isAr ? asset.assetTypeAr : asset.assetTypeEn}
                  </p>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                    {t('الكود', 'Code')}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: BLUE, margin: 0 }}>{asset.code}</p>
                </div>
              </div>

              {/* ── TABLE ── */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: BLUE }}>
                    <th style={{ padding: '12px 36px', textAlign: isAr ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {t('الأصل', 'Asset')}
                    </th>
                    <th style={{ padding: '12px 36px', textAlign: isAr ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {t('المبلغ', 'Amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: LIGHT_RED, borderBottom: '2px solid #f5c0c8' }}>
                    <td style={{ padding: '16px 36px', fontSize: 14, fontWeight: 600, color: '#333' }}>
                      {isAr ? asset.nameAr : asset.nameEn}
                      <span style={{ fontSize: 11, color: '#888', marginInlineStart: 8 }}>
                        ({isAr ? asset.assetTypeAr : asset.assetTypeEn})
                      </span>
                    </td>
                    <td style={{ padding: '16px 36px', textAlign: isAr ? 'left' : 'right', fontSize: 22, fontWeight: 900, color: RED }}>
                      {formatCurrency(invoice.amount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style={{ background: '#fafafa' }}>
                    <td style={{ padding: '14px 36px', fontSize: 13, fontWeight: 700, color: '#555' }}>
                      {t('إجمالي مبلغ الشراء', 'Total Purchase Amount')}
                    </td>
                    <td style={{ padding: '14px 36px', textAlign: isAr ? 'left' : 'right', fontSize: 18, fontWeight: 900, color: RED }}>
                      {formatCurrency(invoice.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* ── PAYMENT CONFIRMATION ── */}
              <div style={{ background: RED, padding: '12px 36px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: RED, fontWeight: 900, fontSize: 16 }}>✓</span>
                </div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>
                  {t('تم صرف مبلغ الشراء:', 'Purchase Amount Paid:')}{' '}
                  <span style={{ fontSize: 16 }}>{formatCurrency(invoice.amount)}</span>
                </p>
              </div>

              {/* ── NOTES ── */}
              {invoice.notes && (
                <div style={{ padding: '18px 36px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {t('ملاحظات', 'Notes')}
                  </p>
                  <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, margin: 0 }}>{invoice.notes}</p>
                </div>
              )}

              {/* ── METADATA ── */}
              <div style={{ padding: '18px 36px', borderBottom: '1px solid #eee', background: LIGHT_BLUE }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      {t('تاريخ الإنشاء', 'Created At')}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{formatDate(invoice.createdAt)}</p>
                  </div>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <p style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      {t('آخر تحديث', 'Last Updated')}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{formatDate(invoice.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* ── SIGNATURES ── */}
              <div style={{ padding: '28px 36px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
                <div>
                  <p style={{ fontSize: 12, color: '#666', marginBottom: 48 }}>{t('التوقيع المصرح', 'Authorized Signature')}</p>
                  <div style={{ borderTop: '1.5px solid #bbb' }} />
                  <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{invoice.createdBy?.name || ''}</p>
                </div>
                <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                  <p style={{ fontSize: 12, color: '#666', marginBottom: 48 }}>{t('توقيع المورد', 'Vendor Signature')}</p>
                  <div style={{ borderTop: '1.5px solid #bbb' }} />
                  <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{invoice.vendorName || t('غير محدد', 'Not specified')}</p>
                </div>
              </div>

              {/* ── FOOTER TEXT ── */}
              <div style={{ padding: '12px 36px', borderTop: '1px solid #eee', textAlign: 'center', background: '#fafafa' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: BLUE, marginBottom: 4 }}>{t('شكراً لكم!', 'Thank you!')}</p>
                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                  {t(
                    'هذه الفاتورة من إنتاج الكمبيوتر ولا تتطلب توقيعاً فعلياً',
                    'This is a computer-generated invoice and does not require a physical signature.'
                  )}
                </p>
              </div>

              {/* ── FOOTER BAR ── */}
              <FooterBar />
            </div>
            {/* ══ END PRINTABLE ══ */}

          </div>

        ) : (

          /* ── No Invoice ── */
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-2">
              {t('لا توجد فاتورة لهذا الأصل', 'No invoice for this asset')}
            </p>
            <p className="text-sm text-gray-400 mb-5">
              {t('يمكنك إنشاء فاتورة شراء لهذا الأصل', 'You can create a purchase invoice for this asset')}
            </p>
            <button
              onClick={() => navigate(`/assets/${id}/invoice/create`)}
              style={{ background: BLUE }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl hover:opacity-90 transition font-semibold text-sm">
              <Plus className="w-4 h-4" />
              {t('إنشاء فاتورة', 'Create Invoice')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}