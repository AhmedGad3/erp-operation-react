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
  { value: 'AVAILABLE',   labelAr: '\u0645\u062a\u0627\u062d',          labelEn: 'Available'   },
  { value: 'IN_USE',      labelAr: '\u0642\u064a\u062f \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645', labelEn: 'In Use'      },
  { value: 'MAINTENANCE', labelAr: '\u0641\u064a \u0627\u0644\u0635\u064a\u0627\u0646\u0629',    labelEn: 'Maintenance' },
  { value: 'RETIRED',     labelAr: '\u0645\u062a\u0642\u0627\u0639\u062f',        labelEn: 'Retired'     },
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
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'ar' ? '\u063a\u064a\u0631 \u0646\u0634\u0637' : 'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'ar' ? '\u0646\u0634\u0637' : 'Active'}</span>;
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
            {lang === 'ar' ? '\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644' : 'Details'}
          </button>
          <button onClick={() => { setOpen(false); onEdit(asset); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <Edit className="w-4 h-4" />
            {lang === 'ar' ? '\u062a\u0639\u062f\u064a\u0644' : 'Edit'}
          </button>
          {asset.isActive === false && (
            <button onClick={() => { setOpen(false); onActivate(asset); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? '\u062a\u0641\u0639\u064a\u0644' : 'Activate'}
            </button>
          )}
          {asset.isActive !== false && (
            <button onClick={() => { setOpen(false); onDelete(asset); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? '\u062d\u0630\u0641' : 'Delete'}
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
      toast.error((lang === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0623\u0635\u0644 \u0645\u0637\u0644\u0648\u0628' : 'Asset name is required')); return;
    }
    if (!form.code.trim()) {
      toast.error((lang === 'ar' ? '\u0627\u0644\u0643\u0648\u062f \u0645\u0637\u0644\u0648\u0628' : 'Code is required')); return;
    }
    if (!form.assetTypeAr.trim() || !form.assetTypeEn.trim()) {
      toast.error((lang === 'ar' ? '\u0646\u0648\u0639 \u0627\u0644\u0623\u0635\u0644 \u0645\u0637\u0644\u0648\u0628' : 'Asset type is required')); return;
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
      toast.success((lang === 'ar' ? '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638 \u0628\u0646\u062c\u0627\u062d' : 'Saved successfully'));
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
            {mode === 'add' ? ('Add New Asset') : ('Edit Asset')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629' : 'Name (English)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="ltr" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0627\u0644\u0643\u0648\u062f' : 'Code'} <span className="text-red-500">*</span></label>
            <input type="text" placeholder="EXCAVATOR-001" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'Type (Arabic)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="rtl" placeholder="حفار" value={form.assetTypeAr} onChange={e => setForm(f => ({ ...f, assetTypeAr: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629' : 'Type (English)'} <span className="text-red-500">*</span></label>
              <input type="text" dir="ltr" placeholder="Excavator" value={form.assetTypeEn} onChange={e => setForm(f => ({ ...f, assetTypeEn: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50">
              {ASSET_STATUS.map(s => <option key={s.value} value={s.value}>{lang === 'ar' ? s.labelAr : s.labelEn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes'}</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows="2" dir={'ltr'} placeholder={lang === 'ar' ? '\u0623\u0636\u0641 \u0645\u0644\u0627\u062d\u0638\u0627\u062a...' : 'Add notes...'} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm bg-gray-50 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
            {lang === 'ar' ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50">
            {submitting ? ((lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638...' : 'Saving...')) : ((lang === 'ar' ? '\u062d\u0641\u0638' : 'Save'))}
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
      toast.error((lang === 'ar' ? '\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0623\u0635\u0648\u0644' : 'Failed to load assets'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/assets/${deleteModal.asset._id}`);
      toast.success((lang === 'ar' ? '\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0623\u0635\u0644' : 'Asset deleted'));
      setDeleteModal({ show: false, asset: null });
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleActivate = async () => {
    try {
      await axiosInstance.patch(`/assets/${activateModal.asset._id}/activate`);
      toast.success((lang === 'ar' ? '\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0623\u0635\u0644' : 'Asset activated'));
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
        [(lang === 'ar' ? '\u0627\u0644\u0643\u0648\u062f' : 'Code')]:            a.code,
        [(lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'Name (Arabic)')]:   a.nameAr,
        [(lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629' : 'Name (English)')]: a.nameEn,
        [(lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'Type (Arabic)')]:   a.assetTypeAr,
        [(lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629' : 'Type (English)')]: a.assetTypeEn,
        [(lang === 'ar' ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status')]:          ASSET_STATUS.find(s => s.value === a.status)?.['labelEn'] || a.status,
        [(lang === 'ar' ? '\u0646\u0634\u0637' : 'Active')]:          a.isActive !== false ? ((lang === 'ar' ? '\u0646\u0634\u0637' : 'Active')) : ((lang === 'ar' ? '\u063a\u064a\u0631 \u0646\u0634\u0637' : 'Inactive')),
        [(lang === 'ar' ? '\u0645\u0644\u0627\u062d\u0638\u0627\u062a' : 'Notes')]:           a.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assets');
      XLSX.writeFile(wb, `Assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success((lang === 'ar' ? '\u062a\u0645 \u0627\u0644\u062a\u0635\u062f\u064a\u0631 \u0628\u0646\u062c\u0627\u062d' : 'Exported successfully'));
    } catch {
      toast.error((lang === 'ar' ? '\u0641\u0634\u0644 \u0627\u0644\u062a\u0635\u062f\u064a\u0631' : 'Export failed'));
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
    return <FullPageLoader text={lang === 'ar' ? '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0623\u0635\u0648\u0644...' : 'Loading assets...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? '\u0627\u0644\u0623\u0635\u0648\u0644 \u0648\u0627\u0644\u0645\u0639\u062f\u0627\u062a' : 'Assets & Equipment'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? '\u0639\u0631\u0636 \u0648\u0625\u062f\u0627\u0631\u0629 \u0623\u0635\u0648\u0644 \u0648\u0645\u0639\u062f\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629.' : 'View and manage company assets and equipment.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAssets} disabled={loading}
              className="p-2.5 border border-gray-200 text-gray-500 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm"
              title={lang === 'ar' ? '\u062a\u062d\u062f\u064a\u062b' : 'Refresh'}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm">
              <Download className="w-4 h-4" />
              {lang === 'ar' ? '\u062a\u0635\u062f\u064a\u0631' : 'Export'}
            </button>
            <button onClick={() => navigate('/assets/invoice/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold text-sm shadow-sm">
              <ShoppingCart className="w-4 h-4" />
              {lang === 'ar' ? '\u0634\u0631\u0627\u0621 \u0623\u0635\u0644' : 'Buy Asset'}
            </button>
            <button onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm">
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? '\u0625\u0636\u0627\u0641\u0629 \u0623\u0635\u0644' : 'Add Asset'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={lang === 'ar' ? '\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0623\u0635\u0648\u0644...' : 'Search assets...'}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
            <option value="ALL">{lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? '\u0646\u0634\u0637' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? '\u063a\u064a\u0631 \u0646\u0634\u0637' : 'Inactive'}</option>
            {ASSET_STATUS.map(s => (
              <option key={s.value} value={s.value}>{lang === 'ar' ? s.labelAr : s.labelEn}</option>
            ))}
          </select>
          {(searchTerm || filterStatus !== 'ALL') && (
            <button onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); }}
              className="text-sm text-indigo-600 hover:underline">
              {lang === 'ar' ? '\u0645\u0633\u062d' : 'Clear'}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">{lang === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0635\u0648\u0644' : 'No assets found'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? '\u0627\u0644\u0623\u0635\u0644' : 'Asset'}        field={'nameEn'}             sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? '\u0627\u0644\u0643\u0648\u062f' : 'Code'}         field="code"                                             sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639' : 'Type'}         field={'assetTypeEn'}    sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0623\u0635\u0644' : 'Asset Status'} field="status"                                           sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? '\u0646\u0634\u0637' : 'Active'}       field="isActive"                                         sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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

