/**
 * ═══════════════════════════════════════════════════════════════
 *  الحل النهائي الصح 100% لمشكلة العربي في PDF
 * ═══════════════════════════════════════════════════════════════
 * 
 *  المشكلة: jsPDF لا يدعم العربية بشكل صحيح مهما حاولنا
 *  
 *  الحلول المتاحة:
 *  1. استخدام html2pdf (تحويل HTML إلى PDF) ✅ الأسهل
 *  2. استخدام pdfmake مع خطوط عربية ✅ احترافي
 *  3. استخدام canvas وتحويله لـ PDF ✅ يشتغل
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// ═══════════════════════════════════════════════════════════
//  الحل 1: تحويل جدول HTML إلى PDF (الأفضل للعربي)
// ═══════════════════════════════════════════════════════════

/**
 * تصدير جدول HTML موجود في الصفحة إلى PDF
 * هذا الحل يحافظ على تنسيق العربي بشكل مثالي
 */
export const exportTableToPDF = async (tableId, fileName, title = '') => {
  try {
    const element = document.getElementById(tableId);
    if (!element) {
      throw new Error('Table element not found');
    }

    // تحويل الجدول إلى صورة
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 297; // A4 landscape width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    let position = 10;

    // إضافة العنوان
    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, pdf.internal.pageSize.getWidth() / 2, position, { align: 'center' });
      position += 10;
    }

    // إضافة الصورة
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth - 20, imgHeight);

    const date = new Date().toISOString().split('T')[0];
    pdf.save(`${fileName}_${date}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('حدث خطأ أثناء التصدير');
    return false;
  }
};

// ═══════════════════════════════════════════════════════════
//  الحل 2: إنشاء جدول HTML مؤقت ثم تصديره
// ═══════════════════════════════════════════════════════════

export const exportToPDF = async (data, headers, fileName, lang = 'en', title = '') => {
  const isAr = lang === 'ar';
  
  try {
    // إنشاء عنصر مؤقت في الصفحة
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-pdf-export';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '1200px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.direction = isAr ? 'rtl' : 'ltr';
    
    // إنشاء HTML للجدول
    let html = `
      <div style="font-family: Arial, sans-serif; direction: ${isAr ? 'rtl' : 'ltr'};">
        ${title ? `<h2 style="text-align: center; color: #4338ca; margin-bottom: 20px;">${title}</h2>` : ''}
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #4f46e5; color: white;">
    `;
    
    // رؤوس الجدول
    const headerKeys = headers.map(h => Object.keys(h)[0]);
    const displayHeaders = isAr ? [...headers].reverse() : headers;
    
    displayHeaders.forEach(header => {
      const key = Object.keys(header)[0];
      const label = header[key];
      html += `<th style="padding: 12px; text-align: ${isAr ? 'right' : 'left'}; border: 1px solid #e2e8f0;">${label}</th>`;
    });
    
    html += `
            </tr>
          </thead>
          <tbody>
    `;
    
    // صفوف البيانات
    const displayKeys = isAr ? [...headerKeys].reverse() : headerKeys;
    
    data.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? '#f8fafc' : 'white';
      html += `<tr style="background-color: ${bgColor};">`;
      
      displayKeys.forEach(key => {
        let value = row[key];
        if (value === null || value === undefined || value === '') {
          value = '—';
        } else if (typeof value === 'number') {
          value = value.toLocaleString(isAr ? 'ar-EG' : 'en-US');
        }
        
        html += `<td style="padding: 10px; text-align: ${isAr ? 'right' : 'left'}; border: 1px solid #e2e8f0;">${value}</td>`;
      });
      
      html += `</tr>`;
    });
    
    html += `
          </tbody>
        </table>
        <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #64748b;">
          ${isAr ? `التاريخ: ${new Date().toLocaleDateString('ar-EG')}` : `Date: ${new Date().toLocaleDateString('en-US')}`}
        </p>
      </div>
    `;
    
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    
    // الانتظار لضمان رسم العنصر
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // تحويل إلى صورة
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // إزالة العنصر المؤقت
    document.body.removeChild(tempDiv);
    
    // إنشاء PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 10;
    
    // إضافة الصورة (مع دعم الصفحات المتعددة)
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    const date = new Date().toISOString().split('T')[0];
    pdf.save(`${fileName.replace(/\s+/g, '_')}_${date}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert(isAr ? 'حدث خطأ أثناء التصدير' : 'Error exporting PDF');
    return false;
  }
};

// ═══════════════════════════════════════════════════════════
//  SUPPLIER STATEMENT EXPORT - نفس الطريقة
// ═══════════════════════════════════════════════════════════

export const exportSupplierStatementToPDF = async (supplier, invoices, payments, lang = 'en') => {
  const isAr = lang === 'ar';
  
  const t = {
    en: {
      statement: 'Supplier Statement',
      supplier: 'Supplier',
      date: 'Date',
      type: 'Type',
      reference: 'Reference',
      debit: 'Debit',
      credit: 'Credit',
      balance: 'Balance',
      invoice: 'Invoice',
      payment: 'Payment',
    },
    ar: {
      statement: 'كشف حساب المورد',
      supplier: 'المورد',
      date: 'التاريخ',
      type: 'النوع',
      reference: 'المرجع',
      debit: 'مدين',
      credit: 'دائن',
      balance: 'الرصيد',
      invoice: 'فاتورة',
      payment: 'دفعة',
    }
  }[lang];

  // تحضير البيانات
  const transactions = [];
  let runningBalance = 0;

  invoices.forEach(inv => {
    runningBalance += inv.totalAmount;
    transactions.push({
      date: inv.invoiceDate,
      type: t.invoice,
      reference: inv.invoiceNumber,
      debit: inv.totalAmount.toLocaleString(isAr ? 'ar-EG' : 'en-US'),
      credit: '0',
      balance: runningBalance.toLocaleString(isAr ? 'ar-EG' : 'en-US'),
    });
  });

  payments.forEach(pay => {
    runningBalance -= pay.amount;
    transactions.push({
      date: pay.paymentDate,
      type: t.payment,
      reference: pay.referenceNumber || '-',
      debit: '0',
      credit: pay.amount.toLocaleString(isAr ? 'ar-EG' : 'en-US'),
      balance: runningBalance.toLocaleString(isAr ? 'ar-EG' : 'en-US'),
    });
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // تحويل إلى headers و data
  const headers = [
    { date: t.date },
    { type: t.type },
    { reference: t.reference },
    { debit: t.debit },
    { credit: t.credit },
    { balance: t.balance },
  ];

  const supplierName = isAr ? supplier.nameAr : supplier.name;
  const title = `${t.statement}: ${supplierName}`;
  const fileName = `Supplier_Statement_${supplier.name.replace(/\s+/g, '_')}`;

  return exportToPDF(transactions, headers, fileName, lang, title);
};