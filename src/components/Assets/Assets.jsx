import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import {
  Wrench, Search, Plus, Edit, Trash2, CheckCircle,
  ChevronUp, ChevronDown, MoreHorizontal, X, Download, RefreshCw, ShoppingCart, Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import AdminActionModal from '../modals/AdminActionModal';

const ASSET_STATUS = [
  { value: 'AVAILABLE',   labelAr: 'Ù…ØªØ§Ø­',           labelEn: 'Available'   },
  { value: 'IN_USE',      labelAr: 'Ù‚ÙŠØ¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…',  labelEn: 'In Use'      },
  { value: 'MAINTENANCE', labelAr: 'ÙÙŠ Ø§Ù„ØµÙŠØ§Ù†Ø©',      labelEn: 'Maintenance' },
  { value: 'RETIRED',     labelAr: 'Ù…ØªÙ‚Ø§Ø¹Ø¯',          labelEn: 'Retired'     },
];

const SortHeader = ({ label, field, sortField, sortDir, onSort }) => (
  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => onSort(field)}>
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex flex-col leading-none">
        <ChevronUp   className={`w-3 h-3 ${sortField === field && sortDir === 'asc'  ? 'text-gray-900' : 'text-gray-300'}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
      </span>
    </span>
  </th>
);

const ActiveBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'ar' ? 'ØºÙŠØ± Ù†Ø´Ø·' : 'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'ar' ? 'Ù†Ø´Ø·' : 'Active'}</span>;
};

const StatusBadge = ({ status, lang }) => {
  const colorMap = {
    AVAILABLE:   'bg-green-100 text-green-700',
    IN_USE:      'bg-blue-100 text-blue-700',
    MAINTENANCE: 'bg-yellow-100 text-yellow-700',
    RETIRED:     'bg-gray-100 text-gray-600',
  };
  const label = ASSET_STATUS.find(s => s.value === status)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || status;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorMap[status] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
};

const ActionsMenu = ({ asset, lang, onEdit, onDelete, onActivate }) => {
  const navigate = useNavigate();
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
      const menuHeight = 120;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4;
      setMenuPos({ top, left: rect.right - 160 });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} onClick={handleOpen} className="p-1.5 rounded-md hover:bg-gray-100 transition text-gray-500">
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
          <button onClick={() => { setOpen(false); navigate(`/assets/${asset._id}`); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Eye className="w-4 h-4" />
            {lang === 'ar' ? 'Ø§Ù„ØªÙØ§ØµÙŠÙ„' : 'Details'}
          </button>
          <button onClick={() => { setOpen(false); onEdit(asset); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Edit className="w-4 h-4" />
            {lang === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Edit'}
          </button>
          {asset.isActive === false && (
            <button onClick={() => { setOpen(false); onActivate(asset); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? 'ØªÙØ¹ÙŠÙ„' : 'Activate'}
            </button>
          )}
          {asset.isActive !== false && (
            <button onClick={() => { setOpen(false); onDelete(asset); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'Ø­Ø°Ù' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const AssetModal = ({ lang, mode, asset: editAsset, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nameAr:      editAsset?.nameAr      || '',
    nameEn:      editAsset?.nameEn      || '',
    code:        editAsset?.code        || '',
    assetTypeAr: editAsset?.assetTypeAr || '',
    assetTypeEn: editAsset?.assetTypeEn || '',
    status:      editAsset?.status      || 'AVAILABLE',
    notes:       editAsset?.notes       || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      toast.error(lang === 'ar' ? 'Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„ Ù…Ø·Ù„ÙˆØ¨' : 'Asset name is required'); return;
    }
    if (!form.code.trim()) {
      toast.error(lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯ Ù…Ø·Ù„ÙˆØ¨' : 'Code is required'); return;
    }
    if (!form.assetTypeAr.trim() || !form.assetTypeEn.trim()) {
      toast.error(lang === 'ar' ? 'Ù†ÙˆØ¹ Ø§Ù„Ø£ØµÙ„ Ù…Ø·Ù„ÙˆØ¨' : 'Asset type is required'); return;
    }
    try {
      setSubmitting(true);
      const payload = {
        nameAr:      form.nameAr.trim(),
        nameEn:      form.nameEn.trim(),
        code:        form.code.trim().toUpperCase(),
        assetTypeAr: form.assetTypeAr.trim(),
        assetTypeEn: form.assetTypeEn.trim(),
        status:      form.status,
        notes:       form.notes.trim() || '',
      };
      if (mode === 'add') {
        await axiosInstance.post('/assets', payload);
      } else {
        await axiosInstance.put(`/assets/${editAsset._id}`, payload);
      }
      toast.success(lang === 'ar' ? 'ØªÙ… Ø§Ù„Ø­ÙØ¸ Ø¨Ù†Ø¬Ø§Ø­' : 'Saved successfully');
      onSaved();
      onClose();
    } catch (err) {
      const msg = (Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message) || err.message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? (lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ø£ØµÙ„ Ø¬Ø¯ÙŠØ¯' : 'Add New Asset') : (lang === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø£ØµÙ„' : 'Edit Asset')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Name (English)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="ltr" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯' : 'Code'} <span className="text-red-500">*</span></label>
            <input type="text" placeholder="EXCAVATOR-001" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ù†ÙˆØ¹ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©' : 'Type (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" placeholder="Ø­ÙØ§Ø±" value={form.assetTypeAr} onChange={e => setForm(f => ({ ...f, assetTypeAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ù†ÙˆØ¹ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Type (English)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="ltr" placeholder="Excavator" value={form.assetTypeEn} onChange={e => setForm(f => ({ ...f, assetTypeEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ø§Ù„Ø­Ø§Ù„Ø©' : 'Status'}</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
              {ASSET_STATUS.map(s => <option key={s.value} value={s.value}>{lang === 'ar' ? s.labelAr : s.labelEn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª' : 'Notes'}</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows="2" dir={lang === 'ar' ? 'rtl' : 'ltr'} placeholder={lang === 'ar' ? 'Ø£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø§Øª...' : 'Add notes...'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? (lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Saving...') : (lang === 'ar' ? 'Ø­ÙØ¸' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Assets() {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [assets,        setAssets]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('ALL');
  const [sortField,     setSortField]     = useState('nameEn');
  const [sortDir,       setSortDir]       = useState('asc');
  const [addModal,      setAddModal]      = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteModal,   setDeleteModal]   = useState({ show: false, asset: null });
  const [activateModal, setActivateModal] = useState({ show: false, asset: null });

  useEffect(() => { fetchAssets(); }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get('/assets');
      setAssets(data.result || data || []);
    } catch {
      toast.error(lang === 'ar' ? 'ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£ØµÙˆÙ„' : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/assets/${deleteModal.asset._id}`);
      toast.success(lang === 'ar' ? 'ØªÙ… Ø­Ø°Ù Ø§Ù„Ø£ØµÙ„ Ø¨Ù†Ø¬Ø§Ø­' : 'Asset deleted');
      setDeleteModal({ show: false, asset: null });
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleActivate = async () => {
    try {
      await axiosInstance.patch(`/assets/${activateModal.asset._id}/activate`);
      toast.success(lang === 'ar' ? 'ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ØµÙ„ Ø¨Ù†Ø¬Ø§Ø­' : 'Asset activated');
      setActivateModal({ show: false, asset: null });
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleExport = () => {
    try {
      const data = displayed.map(a => ({
        [lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯'             : 'Code']:            a.code,
        [lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©'    : 'Name (Arabic)']:   a.nameAr,
        [lang === 'ar' ? 'Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Name (English)']: a.nameEn,
        [lang === 'ar' ? 'Ø§Ù„Ù†ÙˆØ¹ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©'    : 'Type (Arabic)']:   a.assetTypeAr,
        [lang === 'ar' ? 'Ø§Ù„Ù†ÙˆØ¹ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©' : 'Type (English)']: a.assetTypeEn,
        [lang === 'ar' ? 'Ø§Ù„Ø­Ø§Ù„Ø©'            : 'Status']:          ASSET_STATUS.find(s => s.value === a.status)?.[lang === 'ar' ? 'labelAr' : 'labelEn'] || a.status,
        [lang === 'ar' ? 'Ù†Ø´Ø·/ØºÙŠØ± Ù†Ø´Ø·'       : 'Active']:          a.isActive !== false ? (lang === 'ar' ? 'Ù†Ø´Ø·' : 'Active') : (lang === 'ar' ? 'ØºÙŠØ± Ù†Ø´Ø·' : 'Inactive'),
        [lang === 'ar' ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª'           : 'Notes']:           a.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'Ø§Ù„Ø£ØµÙˆÙ„' : 'Assets');
      XLSX.writeFile(wb, `Assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(lang === 'ar' ? 'ØªÙ… Ø§Ù„ØªØµØ¯ÙŠØ± Ø¨Ù†Ø¬Ø§Ø­' : 'Exported successfully');
    } catch {
      toast.error(lang === 'ar' ? 'ÙØ´Ù„ Ø§Ù„ØªØµØ¯ÙŠØ±' : 'Export failed');
    }
  };

  const displayed = useMemo(() => {
    return assets
      .filter(a => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q || a.nameEn?.toLowerCase().includes(q) || a.nameAr?.includes(q) || a.code?.toLowerCase().includes(q) || a.assetTypeEn?.toLowerCase().includes(q) || a.assetTypeAr?.includes(q);
        const matchStatus =
          filterStatus === 'ALL' ||
          (filterStatus === 'ACTIVE'   && a.isActive !== false) ||
          (filterStatus === 'INACTIVE' && a.isActive === false) ||
          a.status === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        let va = a[sortField] ?? '';
        let vb = b[sortField] ?? '';
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [assets, searchTerm, filterStatus, sortField, sortDir]);

  if (loading && assets.length === 0)
    return <FullPageLoader text={lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø£ØµÙˆÙ„...' : 'Loading assets...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'Ø§Ù„Ø£ØµÙˆÙ„ ÙˆØ§Ù„Ù…Ø¹Ø¯Ø§Øª' : 'Assets & Equipment'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'Ø¹Ø±Ø¶ ÙˆØ¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø£ØµÙˆÙ„ ÙˆØ§Ù„Ù…Ø¹Ø¯Ø§Øª Ø§Ù„Ø®Ø§ØµØ© Ø¨Ø§Ù„Ø´Ø±ÙƒØ©' : 'View and manage company assets and equipment.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAssets} disabled={loading}
              className="p-2.5 border border-gray-200 text-gray-500 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm"
              title={lang === 'ar' ? 'ØªØ­Ø¯ÙŠØ«' : 'Refresh'}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm">
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'ØªØµØ¯ÙŠØ±' : 'Export'}
            </button>
            <button onClick={() => navigate('/assets/invoice/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold text-sm shadow-sm">
              <ShoppingCart className="w-4 h-4" />
              {lang === 'ar' ? 'Ø´Ø±Ø§Ø¡ Ø£ØµÙ„' : 'Buy Asset'}
            </button>
            <button onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm">
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'Ø¥Ø¶Ø§ÙØ© Ø£ØµÙ„' : 'Add Asset'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={lang === 'ar' ? 'Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø£ØµÙˆÙ„...' : 'Search assets...'}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="ALL">{lang === 'ar' ? 'ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? 'Ù†Ø´Ø·' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? 'ØºÙŠØ± Ù†Ø´Ø·' : 'Inactive'}</option>
            {ASSET_STATUS.map(s => (
              <option key={s.value} value={s.value}>{lang === 'ar' ? s.labelAr : s.labelEn}</option>
            ))}
          </select>
          {(searchTerm || filterStatus !== 'ALL') && (
            <button onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); }}
              className="text-sm text-indigo-600 hover:underline">
              {lang === 'ar' ? 'Ù…Ø³Ø­ Ø§Ù„ÙÙ„Ø§ØªØ±' : 'Clear'}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">{lang === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ØµÙˆÙ„' : 'No assets found'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„Ø£ØµÙ„'      : 'Asset'}        field={lang === 'ar' ? 'nameAr' : 'nameEn'}             sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯'       : 'Code'}         field="code"                                             sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„Ù†ÙˆØ¹'       : 'Type'}         field={lang === 'ar' ? 'assetTypeAr' : 'assetTypeEn'}    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø­Ø§Ù„Ø© Ø§Ù„Ø£ØµÙ„' : 'Asset Status'} field="status"                                           sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'Ø§Ù„Ù†Ø´Ø§Ø·'      : 'Active'}       field="isActive"                                         sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(asset => (
                  <tr key={asset._id}
                    className="hover:bg-gray-50/60 transition cursor-pointer"
                    onClick={() => navigate(`/assets/${asset._id}`)}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm block">{lang === 'ar' ? asset.nameAr : asset.nameEn}</span>
                          {asset.notes && <span className="text-xs text-gray-400 truncate max-w-[180px] block">{asset.notes}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{asset.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {lang === 'ar' ? asset.assetTypeAr : asset.assetTypeEn}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={asset.status} lang={lang} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ActiveBadge isActive={asset.isActive} lang={lang} />
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <ActionsMenu asset={asset} lang={lang}
                        onEdit={a => setEditTarget(a)}
                        onDelete={a => setDeleteModal({ show: true, asset: a })}
                        onActivate={a => setActivateModal({ show: true, asset: a })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {addModal && <AssetModal lang={lang} mode="add" onClose={() => setAddModal(false)} onSaved={fetchAssets} />}
      {editTarget && <AssetModal lang={lang} mode="edit" asset={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchAssets} />}
      {deleteModal.show && (
        <AdminActionModal
          type="delete"
          lang={lang}
          entityLabelEn="asset"
          entityLabelAr="\u0623\u0635\u0644"
          itemName={lang === 'ar' ? deleteModal.asset?.nameAr : deleteModal.asset?.nameEn}
          itemSubtitle={`${lang === 'ar' ? '\u0627\u0644\u0643\u0648\u062f' : 'Code'}: ${deleteModal.asset?.code || '-'}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ show: false, asset: null })}
        />
      )}
      {activateModal.show && (
        <AdminActionModal
          type="activate"
          lang={lang}
          entityLabelEn="asset"
          entityLabelAr="\u0623\u0635\u0644"
          itemName={lang === 'ar' ? activateModal.asset?.nameAr : activateModal.asset?.nameEn}
          itemSubtitle={`${lang === 'ar' ? '\u0627\u0644\u0643\u0648\u062f' : 'Code'}: ${activateModal.asset?.code || '-'}`}
          onConfirm={handleActivate}
          onClose={() => setActivateModal({ show: false, asset: null })}
        />
      )}
    </div>
  );
}

