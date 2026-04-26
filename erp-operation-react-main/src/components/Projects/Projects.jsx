import React, { useState, useEffect, useContext } from 'react';
import {
  Building2, Search, Plus, Edit, Trash2, Download,
  CheckCircle, ChevronUp, ChevronDown, MoreHorizontal, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getErrorMessage } from '../../utils/errorHandler';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import EditProjectModal from '../ProjectModal/ProjectModal';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';
import { useRef } from 'react';

// ── Sortable column header ─────────────────────────────────
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

// ── Status badge ───────────────────────────────────────────
const StatusBadge = ({ isActive, lang }) => {
  if (isActive === false)
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'ar' ? 'محذوف' : 'Inactive'}</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'ar' ? 'نشط' : 'Active'}</span>;
};

// ── Three-dots menu ────────────────────────────────────────
const ActionsMenu = ({ project, lang, onEdit, onDelete, onActivate }) => {
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
      const menuHeight = 80; // زرارين
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
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(project); }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Edit className="w-4 h-4" />
            {lang === 'ar' ? 'تعديل' : 'Edit'}
          </button>

          {project.isActive === false && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onActivate(project); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <CheckCircle className="w-4 h-4" />
              {lang === 'ar' ? 'تفعيل' : 'Activate'}
            </button>
          )}

          {project.isActive !== false && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(project); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Confirm Delete Modal ───────────────────────────────────
const DeleteModal = ({ project, lang, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
          </h3>
          <p className="text-sm text-gray-500">
            {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المشروع؟' : 'Are you sure you want to delete this project?'}
          </p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="font-medium text-gray-900 text-sm">{lang === 'ar' ? project?.nameAr : project?.nameEn}</p>
        <p className="text-xs text-gray-500">{lang === 'ar' ? 'الكود: ' : 'Code: '}{project?.code}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm">
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button onClick={onConfirm}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm">
          {lang === 'ar' ? 'حذف' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────
const ProjectsList = () => {
  const { lang } = useContext(LanguageContext);
  const navigate  = useNavigate();

  const [projects,      setProjects]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('ALL');
  const [sortField,     setSortField]     = useState('nameEn');
  const [sortDir,       setSortDir]       = useState('asc');
  const [deleteModal,   setDeleteModal]   = useState({ show: false, project: null });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject,setEditingProject]= useState(null);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/projects');
      setProjects(Array.isArray(response.data) ? response.data : (response.data.result || []));
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تحميل المشاريع' : 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => { setEditingProject(project); setShowEditModal(true); };

  const handleDelete = async () => {
    if (!deleteModal.project) return;
    try {
      await axiosInstance.delete(`/projects/${deleteModal.project._id}`);
      toast.success(lang === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully');
      setDeleteModal({ show: false, project: null });
      fetchProjects();
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project'));
    }
  };

  const handleActivate = async (project) => {
    try {
      await axiosInstance.patch(`/projects/${project._id}/activate`);
      toast.success(lang === 'ar' ? 'تم تفعيل المشروع بنجاح' : 'Project activated successfully');
      fetchProjects();
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل تفعيل المشروع' : 'Failed to activate project'));
    }
  };

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(amount);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleExportExcel = () => {
    if (displayed.length === 0) { toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    const data = displayed.map(p => ({
      [lang === 'ar' ? 'الاسم'         : 'Name']:           lang === 'ar' ? p.nameAr : p.nameEn,
      [lang === 'ar' ? 'الكود'         : 'Code']:           p.code || '',
      [lang === 'ar' ? 'الموقع'        : 'Location']:       p.location || '',
      [lang === 'ar' ? 'مدير المشروع'  : 'Manager']:        p.projectManager || '',
      [lang === 'ar' ? 'قيمة العقد'    : 'Contract Value']: p.contractAmount || 0,
      [lang === 'ar' ? 'إجمالي التكاليف': 'Total Costs']:   p.totalCosts || 0,
      [lang === 'ar' ? 'الحالة'        : 'Status']:         p.status || 'PLANNED',
      [lang === 'ar' ? 'نشط'           : 'Active']:         p.isActive !== false ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No'),
    }));
    exportToExcel(data, Object.keys(data[0]).map(k => ({ [k]: k })), lang === 'ar' ? 'قائمة_المشاريع' : 'Projects_List', lang);
    toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
  };

  // Filter + Sort
  const displayed = projects
    .filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        p.nameAr?.toLowerCase().includes(q) ||
        p.nameEn?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL'
        || (filterStatus === 'ACTIVE'   && p.isActive !== false)
        || (filterStatus === 'INACTIVE' && p.isActive === false);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const activeCount   = displayed.filter(p => p.isActive !== false).length;
  const inactiveCount = displayed.filter(p => p.isActive === false).length;
  const totalValue    = displayed.reduce((s, p) => s + (p.contractAmount || 0), 0);

  if (loading) return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل المشاريع...' : 'Loading projects...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'إدارة المشاريع' : 'Project Management'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'عرض وإدارة جميع المشاريع' : 'View and manage all projects.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              {lang === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <button
              onClick={() => navigate('/projects/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {lang === 'ar' ? 'إضافة مشروع' : 'Add Project'}
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projects'}</p>
            <p className="text-2xl font-bold text-gray-900">{displayed.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'مشاريع نشطة' : 'Active'}</p>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'مشاريع محذوفة' : 'Inactive'}</p>
            <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'إجمالي القيم' : 'Total Value'}</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          >
            <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="INACTIVE">{lang === 'ar' ? 'محذوف' : 'Inactive'}</option>
          </select>

          {(searchTerm || filterStatus !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); }}
              className="text-sm text-green-600 hover:underline"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear'}
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-16 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {lang === 'ar' ? 'لا يوجد مشاريع' : 'No projects found'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortHeader label={lang === 'ar' ? 'المشروع'    : 'Project'}        field="nameEn"          sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الكود'      : 'Code'}           field="code"            sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'المدير'     : 'Manager'}        field="projectManager"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'قيمة العقد' : 'Contract Value'} field="contractAmount"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label={lang === 'ar' ? 'الحالة'     : 'Status'}         field="isActive"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(project => (
                  <tr
                    key={project._id}
                    className="hover:bg-gray-50/60 transition cursor-pointer"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    {/* Project name + location */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 font-semibold text-sm">
                            {(lang === 'ar' ? project.nameAr : project.nameEn)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lang === 'ar' ? project.nameAr : project.nameEn}
                          </p>
                          {project.location && (
                            <p className="text-xs text-gray-400">{project.location}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {project.code}
                      </span>
                    </td>

                    {/* Manager */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {project.projectManager || '—'}
                    </td>

                    {/* Contract Value */}
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      {formatCurrency(project.contractAmount)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge isActive={project.isActive} lang={lang} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <ActionsMenu
                        project={project}
                        lang={lang}
                        onEdit={handleEdit}
                        onDelete={(p) => setDeleteModal({ show: true, project: p })}
                        onActivate={handleActivate}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => { setShowEditModal(false); setEditingProject(null); }}
          fetchProjects={fetchProjects}
        />
      )}

      {/* ── Delete Modal ── */}
      {deleteModal.show && (
        <DeleteModal
          project={deleteModal.project}
          lang={lang}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ show: false, project: null })}
        />
      )}
    </div>
  );
};

export default ProjectsList;