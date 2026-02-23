import React from 'react';
import {
  ShoppingCart, DollarSign, CreditCard, Package,
  Warehouse, Receipt, TrendingDown, BarChart3
} from 'lucide-react';

const ReportTabs = ({ activeTab, setActiveTab, isAr }) => {
  const tabs = [
    { id: 'purchases',        nameAr: 'المشتريات',      nameEn: 'Purchases',         icon: ShoppingCart },
    { id: 'supplierPayments', nameAr: 'دفعات الموردين', nameEn: 'Supplier Payments', icon: DollarSign },
    { id: 'clientPayments',   nameAr: 'دفعات العملاء',  nameEn: 'Client Payments',   icon: CreditCard },
    { id: 'stockMovements',   nameAr: 'حركات المخزون',  nameEn: 'Stock Movements',   icon: Package },
    { id: 'supplierLedger',   nameAr: 'دفتر الموردين',  nameEn: 'Supplier Ledger',   icon: Warehouse },
    { id: 'clientLedger',     nameAr: 'دفتر العملاء',   nameEn: 'Client Ledger',     icon: Receipt },
    { id: 'expenses',         nameAr: 'المصاريف',       nameEn: 'Expenses',          icon: TrendingDown },
    { id: 'profits',          nameAr: 'الأرباح',        nameEn: 'Profits',           icon: BarChart3 },
  ];

  return (
    <div className="flex overflow-x-auto border-b border-gray-100">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
              isActive
                ? 'text-indigo-600 border-indigo-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {isAr ? tab.nameAr : tab.nameEn}
          </button>
        );
      })}
    </div>
  );
};

export default ReportTabs;