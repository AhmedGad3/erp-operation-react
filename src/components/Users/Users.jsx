import React, { useState, useEffect, useContext } from 'react';
import { Users, Search, Plus, Edit, Trash2, Shield, Mail, Calendar, AlertCircle, Check, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const UsersList = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, user: null });
  const [activateModal, setActivateModal] = useState({ show: false, user: null });

  useEffect(() => {
    checkUserRole();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole, filterStatus]);

  const checkUserRole = () => {
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
      const user = JSON.parse(userStr);
      
      
      setCurrentUser(user);
      
      if (user && user.role && user.role !== 'admin') {
        toast.error(lang === 'ar' ? 'ليس لديك صلاحية للوصول لهذه الصفحة' : 'You do not have permission to access this page');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/users');
      const usersData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setUsers(usersData);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'ALL') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(user => 
        filterStatus === 'ACTIVE' ? user.isActive !== false : user.isActive === false
      );
    }

    setFilteredUsers(filtered);
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;

    try {
      await axiosInstance.delete(`/user/${deleteModal.user._id}`);
      toast.success(lang === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully');
      setDeleteModal({ show: false, user: null });
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل حذف المستخدم' : 'Failed to delete user'));
    }
  };

  const handleActivate = async () => {
    if (!activateModal.user) return;

    try {
      await axiosInstance.patch(`/user/activate/${activateModal.user._id}`);
      toast.success(lang === 'ar' ? 'تم تفعيل المستخدم بنجاح' : 'User activated successfully');
      setActivateModal({ show: false, user: null });
      fetchUsers();
    } catch (error) {
      console.error('Activate user error:', error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل تفعيل المستخدم' : 'Failed to activate user'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'accountant':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'accountant':
        return '💼';
      case 'manager':
        return '📊';
      default:
        return '👤';
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل المستخدمين..." : "Loading users..."} />;
  }

  const hasAccess = !currentUser || currentUser.role === 'admin';
  
  if (currentUser && currentUser.role && currentUser.role !== 'admin') {
    return null;
  }

  const activeUsers = filteredUsers.filter(u => u.isActive !== false).length;
  const inactiveUsers = filteredUsers.filter(u => u.isActive === false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Toast */}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
                  </h1>
                  <p className="text-indigo-100 mt-1">
                    {lang === 'ar' ? 'عرض وإدارة جميع المستخدمين' : 'View and manage all users'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/users/create')}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة مستخدم' : 'Add User'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-indigo-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'مستخدمين نشطين' : 'Active Users'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'مستخدمين محذوفين' : 'Inactive Users'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveUsers}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === 'ar' ? 'كل الأدوار' : 'All Roles'}</option>
                <option value="admin">{lang === 'ar' ? 'مدير' : 'Admin'}</option>
                <option value="accountant">{lang === 'ar' ? 'محاسب' : 'Accountant'}</option>
                <option value="manager">{lang === 'ar' ? 'مدير قسم' : 'Manager'}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="INACTIVE">{lang === 'ar' ? 'محذوف' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || filterRole !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('ALL');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا يوجد مستخدمين' : 'No Users Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? 'لم يتم العثور على مستخدمين مطابقين للفلاتر المحددة' : 'No users match your current filters'}
              </p>
              <button
                onClick={() => navigate('/users/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة أول مستخدم' : 'Add First User'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المستخدم' : 'User'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الدور' : 'Role'}
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
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-lg">
                              {user.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleIcon(user.role)} {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive !== false ? (
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
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/users/edit/${user._id}`)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                            disabled={user._id === currentUser?._id}
                          >
                            <Edit className="w-4 h-4" />
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          {user.isActive !== false && user._id !== currentUser?._id && (
                            <button
                              onClick={() => setDeleteModal({ show: true, user })}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              {lang === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          )}
                          {user.isActive === false && (
                            <button
                              onClick={() => setActivateModal({ show: true, user })}
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
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المستخدم:' : 'User:'}</p>
              <p className="font-semibold text-gray-900">{deleteModal.user?.name}</p>
              <p className="text-sm text-gray-500">{deleteModal.user?.email}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, user: null })}
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
                  {lang === 'ar' ? 'هل أنت متأكد من تفعيل هذا المستخدم؟' : 'Are you sure you want to activate this user?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المستخدم:' : 'User:'}</p>
              <p className="font-semibold text-gray-900">{activateModal.user?.name}</p>
              <p className="text-sm text-gray-500">{activateModal.user?.email}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActivateModal({ show: false, user: null })}
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

export default UsersList;