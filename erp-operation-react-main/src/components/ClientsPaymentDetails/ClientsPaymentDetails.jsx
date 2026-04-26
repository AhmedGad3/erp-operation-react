import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import megabuildLogo from '../../assets/megabuild1.svg';

/* ── Brand colors ── */
const RED        = '#C41E3A';
const BLUE       = '#003764';
const LIGHT_GREEN = '#F0FFF4';
const LIGHT_BLUE  = '#F0F4FA';

/* ── Logo ── */
const MegaBuildLogo = ({ size = 68 }) => (
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
const PaymentDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const isAr     = lang === 'ar';
  const t        = (ar, en) => isAr ? ar : en;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPayment(); }, [id]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/projects/payments/${id}`);
      setPayment(response.data.result);
    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error(t('حدث خطأ أثناء تحميل بيانات الدفعة', 'Error loading payment data'));
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    try {
      const element    = document.getElementById('receipt-container');
      const canvas     = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
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
      pdf.save(`payment-receipt-${payment.paymentNo}.pdf`);
      toast.success(t('تم تحميل PDF بنجاح', 'PDF downloaded successfully'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('حدث خطأ أثناء إنشاء PDF', 'Error generating PDF'));
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

  const getMethodLabel = (method) => {
    const map = {
      CASH:     t('نقد', 'Cash'),
      CHEQUE:   t('شيك', 'Cheque'),
      TRANSFER: t('تحويل بنكي', 'Bank Transfer'),
    };
    return map[method] || method;
  };

  if (loading) return <FullPageLoader text={t('جاري تحميل الإيصال...', 'Loading receipt...')} />;

  if (!payment) return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '32px 16px', fontFamily: 'Segoe UI,Tahoma,Arial,sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={() => navigate('/finance/client-payments')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
          <ArrowLeft size={16} /> {t('رجوع', 'Back')}
        </button>
        <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', color: '#888' }}>
          {t('الدفعة غير موجودة', 'Payment not found')}
        </div>
      </div>
    </div>
  );

  const previousBalance  = payment.amount + (payment.projectId?.totalPaid || payment.amount);
  const remainingBalance = (payment.projectId?.contractAmount || 0) - (payment.projectId?.totalPaid || 0);

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
        <button onClick={() => navigate('/finance/client-payments')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:BLUE, color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
          <ArrowLeft size={16} /> {t('رجوع', 'Back')}
        </button>
        <button onClick={handlePDF}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:RED, color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
          <Download size={16} /> {t('تحميل PDF', 'Download PDF')}
        </button>
      </div>

      {/* ══════════ RECEIPT ══════════ */}
      <div id="receipt-container" style={{
        maxWidth: 760, margin: '0 auto', background: '#fff',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{ padding: '24px 36px 18px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

            {/* يسار: اللوجو */}
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
                <div style={{ background:BLUE, color:'#fff', padding:'5px 16px', borderRadius:5 }}>
                  <span style={{ fontSize:14, fontWeight:800, letterSpacing:1 }}>
                    {t('إيصال دفعة', 'PAYMENT RECEIPT')}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'#555', margin:0 }}>
                  <span style={{ fontWeight:700, color:BLUE }}>{t('رقم:', 'No:')}</span>{' '}
                  RCP-{payment.paymentNo}
                </p>
                {payment.createdBy?.email && (
                  <p style={{ fontSize:12, color:'#555', margin:0 }}>
                    <span style={{ fontWeight:700, color:BLUE }}>{t('بواسطة:', 'By:')}</span>{' '}
                    {payment.createdBy.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height:3, background:RED }} />
        <div style={{ height:1, background:'#eee' }} />

        {/* ══ CLIENT INFO / DATE / METHOD ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
          {/* العميل */}
          <div style={{ padding:'20px 36px', borderBottom:'1px solid #eee', borderInlineEnd:'1px solid #eee' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {t('فاتورة إلى', 'Bill To')}
            </p>
            <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:0 }}>
              {isAr ? payment.clientId?.nameAr : payment.clientId?.nameEn}
            </p>
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:3 }}>
              {payment.clientId?.code && (
                <p style={{ fontSize:12, color:'#666', margin:0 }}>
                  {t('الكود:', 'Code:')} {payment.clientId.code}
                </p>
              )}
              {payment.clientId?.phone && (
                <p style={{ fontSize:12, color:'#666', margin:0 }}>
                  {t('الهاتف:', 'Phone:')} {payment.clientId.phone}
                </p>
              )}
              {payment.clientId?.email && (
                <p style={{ fontSize:12, color:'#666', margin:0 }}>
                  {t('البريد:', 'Email:')} {payment.clientId.email}
                </p>
              )}
            </div>
          </div>

          {/* التاريخ وطريقة الدفع */}
          <div style={{ padding:'20px 36px', borderBottom:'1px solid #eee', display:'flex', flexDirection:'column', gap:12 }}>
            <InfoRow label={t('تاريخ الدفع','Payment Date')} value={formatDate(payment.paymentDate)} align={isAr?'left':'right'} />
            <InfoRow label={t('طريقة الدفع','Payment Method')} value={getMethodLabel(payment.method)} align={isAr?'left':'right'} />
            {/* رقم الشيك يظهر بس لو كاش شيك */}
            {payment.method === 'CHEQUE' && payment.chequeNo && (
              <InfoRow label={t('رقم الشيك','Cheque #')} value={payment.chequeNo} align={isAr?'left':'right'} />
            )}
            {/* رقم التحويل يظهر بس لو تحويل */}
            {payment.method === 'TRANSFER' && payment.transferRef && (
              <InfoRow label={t('رقم التحويل','Transfer #')} value={payment.transferRef} align={isAr?'left':'right'} />
            )}
          </div>
        </div>

        {/* ══ PROJECT BAR ══ */}
        <div style={{ background:LIGHT_BLUE, padding:'14px 36px', borderBottom:'1px solid #dde4f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>
              {t('المشروع','Project')}
            </p>
            <p style={{ fontSize:15, fontWeight:800, color:BLUE, margin:0 }}>
              {isAr ? payment.projectId?.nameAr : payment.projectId?.nameEn}
            </p>
            {payment.projectId?.code && (
              <p style={{ fontSize:12, color:'#555', marginTop:2 }}>
                {t('الكود:','Code:')} {payment.projectId.code}
              </p>
            )}
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
            {/* الرصيد السابق */}
            <tr style={{ borderBottom:'1px solid #eee' }}>
              <td style={{ padding:'14px 36px', fontSize:13, color:'#555' }}>
                {t('الرصيد السابق','Previous Balance')}
              </td>
              <td style={{ padding:'14px 36px', textAlign:isAr?'left':'right', fontSize:14, fontWeight:600, color:'#555' }}>
                {formatCurrency(previousBalance)}
              </td>
            </tr>
            {/* المبلغ المدفوع */}
            <tr style={{ background:LIGHT_GREEN, borderBottom:'2px solid #bbf7d0' }}>
              <td style={{ padding:'14px 36px', fontSize:14, fontWeight:700, color:'#166534' }}>
                {t('المبلغ المدفوع','Amount Paid')}
              </td>
              <td style={{ padding:'14px 36px', textAlign:isAr?'left':'right', fontSize:22, fontWeight:900, color:'#16a34a' }}>
                - {formatCurrency(payment.amount)}
              </td>
            </tr>
            {/* المبلغ المتبقي */}
            <tr style={{ background:'#fafafa' }}>
              <td style={{ padding:'14px 36px', fontSize:13, fontWeight:700, color:'#333' }}>
                {t('المبلغ المتبقي','Remaining Balance')}
              </td>
              <td style={{ padding:'14px 36px', textAlign:isAr?'left':'right', fontSize:18, fontWeight:900, color:BLUE }}>
                {formatCurrency(remainingBalance)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ PAYMENT CONFIRMATION ══ */}
        <div style={{ background:'#16a34a', padding:'12px 36px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:24, height:24, background:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:'#16a34a', fontWeight:900, fontSize:16 }}>✓</span>
          </div>
          <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>
            {t('تم استلام الدفعة:','Payment Received:')}{' '}
            <span style={{ fontSize:16 }}>{formatCurrency(payment.amount)}</span>
          </p>
        </div>

        {/* ══ NOTES (dynamic) ══ */}
        {payment.notes && (
          <div style={{ padding:'18px 36px', borderBottom:'1px solid #eee', background:'#fafafa' }}>
            <p style={{ fontSize:11, fontWeight:700, color:BLUE, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {t('ملاحظات','Notes')}
            </p>
            <p style={{ fontSize:13, color:'#444', lineHeight:1.6, margin:0 }}>{payment.notes}</p>
          </div>
        )}

        {/* ══ SIGNATURES ══ */}
        <div style={{ padding:'28px 36px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
          <div>
            <p style={{ fontSize:12, color:'#666', marginBottom:48 }}>{t('التوقيع المصرح','Authorized Signature')}</p>
            <div style={{ borderTop:'1.5px solid #bbb' }} />
            <p style={{ fontSize:11, color:'#888', marginTop:6 }}>{payment.createdBy?.name || ''}</p>
          </div>
          <div style={{ textAlign:isAr?'left':'right' }}>
            <p style={{ fontSize:12, color:'#666', marginBottom:48 }}>{t('توقيع العميل','Client Signature')}</p>
            <div style={{ borderTop:'1.5px solid #bbb' }} />
            <p style={{ fontSize:11, color:'#888', marginTop:6 }}>
              {isAr ? payment.clientId?.nameAr : payment.clientId?.nameEn}
            </p>
          </div>
        </div>

        {/* ══ FOOTER TEXT ══ */}
        <div style={{ padding:'12px 36px', borderTop:'1px solid #eee', textAlign:'center', background:'#fafafa' }}>
          <p style={{ fontSize:12, fontWeight:700, color:BLUE, marginBottom:4 }}>{t('شكراً على دفعتك!','Thank you for your payment!')}</p>
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

export default PaymentDetails;