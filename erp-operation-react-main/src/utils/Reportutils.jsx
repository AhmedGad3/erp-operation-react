// ─── Date helper ────────────────────────────────────────────
export const fmtDate = (iso) => {
  if (!iso) return '—';
  return iso.slice(0, 10);
};

// ─── Number formatter ───────────────────────────────────────
export const fmt = (n) =>
  n != null ? Number(n).toLocaleString('en-US') : '—';

// ─── Cell Renderer Helper ──────────────────────────────────
export const renderStatusCell = (val) => {
  const isComplete = val === 'مكتمل' || val === 'Paid';
  const isPending = val === 'قيد التنفيذ' || val === 'Pending';
  const isReturn = val === 'مرتجع' || val === 'Return';
  const isActive = val === 'نشط' || val === 'Active';
  const isInactive = val === 'غير نشط' || val === 'Inactive';

  if (isComplete || isActive)
    return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">{val}</span>;
  if (isPending)
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">{val}</span>;
  if (isReturn)
    return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">{val}</span>;
  if (isInactive)
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">{val}</span>;
  return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">{val}</span>;
};

export const renderMovementTypeCell = (val, typeRaw) => {
  const movementColors = {
    IN: 'blue',
    PROJECT_ISSUE: 'red',
    RETURN_OUT: 'orange',
    ADJUSTMENT_IN: 'green',
    ADJUSTMENT_OUT: 'purple',
  };
  const color = movementColors[typeRaw] || 'gray';
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
      {val}
    </span>
  );
};

export const renderLedgerTypeCell = (val, isAr) => {
  const map = {
    [isAr ? 'فاتورة شراء' : 'Purchase']: 'bg-blue-100 text-blue-800',
    [isAr ? 'دفعة' : 'Payment']: 'bg-green-100 text-green-800',
    [isAr ? 'مرتجع' : 'Return']: 'bg-orange-100 text-orange-800',
    [isAr ? 'استرداد' : 'Refund']: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[val] || 'bg-gray-100 text-gray-700'}`}>
      {val}
    </span>
  );
};

export const renderPaymentTypeCell = (val) => {
  const isRefund = val === 'استرداد' || val === 'Refund';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isRefund ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
      {val}
    </span>
  );
};

export const renderExpenseCell = (val, isAr) => {
  const colorMap = {
    [isAr ? 'مشتريات مواد' : 'Material Purchase']: 'bg-blue-100 text-blue-800',
    [isAr ? 'مرتجعات مواد' : 'Material Return']: 'bg-indigo-100 text-indigo-800',
    [isAr ? 'صرف مواد للمشروع' : 'Material Issue']: 'bg-cyan-100 text-cyan-800',
    [isAr ? 'دفعات الموردين' : 'Supplier Payment']: 'bg-emerald-100 text-emerald-800',
    [isAr ? 'استردادات من الموردين' : 'Supplier Refund']: 'bg-rose-100 text-rose-800',
    [isAr ? 'تكاليف عمالة' : 'Labor Costs']: 'bg-amber-100 text-amber-800',
    [isAr ? 'تكاليف معدات' : 'Equipment Costs']: 'bg-violet-100 text-violet-800',
    [isAr ? 'مصاريف أخرى للمشروع' : 'Other Project Costs']: 'bg-slate-100 text-slate-800',
    [isAr ? 'مواد' : 'Materials']: 'bg-blue-100 text-blue-800',
    [isAr ? 'مدفوعات' : 'Payments']: 'bg-emerald-100 text-emerald-800',
    [isAr ? 'استردادات' : 'Refunds']: 'bg-rose-100 text-rose-800',
    [isAr ? 'عمالة' : 'Labor']: 'bg-amber-100 text-amber-800',
    [isAr ? 'معدات' : 'Equipment']: 'bg-violet-100 text-violet-800',
    [isAr ? 'متنوعة' : 'Miscellaneous']: 'bg-slate-100 text-slate-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[val] || 'bg-gray-100 text-gray-700'}`}>
      {val}
    </span>
  );

  
};