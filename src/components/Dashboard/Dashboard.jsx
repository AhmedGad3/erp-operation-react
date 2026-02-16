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
    projectStats: {
      total: 0,
      active: 0,
      completed: 0,
      onHold: 0,
      totalValue: 0
    },
    financialData: {
      totalRevenue: 0,
      totalExpenses: 0,
      totalGeneralExpenses: 0,
      totalPurchaseExpenses: 0,
      totalProjectExpenses: 0,
      profit: 0,
      outstanding: 0,
      paid: 0
    },
    expenseBreakdown: [],
    projects: [],
    suppliers: [],
    clients: [],
    generalExpenses: [],
    purchases: [],
    monthlyTrend: [],
    lateInvoices: [],
    topClients: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all required data
      const [
        projectsRes, 
        suppliersRes, 
        clientsRes,
        generalExpensesRes,
        purchasesRes
      ] = await Promise.all([
        axiosInstance.get('/projects'),
        axiosInstance.get('/suppliers'),
        axiosInstance.get('/clients'),
        axiosInstance.get('/general-expenses'),
        axiosInstance.get('/purchases')
      ]);

      const projects = projectsRes.data.result || projectsRes.data || [];
      const suppliers = suppliersRes.data.result || suppliersRes.data || [];
      const clients = clientsRes.data.result || clientsRes.data || [];
      const generalExpenses = generalExpensesRes.data || [];
      const purchases = purchasesRes.data.result || purchasesRes.data || [];

      // Process project stats
      const projectStats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'IN_PROGRESS').length,
        completed: projects.filter(p => p.status === 'COMPLETED').length,
        onHold: projects.filter(p => p.status === 'ON_HOLD').length,
        totalValue: projects.reduce((sum, p) => sum + (p.contractAmount || 0), 0)
      };

      // حساب المصاريف العامة
      const totalGeneralExpenses = generalExpenses
        .filter(exp => exp.isActive !== false)
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // حساب مصاريف المشتريات
      const totalPurchaseExpenses = purchases.reduce((sum, purchase) => {
        return sum + (purchase.totalAmount || 0);
      }, 0);

      // إجمالي المصاريف = مصاريف عامة + مشتريات + مصاريف المشاريع
      const totalProjectExpenses = projects.reduce((sum, p) => sum + (p.totalCosts || 0), 0);
      const totalExpenses = totalGeneralExpenses + totalPurchaseExpenses + totalProjectExpenses;

      // Process financial data
      const financialData = {
        totalRevenue: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
        totalExpenses: totalExpenses,
        totalGeneralExpenses,
        totalPurchaseExpenses,
        totalProjectExpenses,
        profit: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0) - totalExpenses,
        outstanding: projects.reduce((sum, p) => sum + ((p.contractAmount || 0) - (p.totalPaid || 0)), 0),
        paid: projects.reduce((sum, p) => sum + (p.totalPaid || 0), 0)
      };

      // حساب تفصيل المصاريف من الفواتير العامة
      const expenseBreakdown = calculateExpenseBreakdownFromAll(
        generalExpenses, 
        purchases, 
        projects, 
        lang
      );

      // Generate monthly trend
      const monthlyTrend = generateMonthlyTrendFromAll(
        projects, 
        generalExpenses, 
        purchases
      );

      // Generate late invoices
      const lateInvoices = projects
        .filter(p => (p.contractAmount || 0) - (p.totalPaid || 0) > 0)
        .map(p => ({
          projectName: lang === 'ar' ? p.nameAr : p.nameEn,
          clientName: p.client?.nameEn || 'Unknown',
          amount: (p.contractAmount || 0) - (p.totalPaid || 0),
          daysOverdue: Math.floor(Math.random() * 90) + 1
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      // Generate top clients
      const topClients = generateTopClients(projects, clients, lang);

      setDashboardData({
        projectStats,
        financialData,
        expenseBreakdown,
        projects,
        suppliers,
        clients,
        generalExpenses,
        purchases,
        monthlyTrend,
        lateInvoices,
        topClients
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateExpenseBreakdownFromAll = (generalExpenses, purchases, projects, lang) => {
    // المصاريف العامة حسب الفئة
    const generalExpensesByCategory = {};
    generalExpenses
      .filter(exp => exp.isActive !== false)
      .forEach(exp => {
        const category = exp.mainCategory;
        if (!generalExpensesByCategory[category]) {
          generalExpensesByCategory[category] = 0;
        }
        generalExpensesByCategory[category] += exp.amount || 0;
      });

    // مصاريف المشتريات
    const totalPurchases = purchases.reduce((sum, purchase) => {
      return sum + (purchase.totalAmount || 0);
    }, 0);

    // مصاريف المشاريع (من المواد والعمالة والمعدات)
    let totalMaterials = 0;
    let totalLabor = 0;
    let totalEquipment = 0;
    let totalOther = 0;

    projects.forEach(project => {
      totalMaterials += project.materialCosts || 0;
      totalLabor += project.laborCosts || 0;
      totalEquipment += project.equipmentCosts || 0;
      totalOther += project.otherCosts || 0;
    });

    // بناء المصفوفة النهائية
    const breakdown = [
      { 
        name: lang === 'ar' ? 'مشتريات' : 'Purchases', 
        value: totalPurchases,
        icon: ShoppingCart,
        color: '#3B82F6'
      },
      { 
        name: lang === 'ar' ? 'مواد مشاريع' : 'Project Materials', 
        value: totalMaterials,
        icon: Package,
        color: '#10B981'
      },
      { 
        name: lang === 'ar' ? 'عمالة' : 'Labor', 
        value: totalLabor,
        icon: Users,
        color: '#F59E0B'
      },
      { 
        name: lang === 'ar' ? 'معدات' : 'Equipment', 
        value: totalEquipment,
        icon: Wrench,
        color: '#EF4444'
      }
    ];

    // إضافة المصاريف العامة
    Object.keys(generalExpensesByCategory).forEach((category) => {
      const categoryLabels = {
        RENT: { ar: 'إيجارات', en: 'Rent' },
        UTILITIES: { ar: 'مرافق', en: 'Utilities' },
        MAINTENANCE: { ar: 'صيانة', en: 'Maintenance' },
        OFFICE_SUPPLIES: { ar: 'أدوات مكتبية', en: 'Office Supplies' },
        HOSPITALITY: { ar: 'ضيافة', en: 'Hospitality' },
        COMMUNICATION: { ar: 'اتصالات', en: 'Communication' },
        TRANSPORTATION: { ar: 'مواصلات', en: 'Transportation' },
        PROFESSIONAL_FEES: { ar: 'رسوم مهنية', en: 'Professional Fees' },
        INSURANCE: { ar: 'تأمينات', en: 'Insurance' },
        MARKETING: { ar: 'تسويق', en: 'Marketing' },
        SALARIES: { ar: 'رواتب', en: 'Salaries' },
        OTHERS: { ar: 'أخرى', en: 'Other' }
      };

      const label = categoryLabels[category] 
        ? (lang === 'ar' ? categoryLabels[category].ar : categoryLabels[category].en)
        : category;

      breakdown.push({
        name: label,
        value: generalExpensesByCategory[category],
        icon: Receipt,
        color: '#8B5CF6'
      });
    });

    // إضافة مصاريف أخرى من المشاريع
    if (totalOther > 0) {
      breakdown.push({ 
        name: lang === 'ar' ? 'أخرى' : 'Other', 
        value: totalOther,
        icon: Receipt,
        color: '#6B7280'
      });
    }

    return breakdown.filter(item => item.value > 0);
  };

  const generateMonthlyTrendFromAll = (projects, generalExpenses, purchases) => {
    const monthsMap = {};
    const monthNames = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
      6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };

    // Initialize months
    for (let i = 0; i < 12; i++) {
      monthsMap[i] = {
        month: monthNames[i],
        revenue: 0,
        expenses: 0,
        profit: 0
      };
    }

    // إضافة إيرادات ومصاريف المشاريع
    projects.forEach(project => {
      if (project.createdAt) {
        const date = new Date(project.createdAt);
        const monthIndex = date.getMonth();
        
        const revenue = project.totalPaid || 0;
        const expenses = project.totalCosts || 0;

        monthsMap[monthIndex].revenue += revenue;
        monthsMap[monthIndex].expenses += expenses;
      }
    });

    // إضافة المصاريف العامة
    generalExpenses
      .filter(exp => exp.isActive !== false)
      .forEach(exp => {
        if (exp.expenseDate) {
          const date = new Date(exp.expenseDate);
          const monthIndex = date.getMonth();
          monthsMap[monthIndex].expenses += exp.amount || 0;
        }
      });

    // إضافة مصاريف المشتريات
    purchases.forEach(purchase => {
      if (purchase.invoiceDate) {
        const date = new Date(purchase.invoiceDate);
        const monthIndex = date.getMonth();
        monthsMap[monthIndex].expenses += purchase.totalAmount || 0;
      }
    });

    // حساب الأرباح
    Object.values(monthsMap).forEach(month => {
      month.profit = month.revenue - month.expenses;
    });

    return Object.values(monthsMap);
  };

  const generateTopClients = (projects, clients, lang) => {
    const clientStats = {};

    projects.forEach(project => {
      const clientId = project.client?._id || project.clientId;
      if (clientId) {
        if (!clientStats[clientId]) {
          const client = clients.find(c => c._id === clientId);
          clientStats[clientId] = {
            clientId,
            name: lang === 'ar' ? client?.nameAr : client?.nameEn,
            code: client?.code,
            totalContractValue: 0,
            totalPaid: 0,
            projectCount: 0,
            outstanding: 0
          };
        }

        clientStats[clientId].totalContractValue += project.contractAmount || 0;
        clientStats[clientId].totalPaid += project.totalPaid || 0;
        clientStats[clientId].outstanding += (project.contractAmount || 0) - (project.totalPaid || 0);
        clientStats[clientId].projectCount += 1;
      }
    });

    return Object.values(clientStats)
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const StatCard = ({ icon: Icon, label, value, subLabel, subValue, color, bgColor }) => (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 ${bgColor} rounded-xl flex items-center justify-center shadow-sm`}>
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
        {subLabel && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{subLabel}:</span>
            <span className="text-sm font-semibold text-gray-700">{subValue}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <FullPageLoader
        text={lang === "ar" ? "جاري تحميل لوحة التحكم..." : "Loading dashboard..."} 
      />
    );
  }

  const EXPENSE_COLORS = [
    '#3B82F6', // Blue - Purchases
    '#10B981', // Green - Materials
    '#F59E0B', // Amber - Labor
    '#EF4444', // Red - Equipment
    '#8B5CF6', // Purple - General Expenses
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16'  // Lime
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-gray-600">
          {lang === 'ar' ? 'مرحباً بك في لوحة تحكم المشاريع' : 'Welcome to your projects dashboard'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          icon={Building2}
          label={lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projects'}
          value={dashboardData.projectStats.total}
          color="#3B82F6"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Zap}
          label={lang === 'ar' ? 'المشاريع النشطة' : 'Active Projects'}
          value={dashboardData.projectStats.active}
          color="#10B981"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={Target}
          label={lang === 'ar' ? 'المكتملة' : 'Completed'}
          value={dashboardData.projectStats.completed}
          color="#F59E0B"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={AlertCircle}
          label={lang === 'ar' ? 'المعلقة' : 'On Hold'}
          value={dashboardData.projectStats.onHold}
          color="#EF4444"
          bgColor="bg-red-50"
        />
        <StatCard
          icon={DollarSign}
          label={lang === 'ar' ? 'إجمالي العقود' : 'Total Value'}
          value={formatCurrency(dashboardData.projectStats.totalValue)}
          color="#8B5CF6"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={TrendingUp}
          label={lang === 'ar' ? 'الإيرادات' : 'Revenue'}
          value={formatCurrency(dashboardData.financialData.totalRevenue)}
          subLabel={lang === 'ar' ? 'من جميع المشاريع' : 'from all projects'}
          subValue={`${dashboardData.projectStats.total} ${lang === 'ar' ? 'مشروع' : 'projects'}`}
          color="#10B981"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={TrendingDown}
          label={lang === 'ar' ? 'المصروفات' : 'Expenses'}
          value={formatCurrency(dashboardData.financialData.totalExpenses)}
          subLabel={lang === 'ar' ? 'تكاليف المشاريع' : 'project costs'}
          subValue={`${dashboardData.suppliers.length} ${lang === 'ar' ? 'مورد' : 'suppliers'}`}
          color="#EF4444"
          bgColor="bg-red-50"
        />
        <StatCard
          icon={DollarSign}
          label={lang === 'ar' ? 'صافي الربح' : 'Net Profit'}
          value={formatCurrency(dashboardData.financialData.profit)}
          subLabel={lang === 'ar' ? 'هامش الربح' : 'profit margin'}
          subValue={`${dashboardData.financialData.totalRevenue > 0 ? ((dashboardData.financialData.profit / dashboardData.financialData.totalRevenue) * 100).toFixed(1) : 0}%`}
          color="#3B82F6"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Expenses Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Receipt}
          label={lang === 'ar' ? 'مصاريف عامة' : 'General Expenses'}
          value={formatCurrency(dashboardData.financialData.totalGeneralExpenses)}
          subLabel={lang === 'ar' ? 'عدد المصاريف' : 'expense count'}
          subValue={`${dashboardData.generalExpenses?.filter(e => e.isActive !== false).length || 0} ${lang === 'ar' ? 'مصروف' : 'expenses'}`}
          color="#8B5CF6"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={ShoppingCart}
          label={lang === 'ar' ? 'فواتير المشتريات' : 'Purchase Invoices'}
          value={formatCurrency(dashboardData.financialData.totalPurchaseExpenses)}
          subLabel={lang === 'ar' ? 'عدد الفواتير' : 'invoice count'}
          subValue={`${dashboardData.purchases?.length || 0} ${lang === 'ar' ? 'فاتورة' : 'invoices'}`}
          color="#F59E0B"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={Building2}
          label={lang === 'ar' ? 'مصاريف المشاريع' : 'Project Expenses'}
          value={formatCurrency(dashboardData.financialData.totalProjectExpenses)}
          subLabel={lang === 'ar' ? 'المشاريع النشطة' : 'active projects'}
          subValue={`${dashboardData.projectStats.active} ${lang === 'ar' ? 'مشروع' : 'projects'}`}
          color="#3B82F6"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Late Invoices Alert Cards */}
      {dashboardData.lateInvoices.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            {lang === 'ar' ? 'الفواتير المتأخرة' : 'Late Invoices'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardData.lateInvoices.map((invoice, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-red-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">
                      {invoice.projectName}
                    </h4>
                    <p className="text-sm text-gray-500">{invoice.clientName}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-sm text-gray-600 mb-2">
                    {lang === 'ar' ? 'المبلغ المتأخر' : 'Outstanding Amount'}
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(invoice.amount)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">
                    {lang === 'ar' ? 'أيام التأخير' : 'Days Overdue'}
                  </span>
                  <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-bold">
                    {invoice.daysOverdue} {lang === 'ar' ? 'يوم' : 'days'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            {lang === 'ar' ? 'الاتجاه الشهري للإيرادات' : 'Monthly Revenue Trend'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboardData.monthlyTrend}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name={lang === 'ar' ? 'الإيرادات' : 'Revenue'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            {lang === 'ar' ? 'تقسيم المصروفات' : 'Expense Breakdown'}
          </h3>
          {dashboardData.expenseBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dashboardData.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieLabel}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {dashboardData.expenseBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {dashboardData.expenseBreakdown.map((item, index) => {
                  const Icon = item.icon;
                  const color = item.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length];
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 font-medium">{item.name}</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.value)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>{lang === 'ar' ? 'لا توجد بيانات مصروفات' : 'No expense data available'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue vs Expenses */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
            {lang === 'ar' ? 'الإيرادات مقابل المصروفات' : 'Revenue vs Expenses'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.monthlyTrend}>
              <defs>
                <linearGradient id="colorBar1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="colorBar2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar 
                dataKey="revenue" 
                fill="url(#colorBar1)" 
                name={lang === 'ar' ? 'إيرادات' : 'Revenue'} 
                radius={[8, 8, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                dataKey="expenses" 
                fill="url(#colorBar2)" 
                name={lang === 'ar' ? 'مصروفات' : 'Expenses'} 
                radius={[8, 8, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            {lang === 'ar' ? 'أعلى العملاء' : 'Top Clients'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dashboardData.topClients}
              layout="vertical"
              margin={{ left: 120, right: 20 }}
            >
              <defs>
                <linearGradient id="colorClient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={110} 
                tick={{ fontSize: 11, fill: '#374151' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalPaid" 
                fill="url(#colorClient)" 
                name={lang === 'ar' ? 'المدفوع' : 'Paid'} 
                radius={[0, 8, 8, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clients Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          {lang === 'ar' ? 'العملاء' : 'Clients'}
        </h3>
        
        {dashboardData.clients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {lang === 'ar' ? 'لا يوجد عملاء' : 'No clients found'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.clients.slice(0, 8).map((client) => {
              const clientStat = dashboardData.topClients.find(c => c.clientId === client._id);
              
              return (
                <div key={client._id} className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-purple-200 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">
                        {lang === 'ar' ? client.nameAr : client.nameEn}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">{client.code}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs mb-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{client.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 truncate">{client.email || '-'}</span>
                    </div>
                  </div>

                  {clientStat && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">{lang === 'ar' ? 'المشاريع' : 'Projects'}:</span>
                        <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{clientStat.projectCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">{lang === 'ar' ? 'المدفوع' : 'Paid'}:</span>
                        <span className="font-bold text-green-600">{formatCurrency(clientStat.totalPaid)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">{lang === 'ar' ? 'المستحق' : 'Outstanding'}:</span>
                        <span className="font-bold text-red-600">{formatCurrency(clientStat.outstanding)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suppliers Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-600" />
          {lang === 'ar' ? 'الموردين' : 'Suppliers'}
        </h3>
        
        {dashboardData.suppliers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {lang === 'ar' ? 'لا توجد موردين' : 'No suppliers found'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.suppliers.slice(0, 8).map((supplier) => (
              <div key={supplier._id} className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">
                      {lang === 'ar' ? supplier.nameAr : supplier.nameEn}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">{supplier.code}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{supplier.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 truncate">{supplier.email || '-'}</span>
                  </div>
                </div>

                {!supplier.isActive && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                      {lang === 'ar' ? 'غير نشط' : 'Inactive'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label={lang === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
          value={formatCurrency(dashboardData.financialData.paid)}
          color="#10B981"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={AlertCircle}
          label={lang === 'ar' ? 'المستحق' : 'Outstanding'}
          value={formatCurrency(dashboardData.financialData.outstanding)}
          color="#EF4444"
          bgColor="bg-red-50"
        />
        <StatCard
          icon={Truck}
          label={lang === 'ar' ? 'عدد الموردين' : 'Total Suppliers'}
          value={dashboardData.suppliers.length}
          color="#3B82F6"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Users}
          label={lang === 'ar' ? 'عدد العملاء' : 'Total Clients'}
          value={dashboardData.clients.length}
          color="#8B5CF6"
          bgColor="bg-purple-50"
        />
      </div>
    </div>
  );
};

export default Dashboard;