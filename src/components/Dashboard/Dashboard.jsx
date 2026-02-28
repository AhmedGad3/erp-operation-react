import React, { useState, useEffect, useContext } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Building2, DollarSign, AlertCircle, Zap, Target, Clock, Package, Truck, ShoppingCart, Wrench, Receipt } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { LanguageContext } from '../../context/LanguageContext';
import FullPageLoader from '../Loader/Loader';

const Dashboard = () => {
  const { lang, t } = useContext(LanguageContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    projectStats: { total: 0, active: 0, completed: 0, onHold: 0, totalValue: 0 },
    financialData: {
      totalRevenue: 0, totalExpenses: 0, totalGeneralExpenses: 0,
      totalPurchaseExpenses: 0, totalProjectExpenses: 0, profit: 0, outstanding: 0, paid: 0
    },
    expenseBreakdown: [],
    projects: [], suppliers: [], clients: [],
    generalExpenses: [], purchases: [],
    monthlyTrend: [], lateInvoices: [], topClients: []
  });

  useEffect(() => { fetchDashboardData(); }, []);

  const normalizeApiList = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (Array.isArray(responseData?.result)) return responseData.result;
    if (Array.isArray(responseData?.data)) return responseData.data;
    return [];
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projectsRes, suppliersRes, clientsRes, generalExpensesRes, purchasesRes] = await Promise.allSettled([
        axiosInstance.get('/projects'),
        axiosInstance.get('/suppliers'),
        axiosInstance.get('/clients'),
        axiosInstance.get('/general-expenses'),
        axiosInstance.get('/purchases')
      ]);

      const projects = projectsRes.status === "fulfilled"
        ? normalizeApiList(projectsRes.value?.data)
        : [];
      const suppliers = suppliersRes.status === "fulfilled"
        ? normalizeApiList(suppliersRes.value?.data)
        : [];
      const clients = clientsRes.status === "fulfilled"
        ? normalizeApiList(clientsRes.value?.data)
        : [];
      const generalExpenses = generalExpensesRes.status === "fulfilled"
        ? normalizeApiList(generalExpensesRes.value?.data)
        : [];
      const purchases = purchasesRes.status === "fulfilled"
        ? normalizeApiList(purchasesRes.value?.data)
        : [];

      const projectStats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'IN_PROGRESS').length,
        completed: projects.filter(p => p.status === 'COMPLETED').length,
        onHold: projects.filter(p => p.status === 'ON_HOLD').length,
        totalValue: projects.reduce((sum, p) => sum + (p.contractAmount || 0), 0)
      };

      const totalGeneralExpenses = generalExpenses.filter(exp => exp.isActive !== false).reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalPurchaseExpenses = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalProjectExpenses = projects.reduce((sum, p) => sum + (p.totalCosts || 0), 0);
      const totalExpenses = totalGeneralExpenses + totalPurchaseExpenses + totalProjectExpenses;

      const financialData = {
        totalRevenue: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
        totalExpenses,
        totalGeneralExpenses,
        totalPurchaseExpenses,
        totalProjectExpenses,
        profit: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0) - totalExpenses,
        outstanding: projects.reduce((sum, p) => sum + ((p.contractAmount || 0) - (p.totalPaid || 0)), 0),
        paid: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0)
      };

      const expenseBreakdown = calculateExpenseBreakdownFromAll(generalExpenses, purchases, projects, lang);
      const monthlyTrend = generateMonthlyTrendFromAll(projects, generalExpenses, purchases);

      const today = new Date();
      const lateInvoices = projects
        .filter(p => {
          const outstanding = (p.contractAmount || 0) - (p.totalPaid || 0);
          const expectedEnd = p.expectedEndDate ? new Date(p.expectedEndDate) : null;
          return outstanding > 0 && expectedEnd && expectedEnd < today;
        })
        .map(p => ({
          projectName: lang === 'ar' ? p.nameAr : p.nameEn,
          clientName: p.client?.nameEn || 'Unknown',
          amount: (p.contractAmount || 0) - (p.totalPaid || 0),
          daysOverdue: Math.floor((today - new Date(p.expectedEndDate)) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      const topClients = generateTopClients(projects, clients, lang);

      setDashboardData({ projectStats, financialData, expenseBreakdown, projects, suppliers, clients, generalExpenses, purchases, monthlyTrend, lateInvoices, topClients });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExpenseBreakdownFromAll = (generalExpenses, purchases, projects, lang) => {
    const generalExpensesByCategory = {};
    generalExpenses.filter(exp => exp.isActive !== false).forEach(exp => {
      const category = exp.mainCategory;
      if (!generalExpensesByCategory[category]) generalExpensesByCategory[category] = 0;
      generalExpensesByCategory[category] += exp.amount || 0;
    });
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    let totalMaterials = 0, totalLabor = 0, totalEquipment = 0, totalOther = 0;
    projects.forEach(p => {
      totalMaterials += p.materialCosts || 0;
      totalLabor += p.laborCosts || 0;
      totalEquipment += p.equipmentCosts || 0;
      totalOther += p.otherCosts || 0;
    });
    const breakdown = [
      { name: lang === 'ar' ? 'مشتريات' : 'Purchases', value: totalPurchases, icon: ShoppingCart, color: '#3B82F6' },
      { name: lang === 'ar' ? 'مواد مشاريع' : 'Project Materials', value: totalMaterials, icon: Package, color: '#10B981' },
      { name: lang === 'ar' ? 'عمالة' : 'Labor', value: totalLabor, icon: Users, color: '#F59E0B' },
      { name: lang === 'ar' ? 'معدات' : 'Equipment', value: totalEquipment, icon: Wrench, color: '#EF4444' }
    ];
    const categoryLabels = {
      RENT: { ar: 'إيجارات', en: 'Rent' }, UTILITIES: { ar: 'مرافق', en: 'Utilities' },
      MAINTENANCE: { ar: 'صيانة', en: 'Maintenance' }, OFFICE_SUPPLIES: { ar: 'أدوات مكتبية', en: 'Office Supplies' },
      HOSPITALITY: { ar: 'ضيافة', en: 'Hospitality' }, COMMUNICATION: { ar: 'اتصالات', en: 'Communication' },
      TRANSPORTATION: { ar: 'مواصلات', en: 'Transportation' }, PROFESSIONAL_FEES: { ar: 'رسوم مهنية', en: 'Professional Fees' },
      INSURANCE: { ar: 'تأمينات', en: 'Insurance' }, MARKETING: { ar: 'تسويق', en: 'Marketing' },
      SALARIES: { ar: 'رواتب', en: 'Salaries' }, OTHERS: { ar: 'أخرى', en: 'Other' }
    };
    Object.keys(generalExpensesByCategory).forEach(category => {
      const label = categoryLabels[category]
        ? (lang === 'ar' ? categoryLabels[category].ar : categoryLabels[category].en)
        : category;
      breakdown.push({ name: label, value: generalExpensesByCategory[category], icon: Receipt, color: '#8B5CF6' });
    });
    if (totalOther > 0) breakdown.push({ name: lang === 'ar' ? 'أخرى' : 'Other', value: totalOther, icon: Receipt, color: '#6B7280' });
    return breakdown.filter(item => item.value > 0);
  };

  const generateMonthlyTrendFromAll = (projects, generalExpenses, purchases) => {
    const monthNames = { 0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec' };
    const monthsMap = {};
    for (let i = 0; i < 12; i++) monthsMap[i] = { month: monthNames[i], revenue: 0, expenses: 0, profit: 0 };
    projects.forEach(p => {
      if (p.createdAt) {
        const idx = new Date(p.createdAt).getMonth();
        monthsMap[idx].revenue += p.totalPaid || 0;
        monthsMap[idx].expenses += p.totalCosts || 0;
      }
    });
    generalExpenses.filter(e => e.isActive !== false).forEach(e => {
      if (e.expenseDate) monthsMap[new Date(e.expenseDate).getMonth()].expenses += e.amount || 0;
    });
    purchases.forEach(p => {
      if (p.invoiceDate) monthsMap[new Date(p.invoiceDate).getMonth()].expenses += p.totalAmount || 0;
    });
    Object.values(monthsMap).forEach(m => { m.profit = m.revenue - m.expenses; });
    return Object.values(monthsMap);
  };

  const generateTopClients = (projects, clients, lang) => {
    const clientStats = {};
    projects.forEach(p => {
      const clientId = p.client?._id || p.clientId;
      if (clientId) {
        if (!clientStats[clientId]) {
          const client = clients.find(c => c._id === clientId);
          clientStats[clientId] = { clientId, name: lang === 'ar' ? client?.nameAr : client?.nameEn, code: client?.code, totalContractValue: 0, totalPaid: 0, projectCount: 0, outstanding: 0 };
        }
        clientStats[clientId].totalContractValue += p.contractAmount || 0;
        clientStats[clientId].totalPaid += p.totalPaid || 0;
        clientStats[clientId].outstanding += (p.contractAmount || 0) - (p.totalPaid || 0);
        clientStats[clientId].projectCount += 1;
      }
    });
    return Object.values(clientStats).sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 5);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  // ── Stat Card ──────────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value, subLabel, subValue, color, bgColor }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900 mb-1 break-all">{value}</h3>
        {subLabel && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">{subLabel}:</span>
            <span className="text-xs font-semibold text-gray-700">{subValue}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل لوحة التحكم...' : 'Loading dashboard...'} />;
  }

  const EXPENSE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1','#84CC16'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-200 max-w-[200px]">
          <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-500">{entry.name}:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="600">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto">

        {/* ── Page Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'ar' ? 'مرحباً بك في لوحة تحكم المشاريع' : 'Welcome to your projects dashboard'}
          </p>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={Building2} label={lang === 'ar' ? 'إجمالي المشاريع'  : 'Total Projects'}  value={dashboardData.projectStats.total}                        color="#3B82F6" bgColor="bg-blue-50"   />
          <StatCard icon={Zap}       label={lang === 'ar' ? 'المشاريع النشطة'  : 'Active Projects'} value={dashboardData.projectStats.active}                       color="#10B981" bgColor="bg-green-50"  />
          <StatCard icon={Target}    label={lang === 'ar' ? 'المكتملة'          : 'Completed'}       value={dashboardData.projectStats.completed}                    color="#F59E0B" bgColor="bg-amber-50"  />
          <StatCard icon={AlertCircle} label={lang === 'ar' ? 'المعلقة'         : 'On Hold'}         value={dashboardData.projectStats.onHold}                       color="#EF4444" bgColor="bg-red-50"    />
          <StatCard icon={DollarSign} label={lang === 'ar' ? 'إجمالي العقود'   : 'Total Value'}     value={formatCurrency(dashboardData.projectStats.totalValue)}   color="#8B5CF6" bgColor="bg-purple-50" />
        </div>

        {/* ── Financial Overview ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard icon={TrendingUp}   label={lang === 'ar' ? 'الإيرادات'    : 'Revenue'}     value={formatCurrency(dashboardData.financialData.totalRevenue)} subLabel={lang === 'ar' ? 'من جميع المشاريع' : 'from all projects'} subValue={`${dashboardData.projectStats.total} ${lang === 'ar' ? 'مشروع' : 'projects'}`}     color="#10B981" bgColor="bg-green-50"  />
          <StatCard icon={TrendingDown} label={lang === 'ar' ? 'المصروفات'   : 'Expenses'}    value={formatCurrency(dashboardData.financialData.totalExpenses)} subLabel={lang === 'ar' ? 'تكاليف المشاريع' : 'project costs'}     subValue={`${dashboardData.suppliers.length} ${lang === 'ar' ? 'مورد' : 'suppliers'}`}           color="#EF4444" bgColor="bg-red-50"    />
          <StatCard icon={DollarSign}   label={lang === 'ar' ? 'صافي الربح'  : 'Net Profit'}  value={formatCurrency(dashboardData.financialData.profit)}         subLabel={lang === 'ar' ? 'هامش الربح' : 'profit margin'}           subValue={`${dashboardData.financialData.totalRevenue > 0 ? ((dashboardData.financialData.profit / dashboardData.financialData.totalRevenue) * 100).toFixed(1) : 0}%`} color="#3B82F6" bgColor="bg-blue-50"   />
        </div>

        {/* ── Expense Breakdown Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Receipt}      label={lang === 'ar' ? 'مصاريف عامة'          : 'General Expenses'}    value={formatCurrency(dashboardData.financialData.totalGeneralExpenses)}  subLabel={lang === 'ar' ? 'عدد المصاريف' : 'expense count'} subValue={`${dashboardData.generalExpenses?.filter(e => e.isActive !== false).length || 0} ${lang === 'ar' ? 'مصروف' : 'expenses'}`} color="#8B5CF6" bgColor="bg-purple-50" />
          <StatCard icon={ShoppingCart} label={lang === 'ar' ? 'فواتير المشتريات'     : 'Purchase Invoices'}   value={formatCurrency(dashboardData.financialData.totalPurchaseExpenses)} subLabel={lang === 'ar' ? 'عدد الفواتير' : 'invoice count'} subValue={`${dashboardData.purchases?.length || 0} ${lang === 'ar' ? 'فاتورة' : 'invoices'}`}                                                                    color="#F59E0B" bgColor="bg-amber-50"  />
          <StatCard icon={Building2}    label={lang === 'ar' ? 'مصاريف المشاريع'      : 'Project Expenses'}    value={formatCurrency(dashboardData.financialData.totalProjectExpenses)}  subLabel={lang === 'ar' ? 'المشاريع النشطة' : 'active projects'} subValue={`${dashboardData.projectStats.active} ${lang === 'ar' ? 'مشروع' : 'projects'}`}                                                          color="#3B82F6" bgColor="bg-blue-50"   />
        </div>

        {/* ── Late Invoices ── */}
        {dashboardData.lateInvoices.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              {lang === 'ar' ? 'الفواتير المتأخرة' : 'Late Invoices'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.lateInvoices.map((invoice, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{invoice.projectName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{invoice.clientName}</p>
                    </div>
                    <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
                      <Clock className="w-4 h-4 text-red-500" />
                    </div>
                  </div>
                  <div className="mb-3 pb-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'المبلغ المتأخر' : 'Outstanding Amount'}</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(invoice.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{lang === 'ar' ? 'أيام التأخير' : 'Days Overdue'}</span>
                    <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                      {invoice.daysOverdue} {lang === 'ar' ? 'يوم' : 'days'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Charts Row 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Monthly Trend */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              {lang === 'ar' ? 'الاتجاه الشهري للإيرادات' : 'Monthly Revenue Trend'}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dashboardData.monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name={lang === 'ar' ? 'الإيرادات' : 'Revenue'} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown Pie */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              {lang === 'ar' ? 'تقسيم المصروفات' : 'Expense Breakdown'}
            </h3>
            {dashboardData.expenseBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dashboardData.expenseBreakdown} cx="50%" cy="50%" labelLine={false} label={CustomPieLabel} outerRadius={85} innerRadius={50} dataKey="value" paddingAngle={2}>
                      {dashboardData.expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {dashboardData.expenseBreakdown.map((item, index) => {
                    const Icon = item.icon;
                    const color = item.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length];
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 truncate">{item.name}</p>
                          <p className="text-xs font-bold text-gray-900">{formatCurrency(item.value)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                <p>{lang === 'ar' ? 'لا توجد بيانات مصروفات' : 'No expense data available'}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Charts Row 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Revenue vs Expenses */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-500" />
              {lang === 'ar' ? 'الإيرادات مقابل المصروفات' : 'Revenue vs Expenses'}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboardData.monthlyTrend}>
                <defs>
                  <linearGradient id="colorBar1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="colorBar2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                <Bar dataKey="revenue"  fill="url(#colorBar1)" name={lang === 'ar' ? 'إيرادات' : 'Revenue'}  radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expenses" fill="url(#colorBar2)" name={lang === 'ar' ? 'مصروفات' : 'Expenses'} radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Clients */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              {lang === 'ar' ? 'أعلى العملاء' : 'Top Clients'}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboardData.topClients} layout="vertical" margin={{ left: 90, right: 10 }}>
                <defs>
                  <linearGradient id="colorClient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 10, fill: '#374151' }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalPaid" fill="url(#colorClient)" name={lang === 'ar' ? 'المدفوع' : 'Paid'} radius={[0, 6, 6, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Clients ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            {lang === 'ar' ? 'العملاء' : 'Clients'}
          </h3>
          {dashboardData.clients.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">{lang === 'ar' ? 'لا يوجد عملاء' : 'No clients found'}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dashboardData.clients.slice(0, 8).map((client) => {
                const clientStat = dashboardData.topClients.find(c => c.clientId === client._id);
                return (
                  <div key={client._id} className="border border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{lang === 'ar' ? client.nameAr : client.nameEn}</h4>
                        <p className="text-xs text-gray-500">{client.code}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs mb-3 pb-3 border-b border-gray-100">
                      <p className="text-gray-500">{client.phone || '-'}</p>
                      <p className="text-gray-500 truncate">{client.email || '-'}</p>
                    </div>
                    {clientStat && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{lang === 'ar' ? 'المشاريع' : 'Projects'}:</span>
                          <span className="font-semibold text-gray-900">{clientStat.projectCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{lang === 'ar' ? 'المدفوع' : 'Paid'}:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(clientStat.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{lang === 'ar' ? 'المستحق' : 'Outstanding'}:</span>
                          <span className="font-semibold text-red-500">{formatCurrency(clientStat.outstanding)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Suppliers ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />
            {lang === 'ar' ? 'الموردين' : 'Suppliers'}
          </h3>
          {dashboardData.suppliers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">{lang === 'ar' ? 'لا توجد موردين' : 'No suppliers found'}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dashboardData.suppliers.slice(0, 8).map((supplier) => (
                <div key={supplier._id} className="border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{lang === 'ar' ? supplier.nameAr : supplier.nameEn}</h4>
                      <p className="text-xs text-gray-500">{supplier.code}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-500">{supplier.phone || '-'}</p>
                    <p className="text-gray-500 truncate">{supplier.email || '-'}</p>
                  </div>
                  {!supplier.isActive && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        {lang === 'ar' ? 'غير نشط' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign}   label={lang === 'ar' ? 'المبلغ المدفوع'  : 'Amount Paid'}      value={formatCurrency(dashboardData.financialData.paid)}        color="#10B981" bgColor="bg-green-50"  />
          <StatCard icon={AlertCircle}  label={lang === 'ar' ? 'المستحق'          : 'Outstanding'}      value={formatCurrency(dashboardData.financialData.outstanding)} color="#EF4444" bgColor="bg-red-50"    />
          <StatCard icon={Truck}        label={lang === 'ar' ? 'عدد الموردين'     : 'Total Suppliers'}  value={dashboardData.suppliers.length}                          color="#3B82F6" bgColor="bg-blue-50"   />
          <StatCard icon={Users}        label={lang === 'ar' ? 'عدد العملاء'      : 'Total Clients'}    value={dashboardData.clients.length}                            color="#8B5CF6" bgColor="bg-purple-50" />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
