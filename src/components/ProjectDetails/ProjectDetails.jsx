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
  Edit,
  Trash2,
  Package,
  Truck,
  HardHat,
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
      PLANNED:     { bg: 'bg-blue-100',   text: 'text-blue-800',   label: lang === 'ar' ? 'مخطط'         : 'Planned'     },
      IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: lang === 'ar' ? 'جاري التنفيذ' : 'In Progress' },
      ON_HOLD:     { bg: 'bg-orange-100', text: 'text-orange-800', label: lang === 'ar' ? 'معلق'         : 'On Hold'     },
      COMPLETED:   { bg: 'bg-green-100',  text: 'text-green-800',  label: lang === 'ar' ? 'مكتمل'        : 'Completed'   },
      CANCELLED:   { bg: 'bg-red-100',    text: 'text-red-800',    label: lang === 'ar' ? 'ملغي'         : 'Cancelled'   },
      CLOSED:      { bg: 'bg-gray-100',   text: 'text-gray-800',   label: lang === 'ar' ? 'مغلق'         : 'Closed'      },
    };
    return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري تحميل تفاصيل المشروع...' : 'Loading project details...'} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-600">
              {lang === 'ar' ? 'المشروع غير موجود' : 'Project Not Found'}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(project.status);

  const costBreakdownData = [
    { name: lang === 'ar' ? 'المواد'     : 'Materials',      value: project.materialCosts,       color: '#1e3a8a' },
    { name: lang === 'ar' ? 'العمالة'    : 'Labor',          value: project.laborCosts,          color: '#f59e0b' },
    { name: lang === 'ar' ? 'المعدات'    : 'Equipment',      value: project.equipmentCosts,      color: '#10b981' },
    { name: lang === 'ar' ? 'المقاولين'  : 'Subcontractors', value: project.subcontractorCosts,  color: '#f97316' },
    { name: lang === 'ar' ? 'أخرى'       : 'Other',          value: project.otherCosts,          color: '#3b82f6' },
  ].filter((item) => item.value > 0);

  const COLORS = costBreakdownData.map((d) => d.color);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? project.nameAr : project.nameEn}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{project.code}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium text-sm"
            >
              <Edit className="w-4 h-4" />
              {lang === 'ar' ? 'تعديل' : 'Edit'}
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </button>
          </div>
        </div>

        {/* ── Basic Info Strip ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'الحالة' : 'Status'}</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'العميل' : 'Client'}</p>
              <p className="font-medium text-gray-900 text-sm">
                {lang === 'ar' ? project.clientId.nameAr : project.clientId.nameEn}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'الموقع' : 'Location'}</p>
              <p className="font-medium text-gray-900 text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {project.location}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'نسبة الإنجاز' : 'Completion'}</p>
              <p className="font-medium text-gray-900 text-sm">{project.completionPercentage}%</p>
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* Left Side */}
          <div className="lg:col-span-2 space-y-6">

            {/* Project Details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {lang === 'ar' ? 'تفاصيل المشروع' : 'Project Details'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'مدير المشروع' : 'Project Manager'}</p>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    {project.projectManager || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer'}</p>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    {project.siteEngineer || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}</p>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {formatDate(project.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'تاريخ النهاية المتوقع' : 'Expected End Date'}</p>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {formatDate(project.expectedEndDate)}
                  </p>
                </div>
              </div>
              {project.notes && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{project.notes}</p>
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    {lang === 'ar' ? 'تفصيل التكاليف' : 'Cost Breakdown'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costBreakdownData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {costBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <CostCard
                onClick={() => navigate(`/projects/material-issue/project/${id}`)}
                icon={<Package className="w-6 h-6 text-white" />}
                iconBg="from-blue-500 to-blue-600"
                title={lang === 'ar' ? 'المواد' : 'Materials'}
                subtitle={lang === 'ar' ? 'تكاليف المواد' : 'Material Costs'}
                amount={formatCurrency(project.materialCosts)}
                amountColor="text-blue-600"
                lang={lang}
              />
              <CostCard
                onClick={() => navigate(`/projects/${id}/labor`)}
                icon={<Users className="w-6 h-6 text-white" />}
                iconBg="from-orange-500 to-orange-600"
                title={lang === 'ar' ? 'العمالة' : 'Labor'}
                subtitle={lang === 'ar' ? 'تكاليف العمالة' : 'Labor Costs'}
                amount={formatCurrency(project.laborCosts)}
                amountColor="text-orange-600"
                lang={lang}
              />
              <CostCard
                onClick={() => navigate(`/projects/${id}/equipment`)}
                icon={<Truck className="w-6 h-6 text-white" />}
                iconBg="from-green-500 to-green-600"
                title={lang === 'ar' ? 'المعدات' : 'Equipment'}
                subtitle={lang === 'ar' ? 'تكاليف المعدات' : 'Equipment Costs'}
                amount={formatCurrency(project.equipmentCosts)}
                amountColor="text-green-600"
                lang={lang}
              />
              <CostCard
                onClick={() => navigate(`/projects/${id}/subcontractor-work`)}
                icon={<HardHat className="w-6 h-6 text-white" />}
                iconBg="from-amber-500 to-amber-600"
                title={lang === 'ar' ? 'المقاولين' : 'Subcontractors'}
                subtitle={lang === 'ar' ? 'أعمال المقاولين' : 'Subcontractor Work'}
                amount={formatCurrency(project.subcontractorCosts ?? 0)}
                amountColor="text-amber-600"
                lang={lang}
              />
              <CostCard
                onClick={() => navigate(`/projects/${id}/miscellaneous`)}
                icon={<DollarSign className="w-6 h-6 text-white" />}
                iconBg="from-purple-500 to-purple-600"
                title={lang === 'ar' ? 'أخرى' : 'Others'}
                subtitle={lang === 'ar' ? 'مصروفات أخرى' : 'Other Expenses'}
                amount={formatCurrency(project.otherCosts)}
                amountColor="text-purple-600"
                lang={lang}
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="space-y-6">

            {/* Contract Amount */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-500" />
                {lang === 'ar' ? 'قيمة العقد' : 'Contract Amount'}
              </h3>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(project.contractAmount)}</p>
              <p className="text-xs text-gray-500 mt-2">{lang === 'ar' ? 'المبلغ المتبقي' : 'Remaining'}</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(project.contractRemaining)}</p>
            </div>

            {/* Profit Analysis */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                {lang === 'ar' ? 'تحليل الأرباح' : 'Profit Analysis'}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'الربح المتوقع' : 'Expected Profit'}</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(project.expectedProfit)}</p>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'الربح المحقق' : 'Realized Profit'}</p>
                  <p className={`text-lg font-bold ${project.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(project.realizedProfit)}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'هامش الربح' : 'Profit Margin'}</p>
                  <p className="text-lg font-bold text-gray-900">{project.profitMargin}%</p>
                </div>
              </div>
            </div>

            {/* Financial Status */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {lang === 'ar' ? 'الحالة المالية' : 'Financial Status'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{lang === 'ar' ? 'المفوتر' : 'Invoiced'}</span>
                  <span className="font-semibold text-sm text-gray-900">{formatCurrency(project.totalInvoiced)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{lang === 'ar' ? 'المدفوع' : 'Paid'}</span>
                  <span className="font-semibold text-sm text-gray-900">{formatCurrency(project.totalPaid)}</span>
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
          onClose={() => { setShowEditModal(false); fetchProject(); }}
          fetchProjects={fetchProject}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
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
              <p className="text-xs text-gray-500 mb-1">{lang === 'ar' ? 'المشروع:' : 'Project:'}</p>
              <p className="font-medium text-gray-900 text-sm">{lang === 'ar' ? project.nameAr : project.nameEn}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => { handleDelete(); setDeleteModal(false); }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm"
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

function CostCard({ onClick, icon, iconBg, title, subtitle, amount, amountColor, lang }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all hover:border-indigo-300 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <ArrowLeft
          className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors"
          style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}
        />
      </div>
      <div className={`text-xl font-bold ${amountColor}`}>{amount}</div>
    </div>
  );
}

export default ProjectDetails;