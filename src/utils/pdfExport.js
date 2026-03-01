
 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';


const BRAND_BLUE = '#003764';
const BRAND_RED = '#C41E3A';

const getPublicUrl = (path) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL
    : '/';
  const safeBase = base.endsWith('/') ? base : `${base}/`;
  const safePath = path.startsWith('/') ? path.slice(1) : path;
  return `${safeBase}${safePath}`;
};

const loadImageBase64 = async (url) => {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise(res => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const drawHeaderFooter = ({ pdf, pageWidth, pageHeight, logoBase64 }) => {
  const headerH = 26;
  const footerH = 14;

  // Header background line
  pdf.setDrawColor(BRAND_RED);
  pdf.setLineWidth(0.8);
  pdf.line(10, headerH + 2, pageWidth - 10, headerH + 2);

  // Logo (optional)
  if (logoBase64 && typeof logoBase64 === 'string' && logoBase64.startsWith('data:image')) {
    try {
      pdf.addImage(logoBase64, 'PNG', 10, 6, 14, 14);
    } catch {}
  }

  // Brand text
  pdf.setFontSize(16);
  pdf.setTextColor(BRAND_RED);
  pdf.text('MEGA', pageWidth - 35, 14);
  pdf.setTextColor(BRAND_BLUE);
  pdf.text('BUILD', pageWidth - 18, 14);

  pdf.setFontSize(8);
  pdf.setTextColor(120);
  pdf.text('We Build Value', pageWidth - 10, 18, { align: 'right' });

  // Footer bar
  pdf.setFillColor(BRAND_BLUE);
  pdf.rect(0, pageHeight - footerH, pageWidth * 0.38, footerH, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(pageWidth * 0.38, pageHeight - footerH, pageWidth * 0.02, footerH, 'F');
  pdf.setFillColor(BRAND_RED);
  pdf.rect(pageWidth * 0.40, pageHeight - footerH, pageWidth * 0.60, footerH, 'F');

  // Footer text
  pdf.setFontSize(8);
  pdf.setTextColor(120);
  pdf.text('This is a computer-generated report', pageWidth / 2, pageHeight - footerH - 4, { align: 'center' });

  return { headerH, footerH };
};

export const exportTableToPDF = async (tableId, fileName, title = '') => {
  try {
    const element = document.getElementById(tableId);
    if (!element) {
      throw new Error('Table element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 297; 
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    let position = 10;

   
    if (title) {
      pdf.setFontSize(16);
      pdf.text(title, pdf.internal.pageSize.getWidth() / 2, position, { align: 'center' });
      position += 10;
    }

   
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


export const exportToPDF = async (data, headers, fileName, lang = 'en', title = '') => {
  const isAr = lang === 'ar';
  
  try {
    const logoBase64 = await loadImageBase64(getPublicUrl('../../public/assets/Meega.jpg'));

    
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-pdf-export';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '1200px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.direction = isAr ? 'rtl' : 'ltr';
    
    
    let html = `
      <div style="font-family: Arial, sans-serif; direction: ${isAr ? 'rtl' : 'ltr'};">
        ${title ? `<h2 style="text-align: center; color: #000; margin-bottom: 16px;">${title}</h2>` : ''}
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #c00707; color: white;">
    `;
    
   
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
      </div>
    `;
    
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
   
    document.body.removeChild(tempDiv);
    
   
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

    const { headerH, footerH } = drawHeaderFooter({
      pdf,
      pageWidth: pdfWidth,
      pageHeight: pdfHeight,
      logoBase64,
    });

    const topMargin = headerH + 6;
    const bottomMargin = footerH + 6;
    const availableHeight = pdfHeight - topMargin - bottomMargin;
    let heightLeft = imgHeight;
    let yOffset = 0;

   
    pdf.addImage(imgData, 'PNG', 10, topMargin - yOffset, imgWidth, imgHeight);
    heightLeft -= availableHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      drawHeaderFooter({
        pdf,
        pageWidth: pdfWidth,
        pageHeight: pdfHeight,
        logoBase64,
      });
      yOffset += availableHeight;
      pdf.addImage(imgData, 'PNG', 10, topMargin - yOffset, imgWidth, imgHeight);
      heightLeft -= availableHeight;
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
