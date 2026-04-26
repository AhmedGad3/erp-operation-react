import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import megabuildLogo from '../../assets/megabuild1.svg';

const RED        = '#C41E3A';
const BLUE       = '#003764';
const LIGHT_RED  = '#FFF5F5';

const MegaBuildLogo = ({ size = 68 }) => (
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

const InfoRow = ({ label, value, align = 'left' }) => (
  <div style={{ textAlign: align }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
      {label}
    </p>
    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{value}</p>
  </div>
);

const SupplierRefundDetails = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { lang }     = useContext(LanguageContext);
  const isAr         = lang === 'ar';
  const t            = (ar, en) => isAr ? ar : en;

  const [refund,  setRefund]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRefund(); }, [id]);

  const fetchRefund = async () => {
    try {
      setLoading(true);

      // ✅ لو البيانات جايه من الـ List استخدمها على طول
      if (location.state?.refund) {
        setRefund(location.state.refund);
        return;
      }

      // fallback لو حد فتح الـ URL مباشرة
      const res = await axiosInstance.get(`/supplier/payments/refunds/${id}`);
      setRefund(res.data.result);
    } catch (error) {
      console.error('Error fetching refund:', error);
      toast.error(t('حدث خطأ أثناء تحميل بيانات المرتجع', 'Error loading refund data'));
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    try {
      const element   = document.getElementById('receipt-container');
      const canvas    = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData   = canvas.toDataURL('image/png');
      const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth  = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`refund-receipt-${refund.refundNo}.pdf`);
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

  const getMethodLabel = (method) => ({
    CASH:  t('نقد', 'Cash'),
    BANK:  t('تحويل بنكي', 'Bank Transfer'),
    CHECK: t('شيك', 'Check'),
  }[method] || method);

  if (loading) return <FullPageLoader text={t('جاري تحميل الإيصال...', 'Loading receipt...')} />;

  if (!refund) return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '32px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={() => navigate('/finance/supplier-refunds')}
          style={{ display:'flex', alignItems:'center', gap:8, color:BLUE, background:'none', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, marginBottom:16 }}>
          <ArrowLeft size={16} /> {t('رجوع', 'Back')}
        </button>
        <div style={{ background:'#fff', borderRadius:8, padding:40, textAlign:'center', color:'#888' }}>
          {t('المرتجع غير موجود', 'Refund not found')}
        </div>
      </div>
    </div>
  );

  // البيانات بتيجي من الـ state اللي بعتناه من الـ List
  const supplier = refund.supplier || refund.supplierId;
  const creator  = refund.creator  || refund.createdBy;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F3F4F6',
      padding: '32px 16px',
      fontFamily: isAr ? 'Tahoma,Arial,sans-serif' : 'Segoe UI,Arial,sans-serif',
      direction: isAr ? 'rtl' : 'ltr',
    }}>

      {/* ── Buttons ── */}
      <div className="print:hidden" style={{ maxWidth:760, margin:'0 auto 24px', display:'flex', gap:12 }}>
        <button onClick={() => navigate('/finance/supplier-refunds')}
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
        maxWidth:760, margin:'0 auto', background:'#fff',
        borderRadius:12, overflow:'hidden',
        boxShadow:'0 4px 32px rgba(0,0,0,0.10)',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{ padding:'24px 36px 18px', borderBottom:'1px solid #eee' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
              <MegaBuildLogo size={68} />
              <p style={{ fontSize:8, color:'#aaa', marginTop:3, letterSpacing:0.8 }}>
                {t('نبني القيمة', 'We Build Value')}
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap:5 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
                <span style={{ fontSize:26, fontWeight:900, color:RED,  letterSpacing:2, lineHeight:1 }}>MEGA</span>
                <span style={{ fontSize:26, fontWeight:900, color:BLUE, letterSpacing:2, lineHeight:1 }}>BUILD</span>
              </div>
              <p style={{ fontSize:10, color:'#999', fontStyle:'italic', margin:0 }}>We Build Value</p>
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
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap:4 }}>
                <div style={{ background:RED, color:'#fff', padding:'5px 16px', borderRadius:5 }}>
                  <span style={{ fontSize:14, fontWeight:800, letterSpacing:1 }}>
                    {t('إيصال مرتجع مورد', 'SUPPLIER REFUND RECEIPT')}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'#555', margin:0 }}>
                  <span style={{ fontWeight:700, color:RED }}>{t('رقم:', 'No:')}</span>{' '}
                  RFD-{refund.refundNo}
                </p>
                {creator?.email && (
                  <p style={{ fontSize:12, color:'#555', margin:0 }}>
                    <span style={{ fontWeight:700, color:RED }}>{t('بواسطة:', 'By:')}</span>{' '}
                    {creator.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height:3, background:RED }} />
        <div style={{ height:1, background:'#eee' }} />

        {/* ══ SUPPLIER INFO / DATE / METHOD ══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
          <div style={{ padding:'20px 36px', borderBottom:'1px solid #eee', borderInlineEnd:'1px solid #eee' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {t('المورد', 'Supplier')}
            </p>
            <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:0 }}>
              {isAr ? supplier?.nameAr : supplier?.nameEn}
            </p>
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:3 }}>
              {supplier?.code  && <p style={{ fontSize:12, color:'#666', margin:0 }}>{t('الكود:', 'Code:')} {supplier.code}</p>}
              {supplier?.phone && <p style={{ fontSize:12, color:'#666', margin:0 }}>{t('الهاتف:', 'Phone:')} {supplier.phone}</p>}
              {supplier?.email && <p style={{ fontSize:12, color:'#666', margin:0 }}>{t('البريد:', 'Email:')} {supplier.email}</p>}
            </div>
          </div>
          <div style={{ padding:'20px 36px', borderBottom:'1px solid #eee', display:'flex', flexDirection:'column', gap:12 }}>
            <InfoRow label={t('تاريخ المرتجع', 'Refund Date')}     value={formatDate(refund.refundDate)}    align={isAr ? 'left' : 'right'} />
            <InfoRow label={t('طريقة الاسترداد', 'Refund Method')} value={getMethodLabel(refund.method)}   align={isAr ? 'left' : 'right'} />
            {refund.method === 'CHECK' && refund.checkNo && (
              <InfoRow label={t('رقم الشيك', 'Check #')} value={refund.checkNo} align={isAr ? 'left' : 'right'} />
            )}
            {refund.method === 'BANK' && refund.transferRef && (
              <InfoRow label={t('رقم التحويل', 'Transfer #')} value={refund.transferRef} align={isAr ? 'left' : 'right'} />
            )}
          </div>
        </div>

        {/* ══ TABLE ══ */}
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:RED }}>
              <th style={{ padding:'12px 36px', textAlign: isAr ? 'right' : 'left', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:1 }}>
                {t('الوصف', 'Description')}
              </th>
              <th style={{ padding:'12px 36px', textAlign: isAr ? 'left' : 'right', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:1 }}>
                {t('المبلغ', 'Amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: LIGHT_RED, borderBottom:'2px solid #fecaca' }}>
              <td style={{ padding:'14px 36px', fontSize:14, fontWeight:700, color:'#991b1b' }}>
                {t('مبلغ المرتجع', 'Refund Amount')}
              </td>
              <td style={{ padding:'14px 36px', textAlign: isAr ? 'left' : 'right', fontSize:22, fontWeight:900, color:RED }}>
                {formatCurrency(refund.amount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ CONFIRMATION BAR ══ */}
        <div style={{ background:RED, padding:'12px 36px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:24, height:24, background:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:RED, fontWeight:900, fontSize:16 }}>✓</span>
          </div>
          <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:0 }}>
            {t('تم صرف المرتجع:', 'Refund Issued:')}{' '}
            <span style={{ fontSize:16 }}>{formatCurrency(refund.amount)}</span>
          </p>
        </div>

        {/* ══ NOTES ══ */}
        {refund.notes && (
          <div style={{ padding:'18px 36px', borderBottom:'1px solid #eee', background:'#fafafa' }}>
            <p style={{ fontSize:11, fontWeight:700, color:RED, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {t('ملاحظات', 'Notes')}
            </p>
            <p style={{ fontSize:13, color:'#444', lineHeight:1.6, margin:0 }}>{refund.notes}</p>
          </div>
        )}

        {/* ══ SIGNATURES ══ */}
        <div style={{ padding:'28px 36px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
          <div>
            <p style={{ fontSize:12, color:'#666', marginBottom:48 }}>{t('التوقيع المصرح', 'Authorized Signature')}</p>
            <div style={{ borderTop:'1.5px solid #bbb' }} />
            <p style={{ fontSize:11, color:'#888', marginTop:6 }}>{creator?.name || ''}</p>
          </div>
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <p style={{ fontSize:12, color:'#666', marginBottom:48 }}>{t('توقيع المورد', 'Supplier Signature')}</p>
            <div style={{ borderTop:'1.5px solid #bbb' }} />
            <p style={{ fontSize:11, color:'#888', marginTop:6 }}>
              {isAr ? supplier?.nameAr : supplier?.nameEn}
            </p>
          </div>
        </div>

        {/* ══ FOOTER TEXT ══ */}
        <div style={{ padding:'12px 36px', borderTop:'1px solid #eee', textAlign:'center', background:'#fafafa' }}>
          <p style={{ fontSize:12, fontWeight:700, color:RED, marginBottom:4 }}>
            {t('شكراً للتعامل معنا!', 'Thank you for your business!')}
          </p>
          <p style={{ fontSize:11, color:'#888', margin:0 }}>
            {t(
              'هذا إيصال من إنتاج الكمبيوتر ولا يتطلب توقيعاً فعلياً',
              'This is a computer-generated receipt and does not require a physical signature.'
            )}
          </p>
        </div>

        <FooterBar />
      </div>
    </div>
  );
};

export default SupplierRefundDetails;