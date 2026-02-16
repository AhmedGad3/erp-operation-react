import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Users, Search, Plus, Edit, Trash2, Mail, Calendar, AlertCircle, Check, X, CheckCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import EditClientModal from '../EditClient/EditClient';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';

const ClientsList = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [deleteModal, setDeleteModal] = useState({ show: false, client: null });
  const [activateModal, setActivateModal] = useState({ show: false, client: null });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, filterStatus]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/clients');
      const clientsData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setClients(clientsData);
    } catch (error) {
      console.error('Fetch clients error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل العملاء' : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.nameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm) ||
        client.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(client => 
        filterStatus === 'ACTIVE' ? client.isActive !== false : client.isActive === false
      );
    }

    setFilteredClients(filtered);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.client) return;

    try {
      await axiosInstance.delete(`/clients/${deleteModal.client._id}`);
      toast.success(lang === 'ar' ? 'تم حذف العميل بنجاح' : 'Client deleted successfully');
      setDeleteModal({ show: false, client: null });
      fetchClients();
    } catch (error) {
      console.error('Delete client error:', error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل حذف العميل' : 'Failed to delete client'));
    }
  };

  const handleActivate = async () => {
    if (!activateModal.client) return;

    try {
      await axiosInstance.patch(`/clients/${activateModal.client._id}/activate`);
      toast.success(lang === 'ar' ? 'تم تفعيل العميل بنجاح' : 'Client activated successfully');
      setActivateModal({ show: false, client: null });
      fetchClients();
    } catch (error) {
      console.error('Activate client error:', error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل تفعيل العميل' : 'Failed to activate client'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExportExcel = () => {
    try {
      if (filteredClients.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
      }

      const data = filteredClients.map((c) => ({
        [lang === 'ar' ? 'الاسم' : 'Name']: lang === 'ar' ? c.nameAr : c.nameEn,
        [lang === 'ar' ? 'الكود' : 'Code']: c.code || '',
        [lang === 'ar' ? 'الهاتف' : 'Phone']: c.phone || '',
        [lang === 'ar' ? 'البريد الإلكتروني' : 'Email']: c.email || '',
        [lang === 'ar' ? 'العنوان' : 'Address']: c.address || '',
        [lang === 'ar' ? 'رقم التعريف الضريبي' : 'Tax Number']: c.taxNumber || '',
        [lang === 'ar' ? 'السجل التجاري' : 'Commercial Register']: c.commercialRegister || '',
        [lang === 'ar' ? 'الحالة' : 'Status']: c.isActive ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'محذوف' : 'Inactive'),
        [lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At']: formatDate(c.createdAt),
      }));

      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));
      
      exportToExcel(data, headers, lang === 'ar' ? 'قائمة_العملاء' : 'Clients_List', lang);
      
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل العملاء..." : "Loading clients..."} />;
  }

  const activeClients = filteredClients.filter(c => c.isActive !== false).length;
  const inactiveClients = filteredClients.filter(c => c.isActive === false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'إدارة العملاء' : 'Client Management'}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === 'ar' ? 'عرض وإدارة جميع العملاء' : 'View and manage all clients'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  {lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button
                  onClick={() => navigate('/clients/create')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  {lang === 'ar' ? 'إضافة عميل' : 'Add Client'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي العملاء' : 'Total Clients'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredClients.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'عملاء نشطين' : 'Active Clients'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'عملاء محذوفين' : 'Inactive Clients'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveClients}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد أو الكود...' : 'Search by name, email or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="INACTIVE">{lang === 'ar' ? 'محذوف' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا يوجد عملاء' : 'No Clients Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? 'لم يتم العثور على عملاء مطابقين للفلاتر المحددة' : 'No clients match your current filters'}
              </p>
              <button
                onClick={() => navigate('/clients/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة أول عميل' : 'Add First Client'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'العميل' : 'Client'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الكود' : 'Code'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الهاتف' : 'Phone'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {(lang === 'ar' ? client.nameAr : client.nameEn)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === 'ar' ? client.nameAr : client.nameEn}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="w-3 h-3" />
                              {client.email || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {client.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {client.phone || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {client.isActive !== false ? (
                          <span className="flex items-center gap-2 text-green-600 font-semibold">
                            <Check className="w-4 h-4" />
                            {lang === 'ar' ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-600 font-semibold">
                            <X className="w-4 h-4" />
                            {lang === 'ar' ? 'محذوف' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(client.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(client)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          {client.isActive !== false && (
                            <button
                              onClick={() => setDeleteModal({ show: true, client })}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              {lang === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          )}
                          {client.isActive === false && (
                            <button
                              onClick={() => setActivateModal({ show: true, client })}
                              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {lang === 'ar' ? 'تفعيل' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }}
          fetchClients={fetchClients}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this client?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'العميل:' : 'Client:'}</p>
              <p className="font-semibold text-gray-900">{lang === 'ar' ? deleteModal.client?.nameAr : deleteModal.client?.nameEn}</p>
              <p className="text-sm text-gray-500">{deleteModal.client?.email}</p>
              <p className="text-sm text-gray-500">{lang === 'ar' ? 'الكود: ' : 'Code: '}{deleteModal.client?.code}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, client: null })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Confirmation Modal */}
      {activateModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === 'ar' ? 'تأكيد التفعيل' : 'Confirm Activation'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? 'هل أنت متأكد من تفعيل هذا العميل؟' : 'Are you sure you want to activate this client?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'العميل:' : 'Client:'}</p>
              <p className="font-semibold text-gray-900">{lang === 'ar' ? activateModal.client?.nameAr : activateModal.client?.nameEn}</p>
              <p className="text-sm text-gray-500">{activateModal.client?.email}</p>
              <p className="text-sm text-gray-500">{lang === 'ar' ? 'الكود: ' : 'Code: '}{activateModal.client?.code}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActivateModal({ show: false, client: null })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleActivate}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                {lang === 'ar' ? 'تفعيل' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;