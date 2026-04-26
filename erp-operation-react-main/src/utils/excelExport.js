import * as XLSX from 'xlsx';

export const exportToExcel = (data, headers, fileName, lang = 'en') => {
  if (!data || data.length === 0) {
    alert(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
    return;
  }
  
  // Extract header labels
  const headerLabels = headers.map(header => {
    const key = Object.keys(header)[0];
    return header[key];
  });
  
  // Extract header keys for data mapping
  const headerKeys = headers.map(header => Object.keys(header)[0]);
  
  // Prepare worksheet data
  const worksheetData = [headerLabels];
  
  data.forEach(row => {
    const rowData = headerKeys.map(key => {
      const value = row[key];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Return as is (numbers, strings, etc.)
      return value;
    });
    worksheetData.push(rowData);
  });
  
  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const colWidths = headerKeys.map((_, index) => {
    const maxLength = Math.max(
      headerLabels[index].length,
      ...data.map(row => {
        const val = row[headerKeys[index]];
        return val ? String(val).length : 0;
      })
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${date}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, fullFileName);
};

export const exportSupplierStatement = (supplier, invoices, payments, lang = 'en') => {
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
  
  // Add invoices
  invoices.forEach(inv => {
    runningBalance += inv.totalAmount;
    transactions.push({
      date: inv.invoiceDate,
      type: t.invoice,
      reference: inv.invoiceNumber,
      debit: inv.totalAmount,
      credit: 0,
      balance: runningBalance,
    });
  });
  
  // Add payments
  payments.forEach(pay => {
    runningBalance -= pay.amount;
    transactions.push({
      date: pay.paymentDate,
      type: t.payment,
      reference: pay.referenceNumber || '-',
      debit: 0,
      credit: pay.amount,
      balance: runningBalance,
    });
  });
  
  // Sort by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const headers = [
    { [t.date]: t.date },
    { [t.type]: t.type },
    { [t.reference]: t.reference },
    { [t.debit]: t.debit },
    { [t.credit]: t.credit },
    { [t.balance]: t.balance },
  ];
  
  exportToExcel(transactions, headers, `Supplier_Statement_${supplier.name.replace(/\s+/g, '_')}`, lang);
};

