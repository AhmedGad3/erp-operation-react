import React, { useState, useContext } from 'react';
import { RefreshCw } from 'lucide-react';
import { LanguageContext } from '../../context/LanguageContext';
import ReportTabs from '../ReportTabs/ReportTabs';

import PurchasesReport        from '../Purchasesreport/Purchasesreport';
import SupplierPaymentsReport from '../Supplierpaymentsreport/Supplierpaymentsreport';
import ClientPaymentsReport   from '../Clientpaymentsreport/Clientpaymentsreport';
import StockMovementsReport   from '../Stockmovementsreport/Stockmovementsreport';
import SupplierLedgerReport   from '../Supplierledgerreport/Supplierledgerreport';
import ClientLedgerReport     from '../Clientledgerreport/Clientledgerreport';
import ExpensesReport         from '../Expensesreport/Expensesreport';
import ProfitsReport          from '../Profitsreport/Profitsreport';
import ProjectSummaryReport   from '../ProjectsSummary/ProjectsSummary';

const SESSION_KEY = 'reports_active_tab';

export default function ReportsPage() {
  const { lang } = useContext(LanguageContext);
  const isAr = lang === 'ar';

  // استرجع التاب المحفوظة من sessionStorage
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem(SESSION_KEY) || 'purchases & returns'
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // احفظ التاب كل ما تتغير
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem(SESSION_KEY, tab);
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const commonProps = { isAr, refreshKey };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isAr ? 'التقارير الشاملة' : 'Comprehensive Reports'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAr ? 'تقارير تفصيلية لجميع العمليات' : 'Detailed reports for all operations'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
          <ReportTabs activeTab={activeTab} setActiveTab={handleTabChange} isAr={isAr} />
        </div>

        {/* ── Tab Content ── */}
        {/* كل component بيتعمل مرة واحدة بس ومش بيتمسح لما تغير التاب */}

        <div style={{ display: activeTab === 'purchases & returns' ? 'block' : 'none' }}>
          <PurchasesReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'projects' ? 'block' : 'none' }}>
          <ProjectSummaryReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'stockMovements' ? 'block' : 'none' }}>
          <StockMovementsReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'supplierPayments' ? 'block' : 'none' }}>
          <SupplierPaymentsReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'clientPayments' ? 'block' : 'none' }}>
          <ClientPaymentsReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'supplierLedger' ? 'block' : 'none' }}>
          <SupplierLedgerReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'clientLedger' ? 'block' : 'none' }}>
          <ClientLedgerReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'expenses' ? 'block' : 'none' }}>
          <ExpensesReport {...commonProps} />
        </div>

        <div style={{ display: activeTab === 'profits' ? 'block' : 'none' }}>
          <ProfitsReport {...commonProps} />
        </div>

      </div>
    </div>
  );
}