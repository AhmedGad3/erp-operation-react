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

export default function ReportsPage() {
  const { lang } = useContext(LanguageContext);
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('purchases');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const renderActiveTab = () => {
    const commonProps = { isAr, refreshKey };
    
    switch (activeTab) {
      case 'purchases':
        return <PurchasesReport {...commonProps} />;
      case 'supplierPayments':
        return <SupplierPaymentsReport {...commonProps} />;
      case 'clientPayments':
        return <ClientPaymentsReport {...commonProps} />;
      case 'stockMovements':
        return <StockMovementsReport {...commonProps} />;
      case 'supplierLedger':
        return <SupplierLedgerReport {...commonProps} />;
      case 'clientLedger':
        return <ClientLedgerReport {...commonProps} />;
      case 'expenses':
        return <ExpensesReport {...commonProps} />;
      case 'profits':
        return <ProfitsReport {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex-1 min-w-0 py-8 px-4">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-white" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {isAr ? 'التقارير الشاملة' : 'Comprehensive Reports'}
                    </h1>
                    <p className="text-indigo-100 mt-1">
                      {isAr ? 'تقارير تفصيلية لجميع العمليات' : 'Detailed reports for all operations'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRefresh}
                  className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
                  title={isAr ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <ReportTabs activeTab={activeTab} setActiveTab={setActiveTab} isAr={isAr} />
          </div>

          {/* Active Tab Content */}
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}