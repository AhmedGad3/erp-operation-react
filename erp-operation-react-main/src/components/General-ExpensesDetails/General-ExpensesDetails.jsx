import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import megabuildLogo from '../../assets/megabuild1.svg';

const EXPENSE_CATEGORIES = {
  RENT:              { labelAr: 'إيجارات',     labelEn: 'Rent' },
  UTILITIES:         { labelAr: 'مرافق',        labelEn: 'Utilities' },
  MAINTENANCE:       { labelAr: 'صيانة',        labelEn: 'Maintenance' },
  OFFICE_SUPPLIES:   { labelAr: 'أدوات مكتبية', labelEn: 'Office Supplies' },
  HOSPITALITY:       { labelAr: 'ضيافة',        labelEn: 'Hospitality' },
  COMMUNICATION:     { labelAr: 'اتصالات',      labelEn: 'Communication' },
  TRANSPORTATION:    { labelAr: 'مواصلات',      labelEn: 'Transportation' },
  PROFESSIONAL_FEES: { labelAr: 'رسوم مهنية',   labelEn: 'Professional Fees' },
  INSURANCE:         { labelAr: 'تأمينات',      labelEn: 'Insurance' },
  MARKETING:         { labelAr: 'تسويق',        labelEn: 'Marketing' },
  SALARIES:          { labelAr: 'رواتب',        labelEn: 'Salaries' },
  OTHERS:            { labelAr: 'أخرى',         labelEn: 'Others' },
};

const PAYMENT_METHODS = {
  CASH:     { labelAr: 'نقد',         labelEn: 'Cash' },
  TRANSFER: { labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
  CHEQUE:   { labelAr: 'شيك',        labelEn: 'Cheque' },
};

/* ── Brand colors ── */
const RED        = '#C41E3A';
const BLUE       = '#003764';
const LIGHT_RED  = '#FFF5F6';
const LIGHT_BLUE = '#F0F4FA';

const MegaBuildLogo = ({ size = 56 }) => (
  <img
    src={megabuildLogo}
    alt="Mega Build Logo"
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);

/* ── Footer bar ── */
const FooterBar = () => (
  <div style={{ display: 'flex', height: 28 }}>
    <div style={{ width: '38%', background: BLUE }} />
    <div style={{ width: '2%',  background: '#fff' }} />
    <div style={{ flex: 1,      background: RED }} />
  </div>
);

/* ── InfoRow ── */
const InfoRow = ({ label, value, align = 'left' }) => (
  <div style={{ textAlign: align }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
      {label}
    </p>
    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{value}</p>
  </div>
);

/* ════════════════════════════════════════ */
const ExpenseDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const isAr     = lang === 'ar';
  const t        = (ar, en) => isAr ? ar : en;

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchExpense(); }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/general-expenses/${id}`);
      setExpense(response.data);
    } catch (error) {
      console.error('Error fetching expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    try {
      const element   = document.getElementById('expense-receipt-container');
      const canvas    = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData   = canvas.toDataURL('image/png');
      const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
      toast.success(t('تم تحميل PDF بنجاح', 'PDF downloaded successfully'));
      pdf.save(`expense-receipt-${expense.expenseNo}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('خطأ في إنشاء PDF', 'Error generating PDF'));
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

  const getCategoryLabel = (cat) =>
    EXPENSE_CATEGORIES[cat]?.[isAr ? 'labelAr' : 'labelEn'] || cat || '—';

  const getMethodLabel = (m) =>
    PAYMENT_METHODS[m]?.[isAr ? 'labelAr' : 'labelEn'] || m || '—';

  if (loading) return <FullPageLoader text={t('جاري تحميل الإيصال...', 'Loading receipt...')} />;

  if (!expense) return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '32px 16px', fontFamily: 'Segoe UI,Tahoma,Arial,sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={() => navigate('/general-expenses')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
          <ArrowLeft size={16} /> {t('رجوع', 'Back')}
        </button>
        <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', color: '#888' }}>
          {t('المصروف غير موجود', 'Expense not found')}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F3F4F6',
      padding: '32px 16px',
      fontFamily: isAr ? 'Tahoma,Arial,sans-serif' : 'Segoe UI,Arial,sans-serif',
      direction: isAr ? 'rtl' : 'ltr',
    }}>

      {/* ── Buttons ── */}
      <div className="print:hidden" style={{ maxWidth: 760, margin: '0 auto 24px', display: 'flex', gap: 12 }}>
        <button onClick={() => navigate('/finance/general-expenses')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:BLUE, color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
          <ArrowLeft size={16} /> {t('رجوع', 'Back')}
        </button>
        <button onClick={handlePDF}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:RED, color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
          <Download size={16} /> {t('تحميل PDF', 'Download PDF')}
        </button>
      </div>

      {/* ══════════ RECEIPT ══════════ */}
      <div id="expense-receipt-container" style={{
        maxWidth: 760, margin: '0 auto', background: '#fff',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
      }}>

        {/* ══ HEADER: لوجو يسار — MEGA BUILD + كونتاكت يمين ══ */}
        <div style={{ padding: '24px 36px 18px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

            {/* يسار: اللوجو فقط */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <MegaBuildLogo size={68} />
              <p style={{ fontSize:8, color:'#aaa', marginTop:3, letterSpacing:0.8 }}>
                {t('نبني القيمة', 'We Build Value')}
              </p>
            </div>

            {/* يمين: MEGA BUILD + بيانات + badge */}
            <div style={{ display:'flex', flexDirection:'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap:5 }}>

              {/* اسم الشركة */}
              <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
                <span style={{ fontSize:26, fontWeight:900, color:RED,  letterSpacing:2, lineHeight:1 }}>MEGA</span>
                <span style={{ fontSize:26, fontWeight:900, color:BLUE, letterSpacing:2, lineHeight:1 }}>BUILD</span>
              </div>
              <p style={{ fontSize:10, color:'#999', fontStyle:'italic', margin:0 }}>We Build Value</p>

              {/* بيانات الاتصال */}
              <div style={{ display:'flex', flexDirection:'column', gap:2, alignItems: isAr ? 'flex-start' : 'flex-end', marginTop:4 }}>
                {[
                  '23 RD Of July St, Suez – Suez P.O. Box: 43511',
                  'C.R: 59034    T.C: 454-990-006',
                  'Tel: 062 3456452    Mob: 01111696211',
                  'Meegabuild@gmail.com',
                  'www.Megbuild.com',
                ].map((line, i) => (
                  <p key={i} style={{ fontSize:10.5, color:'#444', margin:0 }}>{line}</p>
                ))}
              </div>

              {/* Receipt badge + رقم */}
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap:4 }}>
                <div style={{ background:RED, color:'#fff', padding:'5px 16px', borderRadius:5 }}>
                  <span style={{ fontSize:14, fontWeight:800, letterSpacing:1 }}>
                    {t('إيصال مصروف', 'EXPENSE RECEIPT')}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'#555', margin:0 }}>
                  <span style={{ fontWeight:700, color:BLUE }}>{t('رقم:', 'No:')}</span>{' '}
                  EXP-{expense.expenseNo}
                </p>
                {expense.createdBy?.email && (
                  <p style={{ fontSize:12, color:'#555', margin:0 }}>
                    <span style={{ fontWeight:700, color:BLUE }}>{t('بواسطة:', 'By:')}</span>{' '}
                    {expense.createdBy.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height:3, background:RED }} />
        <div style={{ height:1, background:'#eee' }} />

        {/* ══ PAID TO / DATE / METHOD ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
          <div style={{ padding:'20px 36px', borderBottom:'1px solid #eee', borderInlineEnd:'1px solid #eee' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {t('المستفيد', 'Paid To')}
            </p>
            <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:0 }}>
              {expense.vendorName || t('غير محدد', 'Not specified')}
            </p>
            {expense.vendorName && (
              <p style={{ fontSize:12, color:'#777', marginTop:4, margin:0 }}>
                {t('مورد / جهة خارجية', 'Vendor / External Party')}
              </p>
            )}
          </div>
          <div style={{ padding:'20px 36px', borderBottom:'1px solid #eee', display:'flex', flexDirection:'column', gap:12 }}>
            <InfoRow label={t('تاريخ المصروف','Expense Date')} value={formatDate(expense.expenseDate)} align={isAr?'left':'right'} />
            <InfoRow label={t('طريقة الدفع','Payment Method')} value={getMethodLabel(expense.paymentMethod)} align={isAr?'left':'right'} />
            {/* رقم المرجع يظهر بس لو موجود */}
            {expense.referenceNo && (
              <InfoRow label={t('رقم المرجع','Reference #')} value={expense.referenceNo} align={isAr?'left':'right'} />
            )}
          </div>
        </div>

        {/* ══ CATEGORY BAR ══ */}
        <div style={{ background:LIGHT_BLUE, padding:'14px 36px', borderBottom:'1px solid #dde4f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
              {t('الفئة','Category')}
            </p>
            <p style={{ fontSize:15, fontWeight:800, color:BLUE, margin:0 }}>
              {getCategoryLabel(expense.mainCategory)}
            </p>
            {/* sub-category يظهر بس لو موجود */}
            {expense.subCategory && (
              <p style={{ fontSize:12, color:'#555', marginTop:2 }}>{expense.subCategory}</p>
            )}
          </div>
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <p style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
              {t('العنوان','Title')}
            </p>
            <p style={{ fontSize:15, fontWeight:800, color:BLUE, margin:0 }}>{expense.title}</p>
          </div>
        </div>

        {/* ══ TABLE ══ */}
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:BLUE }}>
              <th style={{ padding:'12px 36px', textAlign:isAr?'right':'left', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:1 }}>
                {t('الوصف','Description')}
              </th>
              <th style={{ padding:'12px 36px', textAlign:isAr?'left':'right', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:1 }}>
                {t('المبلغ','Amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background:LIGHT_RED, borderBottom:'2px solid #f5c0c8' }}>
              <td style={{ padding:'16px 36px', fontSize:14, fontWeight:600, color:'#333' }}>
                {expense.title}
              </td>
              <td style={{ padding:'16px 36px', textAlign:isAr?'left':'right', fontSize:22, fontWeight:900, color:RED }}>
                {formatCurrency(expense.amount)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ background:'#fafafa' }}>
              <td style={{ padding:'14px 36px', fontSize:13, fontWeight:700, color:'#555' }}>
                {t('إجمالي المصروف','Total Expense')}
              </td>
              <td style={{ padding:'14px 36px', textAlign:isAr?'left':'right', fontSize:18, fontWeight:900, color:RED }}>
                {formatCurrency(expense.amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ══ PAYMENT CONFIRMATION ══ */}
        <div style={{ background:RED, padding:'12px 36px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:24, height:24, background:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:RED, fontWeight:900, fontSize:16 }}>✓</span>
          </div>
          <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>
            {t('تم صرف المبلغ:','Amount Paid:')}{' '}
            <span style={{ fontSize:16 }}>{formatCurrency(expense.amount)}</span>
          </p>
        </div>

        {/* ══ NOTES (dynamic) ══ */}
        {expense.notes && (
          <div style={{ padding:'18px 36px', borderBottom:'1px solid #eee', background:'#fafafa' }}>
            <p style={{ fontSize:11, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {t('ملاحظات','Notes')}
            </p>
            <p style={{ fontSize:13, color:'#444', lineHeight:1.6, margin:0 }}>{expense.notes}</p>
          </div>
        )}

        {/* ══ METADATA ══ */}
        <div style={{ padding:'18px 36px', borderBottom:'1px solid #eee', background:LIGHT_BLUE }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <p style={{ fontSize:10, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                {t('تاريخ الإنشاء','Created At')}
              </p>
              <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:0 }}>{formatDate(expense.createdAt)}</p>
            </div>
            <div style={{ textAlign:isAr?'left':'right' }}>
              <p style={{ fontSize:10, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                {t('آخر تحديث','Last Updated')}
              </p>
              <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:0 }}>{formatDate(expense.updatedAt)}</p>
            </div>
            {/* updatedBy يظهر بس لو موجود */}
            {expense.updatedBy && (
              <div style={{ gridColumn:'1 / -1' }}>
                <p style={{ fontSize:10, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
                  {t('تم التحديث بواسطة','Updated By')}
                </p>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:0 }}>
                  {expense.updatedBy.name} ({expense.updatedBy.email})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══ SIGNATURES ══ */}
        <div style={{ padding:'28px 36px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
          <div>
            <p style={{ fontSize:12, color:'#666', marginBottom:48 }}>{t('التوقيع المصرح','Authorized Signature')}</p>
            <div style={{ borderTop:'1.5px solid #bbb' }} />
            <p style={{ fontSize:11, color:'#888', marginTop:6 }}>{expense.createdBy?.name || ''}</p>
          </div>
          <div style={{ textAlign:isAr?'left':'right' }}>
            <p style={{ fontSize:12, color:'#666', marginBottom:48 }}>{t('توقيع المستلم','Receiver Signature')}</p>
            <div style={{ borderTop:'1.5px solid #bbb' }} />
            <p style={{ fontSize:11, color:'#888', marginTop:6 }}>
              {expense.vendorName || t('غير محدد','Not specified')}
            </p>
          </div>
        </div>

        {/* ══ FOOTER TEXT ══ */}
        <div style={{ padding:'12px 36px', borderTop:'1px solid #eee', textAlign:'center', background:'#fafafa' }}>
          <p style={{ fontSize:12, fontWeight:700, color:BLUE, marginBottom:4 }}>{t('شكراً لكم!','Thank you!')}</p>
          <p style={{ fontSize:11, color:'#888', margin:0 }}>
            {t(
              'هذا إيصال من إنتاج الكمبيوتر ولا يتطلب توقيعاً فعلياً',
              'This is a computer-generated receipt and does not require a physical signature.'
            )}
          </p>
        </div>

        {/* ══ FOOTER BAR ══ */}
        <FooterBar />
      </div>
    </div>
  );
};

export default ExpenseDetails;