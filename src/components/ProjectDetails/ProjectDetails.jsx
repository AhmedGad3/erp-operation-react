import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Package,
  Truck,
} from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import EditProjectModal from '../ProjectModal/ProjectModal';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useContext(LanguageContext);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/projects/${id}`);
      setProject(response.data.result);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل المشروع' : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/projects/${id}`);
      toast.success(lang === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully');
      setTimeout(() => navigate('/projects'), 1500);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(lang === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PLANNED: { bg: 'bg-blue-100', text: 'text-blue-800', label: lang === 'ar' ? 'مخطط' : 'Planned' },
      IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: lang === 'ar' ? 'جاري التنفيذ' : 'In Progress' },
      ON_HOLD: { bg: 'bg-orange-100', text: 'text-orange-800', label: lang === 'ar' ? 'معلق' : 'On Hold' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: lang === 'ar' ? 'مكتمل' : 'Completed' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: lang === 'ar' ? 'ملغي' : 'Cancelled' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800', label: lang === 'ar' ? 'مغلق' : 'Closed' },
    };

    return statusMap[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status,
    };
  };

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل تفاصيل المشروع...' : 'Loading project details...'} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {lang === 'ar' ? 'المشروع غير موجود' : 'Project Not Found'}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(project.status);

  // Chart data
  const costBreakdownData = [
    { name: lang === 'ar' ? 'المواد' : 'Materials', value: project.materialCosts, color: '#1e3a8a' },
    { name: lang === 'ar' ? 'العمالة' : 'Labor', value: project.laborCosts, color: '#f59e0b' },
    { name: lang === 'ar' ? 'المعدات' : 'Equipment', value: project.equipmentCosts, color: '#10b981' },
    { name: lang === 'ar' ? 'أخرى' : 'Other', value: project.otherCosts, color: '#3b82f6' },
  ];

  const COLORS = ['#1e3a8a', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {lang === 'ar' ? 'رجوع للمشاريع' : 'Back to Projects'}
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{lang === 'ar' ? project.nameAr : project.nameEn}</h1>
                  <p className="text-green-100 mt-1">{project.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                </button>
                <button
                  onClick={() => setDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                  {lang === 'ar' ? 'حذف' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
            <div>
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'الحالة' : 'Status'}</p>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'العميل' : 'Client'}</p>
              <p className="font-semibold text-gray-900">
                {lang === 'ar' ? project.clientId.nameAr : project.clientId.nameEn}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'الموقع' : 'Location'}</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {project.location}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'النسبة المئوية للإنجاز' : 'Completion %'}</p>
              <p className="font-semibold text-gray-900">{project.completionPercentage}%</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Side - Project Details & Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {lang === 'ar' ? 'تفاصيل المشروع' : 'Project Details'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'مدير المشروع' : 'Project Manager'}</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    {project.projectManager || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer'}</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    {project.siteEngineer || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    {formatDate(project.startDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {lang === 'ar' ? 'تاريخ النهاية المتوقع' : 'Expected End Date'}
                  </p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    {formatDate(project.expectedEndDate)}
                  </p>
                </div>
              </div>

              {project.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-2">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{project.notes}</p>
                </div>
              )}
            </div>

            {/* Charts Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost Breakdown Bar Chart */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {lang === 'ar' ? 'تفصيل التكاليف' : 'Cost Breakdown'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costBreakdownData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {costBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Expense Distribution Pie Chart */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {lang === 'ar' ? 'توزيع المصروفات' : 'Expense Distribution'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {costBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Cost Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Materials Card */}
              <div
                onClick={() => navigate(`/projects/material-issue/project/${id}`)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{lang === 'ar' ? 'المواد' : 'Materials'}</h4>
                      <p className="text-sm text-gray-500">{lang === 'ar' ? 'تكاليف المواد' : 'Material Costs'}</p>
                    </div>
                  </div>
                  <ArrowLeft
                    className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors"
                    style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}
                  />
                </div>
                <div className="text-3xl font-bold text-blue-600">{formatCurrency(project.materialCosts)}</div>
              </div>

              {/* Labor Card */}
              <div
                onClick={() => navigate(`/projects/${id}/labor`)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{lang === 'ar' ? 'العمالة' : 'Labor'}</h4>
                      <p className="text-sm text-gray-500">{lang === 'ar' ? 'تكاليف العمالة' : 'Labor Costs'}</p>
                    </div>
                  </div>
                  <ArrowLeft
                    className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors"
                    style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}
                  />
                </div>
                <div className="text-3xl font-bold text-orange-600">{formatCurrency(project.laborCosts)}</div>
              </div>

              {/* Equipment Card */}
              <div
                onClick={() => navigate(`/projects/${id}/equipment`)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{lang === 'ar' ? 'المعدات' : 'Equipment'}</h4>
                      <p className="text-sm text-gray-500">{lang === 'ar' ? 'تكاليف المعدات' : 'Equipment Costs'}</p>
                    </div>
                  </div>
                  <ArrowLeft
                    className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors"
                    style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}
                  />
                </div>
                <div className="text-3xl font-bold text-green-600">{formatCurrency(project.equipmentCosts)}</div>
              </div>

              {/* Other Costs Card */}
              <div
                onClick={() => navigate(`/projects/${id}/miscellaneous`)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{lang === 'ar' ? 'أخرى' : 'Others'}</h4>
                      <p className="text-sm text-gray-500">{lang === 'ar' ? 'مصروفات أخرى' : 'Other Expenses'}</p>
                    </div>
                  </div>
                  <ArrowLeft
                    className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors"
                    style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}
                  />
                </div>
                <div className="text-3xl font-bold text-purple-600">{formatCurrency(project.otherCosts)}</div>
              </div>
            </div>
          </div>

          {/* Right Side - Financial Summary */}
          <div className="space-y-6">
            {/* Contract Amount */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                {lang === 'ar' ? 'قيمة العقد' : 'Contract Amount'}
              </h3>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(project.contractAmount)}</p>
              <p className="text-sm text-gray-600 mt-2">{lang === 'ar' ? 'المبلغ المتبقي' : 'Remaining'}</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(project.contractRemaining)}</p>
            </div>

            {/* Profit Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                {lang === 'ar' ? 'تحليل الأرباح' : 'Profit Analysis'}
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'الربح المتوقع' : 'Expected Profit'}</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(project.expectedProfit)}</p>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'الربح المحقق' : 'Realized Profit'}</p>
                  <p className={`text-xl font-bold ${project.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(project.realizedProfit)}
                  </p>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'هامش الربح' : 'Profit Margin'}</p>
                  <p className="text-xl font-bold text-gray-900">{project.profitMargin}%</p>
                </div>
              </div>
            </div>

            {/* Financial Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {lang === 'ar' ? 'الحالة المالية' : 'Financial Status'}
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-700">{lang === 'ar' ? 'المفوتر' : 'Invoiced'}</span>
                  <span className="font-semibold">{formatCurrency(project.totalInvoiced)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{lang === 'ar' ? 'المدفوع' : 'Paid'}</span>
                  <span className="font-semibold">{formatCurrency(project.totalPaid)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => {
            setShowEditModal(false);
            fetchProject();
          }}
          fetchProjects={fetchProject}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
                <p className="text-sm text-gray-500">
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا المشروع؟' : 'Are you sure you want to delete this project?'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المشروع:' : 'Project:'}</p>
              <p className="font-semibold text-gray-900">{lang === 'ar' ? project.nameAr : project.nameEn}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteModal(false);
                }}
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

export default ProjectDetails;