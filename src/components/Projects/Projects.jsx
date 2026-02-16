import React, { useState, useEffect, useContext } from 'react';
import { Building2, Search, Plus, Edit, Trash2, Calendar, DollarSign, AlertCircle, Check, X, CheckCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import EditProjectModal from '../ProjectModal/ProjectModal';
import { exportToExcel } from '../../utils/excelExport';
import { toast } from 'react-toastify';

const ProjectsList = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [deleteModal, setDeleteModal] = useState({ show: false, project: null });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, filterStatus]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/projects');
      const projectsData = Array.isArray(response.data) ? response.data : (response.data.result || []);
      setProjects(projectsData);
    } catch (error) {
      console.error('Fetch projects error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل المشاريع' : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.nameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(project => 
        filterStatus === 'ACTIVE' ? project.isActive !== false : project.isActive === false
      );
    }

    setFilteredProjects(filtered);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.project) return;

    try {
      await axiosInstance.delete(`/projects/${deleteModal.project._id}`);
      toast.success(lang === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully');
      setDeleteModal({ show: false, project: null });
      fetchProjects();
    } catch (error) {
      console.error('Delete project error:', error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project'));
    }
  };

  const handleActivate = async (project) => {
    try {
      await axiosInstance.patch(`/projects/${project._id}/activate`);
      toast.success(lang === 'ar' ? 'تم تفعيل المشروع بنجاح' : 'Project activated successfully');
      fetchProjects();
    } catch (error) {
      console.error('Activate project error:', error);
      toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل تفعيل المشروع' : 'Failed to activate project'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = () => {
    try {
      if (filteredProjects.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
        return;
      }

      // Prepare data
      const data = filteredProjects.map((project) => ({
        [lang === 'ar' ? 'الاسم' : 'Name']: lang === 'ar' ? project.nameAr : project.nameEn,
        [lang === 'ar' ? 'الكود' : 'Code']: project.code || '',
        [lang === 'ar' ? 'الموقع' : 'Location']: project.location || '',
        [lang === 'ar' ? 'مدير المشروع' : 'Manager']: project.projectManager || '',
        [lang === 'ar' ? 'قيمة العقد' : 'Contract Value']: project.contractAmount || 0,
        [lang === 'ar' ? 'إجمالي التكاليف' : 'Total Costs']: project.totalCosts || 0,
        [lang === 'ar' ? 'الحالة' : 'Status']: project.status || 'PLANNED',
        [lang === 'ar' ? 'نشط' : 'Active']: project.isActive !== false ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No'),
      }));

      // Prepare headers with correct format
      const headers = Object.keys(data[0]).map(key => ({ [key]: key }));

      // Call export function
      exportToExcel(data, headers, lang === 'ar' ? 'قائمة_المشاريع' : 'Projects_List', lang);
      
      toast.success(lang === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(lang === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل المشاريع..." : "Loading projects..."} />;
  }

  const activeProjects = filteredProjects.filter(p => p.isActive !== false).length;
  const inactiveProjects = filteredProjects.filter(p => p.isActive === false).length;
  const totalValue = filteredProjects.reduce((sum, p) => sum + (p.contractAmount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'إدارة المشاريع' : 'Project Management'}
                  </h1>
                  <p className="text-green-100 mt-1">
                    {lang === 'ar' ? 'عرض وإدارة جميع المشاريع' : 'View and manage all projects'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  {lang === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button
                  onClick={() => navigate('/projects/create')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-lg hover:bg-green-50 transition font-semibold shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  {lang === 'ar' ? 'إضافة مشروع' : 'Add Project'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projects'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{filteredProjects.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'مشاريع نشطة' : 'Active Projects'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'مشاريع محذوفة' : 'Inactive Projects'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{inactiveProjects}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'ar' ? 'إجمالي القيم' : 'Total Value'}
              </p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              >
                <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="INACTIVE">{lang === 'ar' ? 'محذوف' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {(searchTerm || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
              }}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {lang === 'ar' ? 'لا يوجد مشاريع' : 'No Projects Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'ar' ? 'لم يتم العثور على مشاريع مطابقة للفلاتر' : 'No projects match your filters'}
              </p>
              <button
                onClick={() => navigate('/projects/create')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                <Plus className="w-5 h-5" />
                {lang === 'ar' ? 'إضافة أول مشروع' : 'Add First Project'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المشروع' : 'Project'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الكود' : 'Code'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'المدير' : 'Manager'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'قيمة العقد' : 'Contract Value'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      {lang === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr key={project._id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate(`/projects/${project._id}`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-lg">
                              {(lang === 'ar' ? project.nameAr : project.nameEn)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-green-600 hover:text-green-700">
                              {lang === 'ar' ? project.nameAr : project.nameEn}
                            </p>
                            <p className="text-sm text-gray-500">
                              {project.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          {project.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {project.projectManager || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">
                        {formatCurrency(project.contractAmount)}
                      </td>
                      <td className="px-6 py-4">
                        {project.isActive !== false ? (
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
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(project)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium"
                          >
                            <Edit className="w-4 h-4" />
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          {project.isActive !== false && (
                            <button
                              onClick={() => setDeleteModal({ show: true, project })}
                              className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              {lang === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          )}
                          {project.isActive === false && (
                            <button
                              onClick={() => handleActivate(project)}
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
      {showEditModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setShowEditModal(false);
            setEditingProject(null);
          }}
          fetchProjects={fetchProjects}
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
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المشروع؟' : 'Are you sure you want to delete this project?'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المشروع:' : 'Project:'}</p>
              <p className="font-semibold text-gray-900">{lang === 'ar' ? deleteModal.project?.nameAr : deleteModal.project?.nameEn}</p>
              <p className="text-sm text-gray-500">{lang === 'ar' ? 'الكود: ' : 'Code: '}{deleteModal.project?.code}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, project: null })}
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
    </div>
  );
};

export default ProjectsList;