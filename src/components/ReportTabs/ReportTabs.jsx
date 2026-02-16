import React from 'react';
import {
  ShoppingCart, DollarSign, CreditCard, Package,
  Warehouse, Receipt, TrendingDown, BarChart3
} from 'lucide-react';

const ReportTabs = ({ activeTab, setActiveTab, isAr }) => {
  const tabs = [
    { id: 'purchases',         nameAr: 'المشتريات',           nameEn: 'Purchases',          icon: ShoppingCart },
    { id: 'supplierPayments',  nameAr: 'دفعات الموردين',      nameEn: 'Supplier Payments',  icon: DollarSign },
    { id: 'clientPayments',    nameAr: 'دفعات العملاء',       nameEn: 'Client Payments',    icon: CreditCard },
    { id: 'stockMovements',    nameAr: 'حركات المخزون',       nameEn: 'Stock Movements',    icon: Package },
    { id: 'supplierLedger',    nameAr: 'دفتر الموردين',       nameEn: 'Supplier Ledger',    icon: Warehouse },
    { id: 'clientLedger',      nameAr: 'دفتر العملاء',        nameEn: 'Client Ledger',      icon: Receipt },
    { id: 'expenses',          nameAr: 'المصاريف',            nameEn: 'Expenses',           icon: TrendingDown },
    { id: 'profits',           nameAr: 'الأرباح',             nameEn: 'Profits',            icon: BarChart3 },
  ];

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                isActive 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {isAr ? tab.nameAr : tab.nameEn}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReportTabs;