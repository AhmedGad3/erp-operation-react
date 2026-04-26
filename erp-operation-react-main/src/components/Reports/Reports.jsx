import React, { useState, useContext } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { LanguageContext } from '../../context/LanguageContext';
import ReportTabs from '../ReportTabs/ReportTabs';

// Lazy import for each tab component
import PurchasesReport from '../Purchasesreport/Purchasesreport';
import SupplierPaymentsReport from '../Supplierpaymentsreport/Supplierpaymentsreport';
import ClientPaymentsReport from '../Clientpaymentsreport/Clientpaymentsreport';
import StockMovementsReport from '../Stockmovementsreport/Stockmovementsreport';
import SupplierLedgerReport from '../Supplierledgerreport/Supplierledgerreport';
import ClientLedgerReport from '../Clientledgerreport/Clientledgerreport';
import ExpensesReport from '../Expensesreport/Expensesreport';
import ProfitsReport from '../Profitsreport/Profitsreport';
import ProjectSummaryReport from '../ProjectsSummary/ProjectsSummary';

export default function ReportsPage() {
  const { lang } = useContext(LanguageContext);
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('purchases');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const renderActiveTab = () => {
    const commonProps = { isAr, refreshKey };
    switch (activeTab) {
      case 'purchases & returns':        return <PurchasesReport {...commonProps} />;
      case 'projects':         return <ProjectSummaryReport {...commonProps} />;
      case 'stockMovements':   return <StockMovementsReport {...commonProps} />;
      case 'supplierPayments': return <SupplierPaymentsReport {...commonProps} />;
      case 'clientPayments':   return <ClientPaymentsReport {...commonProps} />;
      case 'supplierLedger':   return <SupplierLedgerReport {...commonProps} />;
      case 'clientLedger':     return <ClientLedgerReport {...commonProps} />;
      case 'expenses':         return <ExpensesReport {...commonProps} />;
      case 'profits':          return <ProfitsReport {...commonProps} />;
      default:                 return <PurchasesReport {...commonProps} />;
    }
  };

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
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
        </div>

        {/* ── Tabs + Content ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
          <ReportTabs activeTab={activeTab} setActiveTab={setActiveTab} isAr={isAr} />
        </div>

        {/* ── Active Tab Content ── */}
        {renderActiveTab()}

      </div>
    </div>
  );
}