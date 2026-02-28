import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Download,
  CheckCircle, ChevronUp, ChevronDown, MoreHorizontal, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import EditClientModal from '../EditClient/EditClient';
import { exportToExcel } from '../../utils/excelExport';
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

//  Three-dots menu 
const ActionsMenu = ({ client, lang, onEdit, onDelete, onActivate }) => {
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
            onClick={() => { setOpen(false); onEdit(client); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Edit className="w-4 h-4" />
            {'Edit'}
          </button>

          {client.isActive === false && (
            <button
              onClick={() => { setOpen(false); onActivate(client); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <CheckCircle className="w-4 h-4" />
              {'Activate'}
            </button>
          )}

          {client.isActive !== false && (
            <button
              onClick={() => { setOpen(false); onDelete(client); }}
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
//  Confirm Modal (shared for delete + activate) 
const ClientsList = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [clients,        setClients]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('ALL');
  const [sortField,      setSortField]      = useState('nameEn');
  const [sortDir,        setSortDir]        = useState('asc');
  const [deleteModal,    setDeleteModal]    = useState({ show: false, client: null });
  const [activateModal,  setActivateModal]  = useState({ show: false, client: null });
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [editingClient,  setEditingClient]  = useState(null);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/clients');
      setClients(Array.isArray(response.data) ? response.data : (response.data.result || []));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load clients'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client) => { setEditingClient(client); setShowEditModal(true); };

  const handleDelete = async () => {
    if (!deleteModal.client) return;
    try {
      await axiosInstance.delete(`/clients/${deleteModal.client._id}`);
      toast.success('Client deleted successfully');
      setDeleteModal({ show: false, client: null });
      fetchClients();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete client'));
    }
  };

  const handleActivate = async () => {
    if (!activateModal.client) return;
    try {
      await axiosInstance.patch(`/clients/${activateModal.client._id}/activate`);
      toast.success('Client activated successfully');
      setActivateModal({ show: false, client: null });
      fetchClients();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to activate client'));
    }
  };

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleExportExcel = () => {
    if (displayed.length === 0) { toast.error('No data to export'); return; }
    const data = displayed.map(c => ({
      ['Name']:                lang === 'ar' ? c.nameAr : c.nameEn,
      ['Code']:                c.code || '',
      ['Phone']:               c.phone || '',
      ['Email']:               c.email || '',
      ['Address']:              c.address || '',
      ['Tax Number']:           c.taxNumber || '',
      ['Commercial Register']:  c.commercialRegister || '',
      ['Status']:               c.isActive ? ('Active') : ('Inactive'),
      ['Created At']:           formatDate(c.createdAt),
    }));
    exportToExcel(data, Object.keys(data[0]).map(k => ({ [k]: k })), 'Clients_List', lang);
    toast.success('Exported successfully');
  };

  // Filter + Sort
  const displayed = clients
    .filter(c => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        c.nameAr?.toLowerCase().includes(q) ||
        c.nameEn?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(searchTerm) ||
        c.code?.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL'
        || (filterStatus === 'ACTIVE'   && c.isActive !== false)
        || (filterStatus === 'INACTIVE' && c.isActive === false);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (sortField === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const activeCount   = displayed.filter(c => c.isActive !== false).length;
  const inactiveCount = displayed.filter(c => c.isActive === false).length;

  if (loading) return <FullPageLoader text={'Loading clients...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/*  Page Header  */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {'Client Management'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {'View and manage all clients.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              {'Export'}
            </button>
            <button
              onClick={() => navigate('/clients/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {'Add Client'}
            </button>
          </div>
        </div>

        {/*  Stats Row  */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{'Total Clients'}</p>
            <p className="text-2xl font-bold text-gray-900">{displayed.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{'Active'}</p>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{'Inactive'}</p>
            <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
          </div>
        </div>

        {/*  Filters  */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={'Search by name, email or code...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{'All Status'}</option>
            <option value="ACTIVE">{'Active'}</option>
            <option value="INACTIVE">{'Inactive'}</option>
          </select>

          {(searchTerm || filterStatus !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); }}
              className="text-sm text-blue-600 hover:underline"
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
                {'No clients found'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={'Client'}     field="nameEn"    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Code'}       field="code"      sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Phone'}      field="phone"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Status'}     field="isActive"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={'Created'}    field="createdAt" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(client => (
                  <tr key={client._id} className="hover:bg-gray-50/60 transition">

                    {/* Client name + email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {(lang === 'ar' ? client.nameAr : client.nameEn)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === 'ar' ? client.nameAr : client.nameEn}
                          </p>
                          {client.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{client.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {client.code}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {client.phone || ''}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge isActive={client.isActive} lang={lang} />
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {formatDate(client.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <ActionsMenu
                        client={client}
                        lang={lang}
                        onEdit={handleEdit}
                        onDelete={(c) => setDeleteModal({ show: true, client: c })}
                        onActivate={(c) => setActivateModal({ show: true, client: c })}
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/*  Edit Modal  */}
      {showEditModal && editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => { setShowEditModal(false); setEditingClient(null); }}
          fetchClients={fetchClients}
        />
      )}

      {/*  Delete Modal  */}
      {deleteModal.show && (
        <AdminActionModal
          type="delete"
          lang={lang}
          entityLabelEn="client"
          entityLabelAr="\u0639\u0645\u064a\u0644"
          itemName={lang === 'ar' ? deleteModal.client?.nameAr : deleteModal.client?.nameEn}
          itemSubtitle={deleteModal.client?.email || `${'Code'}: ${deleteModal.client?.code || '-'}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ show: false, client: null })}
        />
      )}

      {/*  Activate Modal  */}
      {activateModal.show && (
        <AdminActionModal
          type="activate"
          lang={lang}
          entityLabelEn="client"
          entityLabelAr="\u0639\u0645\u064a\u0644"
          itemName={lang === 'ar' ? activateModal.client?.nameAr : activateModal.client?.nameEn}
          itemSubtitle={activateModal.client?.email || `${'Code'}: ${activateModal.client?.code || '-'}`}
          onConfirm={handleActivate}
          onClose={() => setActivateModal({ show: false, client: null })}
        />
      )}
    </div>
  );
};

export default ClientsList;

