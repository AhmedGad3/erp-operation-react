import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Shield, Mail,
  Calendar, Check, X, CheckCircle, ChevronUp, ChevronDown, MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import AdminActionModal from '../modals/AdminActionModal';

//  Sortable column header 
const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th
    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);

//  Status badge 
const StatusBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{'Active'}</span>;
};

//  Role badge 
const RoleBadge = ({ role, lang }) => {
  const map = {
    admin:      { label: { ar: '&د`ر',      en: 'Admin'     }, cls: 'bg-gray-100 text-gray-700' },
    accountant: { label: { ar: '&حاسب',     en: 'Accountant'}, cls: 'bg-gray-100 text-gray-700' },
    manager:    { label: { ar: '&د`ر س&',  en: 'Manager'   }, cls: 'bg-gray-100 text-gray-700' },
  };
  const cfg = map[role] ?? { label: { ar: role, en: role }, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      {lang === 'ar' ? cfg.label.ar : cfg.label.en}
    </span>
  );
};

//  Three-dots menu 
const ActionsMenu = ({ user, currentUser, lang, onEdit, onDelete, onActivate }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const ref = useRef();
  const btnRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 80; // زرار` 
      const spaceBelow = window.innerHeight - rect.bottom;

      const top = spaceBelow < menuHeight
        ? rect.top - menuHeight - 4
        : rect.bottom + 4;

      setMenuPos({ top, left: rect.right - 160 });
    }
    setOpen(o => !o);
  };

  const isSelf = user._id === currentUser?._id;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
        >
          <button
            onClick={() => { setOpen(false); onEdit(user); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Edit className="w-4 h-4" />
            {'Edit'}
          </button>

          {user.isActive === false && (
            <button
              onClick={() => { setOpen(false); onActivate(user); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <CheckCircle className="w-4 h-4" />
              {'Activate'}
            </button>
          )}

          {user.isActive !== false && !isSelf && (
            <button
              onClick={() => { setOpen(false); onDelete(user); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              {'Delete'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
//  Add User Modal 
const AddUserModal = ({ lang, onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', email: '', role: 'manager',  password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      setSubmitting(true);
      await axiosInstance.post('/create', form);
      toast.success('User created successfully');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Modal header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {'Add New User'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {'Full Name'}
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {'Email'}
            </label>
            <input
              type="email"
              placeholder="john@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
            />
          </div>

          {/* Role + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {'Role'}
              </label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
              >
                <option value="admin">{'Admin'}</option>
                <option value="accountant">{'Accountant'}</option>
                <option value="manager">{'Manager'}</option>
              </select>
            </div>
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {'Status'}
              </label>
              <select
                value={form.isActive ? 'active' : 'inactive'}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
              >
                <option value="active">{'Active'}</option>
                <option value="inactive">{'Inactive'}</option>
              </select>
            </div> */}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {'Password'}
            </label>
            <input
              type="password"
              placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            {'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
          >
            {'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
};

//  Confirm Modal 
const UsersList = () => {
  const { lang }  = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterRole,    setFilterRole]    = useState('ALL');
  const [filterStatus,  setFilterStatus]  = useState('ALL');
  const [sortField,     setSortField]     = useState('name');
  const [sortDir,       setSortDir]       = useState('asc');
  const [currentUser,   setCurrentUser]   = useState(null);
  const [addModal,      setAddModal]      = useState(false);
  const [deleteModal,   setDeleteModal]   = useState({ show: false, user: null });
  const [activateModal, setActivateModal] = useState({ show: false, user: null });

  useEffect(() => { checkUserRole(); fetchUsers(); }, []);

  const checkUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('userData') || '{}');
      setCurrentUser(user);
      if (user?.role && user.role !== 'admin') {
        toast.error('Access denied');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch { /* ignore */ }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : (res.data.result || []));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/user/${deleteModal.user._id}`);
      toast.success('User deleted');
      setDeleteModal({ show: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete user'));
    }
  };

  const handleActivate = async () => {
    try {
      await axiosInstance.patch(`/user/activate/${activateModal.user._id}`);
      toast.success('User activated');
      setActivateModal({ show: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to activate user'));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Filter + Sort
  const displayed = users
    .filter(u => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchRole   = filterRole   === 'ALL' || u.role === filterRole;
      const matchStatus = filterStatus === 'ALL'
        || (filterStatus === 'ACTIVE'   && u.isActive !== false)
        || (filterStatus === 'INACTIVE' && u.isActive === false);
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (sortField === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  if (loading) return <FullPageLoader text={'Loading users...'} />;
  if (currentUser?.role && currentUser.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/*  Page Header  */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {'User Management'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {'Manage your team members and their account permissions.'}
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {' Add User'}
          </button>
        </div>

        {/*  Filters  */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={'Search by name or email...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Role */}
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{'All Roles'}</option>
            <option value="admin">{'Admin'}</option>
            <option value="accountant">{'Accountant'}</option>
            <option value="manager">{'Manager'}</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{'All Status'}</option>
            <option value="ACTIVE">{'Active'}</option>
            <option value="INACTIVE">{'Inactive'}</option>
          </select>

          {(searchTerm || filterRole !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterRole('ALL'); setFilterStatus('ALL'); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              {'Clear'}
            </button>
          )}
        </div>

        {/*  Table  */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {'No users found'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={'Full Name'}       field="name"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Email'}           field="email"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Role'}             field="role"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Status'}          field="isActive"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Created'} field="createdAt" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50/60 transition">
                    {/* Avatar + Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {user.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">{user.email}</td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <RoleBadge role={user.role} lang={lang} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge isActive={user.isActive} lang={lang} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">{formatDate(user.createdAt)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <ActionsMenu
                        user={user}
                        currentUser={currentUser}
                        lang={lang}
                        onEdit={(u) => navigate(`/users/edit/${u._id}`)}
                        onDelete={(u) => setDeleteModal({ show: true, user: u })}
                        onActivate={(u) => setActivateModal({ show: true, user: u })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/*  Modals  */}
      {addModal && (
        <AddUserModal lang={lang} onClose={() => setAddModal(false)} onCreated={fetchUsers} />
      )}
      {deleteModal.show && (
        <AdminActionModal
          type="delete"
          lang={lang}
          entityLabelEn="user"
          entityLabelAr="\u0645\u0633\u062a\u062e\u062f\u0645"
          itemName={deleteModal.user?.name}
          itemSubtitle={deleteModal.user?.email}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ show: false, user: null })}
        />
      )}
      {activateModal.show && (
        <AdminActionModal
          type="activate"
          lang={lang}
          entityLabelEn="user"
          entityLabelAr="\u0645\u0633\u062a\u062e\u062f\u0645"
          itemName={activateModal.user?.name}
          itemSubtitle={activateModal.user?.email}
          onConfirm={handleActivate}
          onClose={() => setActivateModal({ show: false, user: null })}
        />
      )}
    </div>
  );
};

export default UsersList;

