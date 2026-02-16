import { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  X, 
  Calendar, 
  Download, 
  Plus, 
  Edit2, 
  Trash2,
  ArrowLeft,
  Wrench,
  DollarSign,
  Truck,
  Building,
  CheckCircle,
  AlertCircle,
  Fuel,
  User as UserIcon
} from "lucide-react";
import { formatCurrency, formatDateShort } from "../../utils/dateFormat";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";
import FullPageLoader from "../Loader/Loader";
import { exportToPDF } from "../../utils/pdfExport";
import { toast } from "react-toastify";

export default function ProjectEquipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useContext(LanguageContext);
  
  const [project, setProject] = useState(null);
  const [equipmentRecords, setEquipmentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const projectRes = await axiosInstance.get(`/projects/${id}`);
      setProject(projectRes.data.result);
      
      const equipmentRes = await axiosInstance.get(`/projects/${id}/equipment`);
      const records = equipmentRes.data.result || [];
      
      setEquipmentRecords(records);
      
      if (records.length > 0) {
        const dates = records.map(r => new Date(r.startDate));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        setDateFrom(minDate.toISOString().split('T')[0]);
        setDateTo(maxDate.toISOString().split('T')[0]);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (equipmentId) => {
    try {
      await axiosInstance.delete(`/projects/${id}/equipment/${equipmentId}`);
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      fetchData();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const filteredRecords = useMemo(() => {
    return equipmentRecords.filter(record => {
      const recordDate = new Date(record.startDate);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

      if (from && recordDate < from) return false;
      if (to && recordDate > to) return false;

      return true;
    });
  }, [equipmentRecords, dateFrom, dateTo]);

  const totalRecords = filteredRecords.length;
  const totalRentalCost = filteredRecords.reduce((sum, r) => sum + (r.rentalCost || 0), 0);
  const totalOperatingCost = filteredRecords.reduce((sum, r) => sum + (r.totalOperatingCost || 0), 0);
  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  const handleExportPDF = async () => {
    try {
      const data = filteredRecords.map(record => ({
        equipment: record.equipmentSource === 'COMPANY_ASSET' 
          ? (lang === 'ar' ? record.assetId?.nameAr : record.assetId?.nameEn) || '-'
          : record.equipmentName || '-',
        type: record.equipmentSource === 'COMPANY_ASSET' 
          ? (lang === 'ar' ? 'من الشركة' : 'Company Asset')
          : (lang === 'ar' ? 'إيجار خارجي' : 'External Rental'),
        supplier: record.supplierName || '-',
        days: record.numberOfDays,
        dailyRate: formatCurrency(record.dailyRentalRate, lang),
        rentalCost: formatCurrency(record.rentalCost, lang),
        operatingCost: formatCurrency(record.totalOperatingCost, lang),
        total: formatCurrency(record.totalCost, lang),
        date: formatDateShort(record.startDate, lang)
      }));

      // إضافة صف الإجمالي
      data.push({
        equipment: lang === 'ar' ? 'الإجمالي' : 'Total',
        type: '',
        supplier: '',
        days: '',
        dailyRate: '',
        rentalCost: formatCurrency(totalRentalCost, lang),
        operatingCost: formatCurrency(totalOperatingCost, lang),
        total: formatCurrency(totalCost, lang),
        date: ''
      });

      const headers = [
        { equipment: lang === "ar" ? "المعدة" : "Equipment" },
        { type: lang === "ar" ? "النوع" : "Type" },
        { supplier: lang === "ar" ? "المورد" : "Supplier" },
        { days: lang === "ar" ? "الأيام" : "Days" },
        { dailyRate: lang === "ar" ? "السعر اليومي" : "Daily Rate" },
        { rentalCost: lang === "ar" ? "تكلفة الإيجار" : "Rental Cost" },
        { operatingCost: lang === "ar" ? "تكلفة التشغيل" : "Operating Cost" },
        { total: lang === "ar" ? "الإجمالي" : "Total" },
        { date: lang === "ar" ? "التاريخ" : "Date" }
      ];

      const title = lang === 'ar' ? 'تفاصيل المعدات - المشروع' : 'Equipment Details - Project';
      const fileName = `equipment_details_${project.code}`;
      const projectInfo = {
        name: lang === 'ar' ? project.nameAr : project.nameEn,
        code: project.code
      };

      await exportToPDF(data, headers, fileName, lang, title, projectInfo);
    toast.success(lang === "ar" ? "تم تصدير PDF بنجاح" : "PDF exported successfully");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(lang === "ar" ? "حدث خطأ أثناء تصدير PDF" : "Error exporting PDF");
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900">
            {lang === 'ar' ? 'المشروع غير موجود' : 'Project Not Found'}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {lang === 'ar' ? 'رجوع لتفاصيل المشروع' : 'Back to Project Details'}
        </button>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex justify-between items-start p-6 border-b bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                <Wrench className="w-8 h-8" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {lang === "ar" ? "تفاصيل المعدات" : "Equipment Details"}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {lang === "ar" ? "المشروع:" : "Project:"} {lang === "ar" ? project.nameAr : project.nameEn}
                </p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <span className="text-xs font-medium text-gray-600">
                    {lang === "ar" ? "إجمالي التكاليف" : "Total Cost"}
                  </span>
                  <span className="text-xl font-bold text-orange-600">
                    {formatCurrency(totalCost, lang)}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition font-semibold"
            >
              <Plus size={20} />
              {lang === 'ar' ? 'إضافة معدة' : 'Add Equipment'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                />
              </div>
              
              <span className="text-gray-400">—</span>
              
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                <Calendar size={18} className="text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm outline-none border-none bg-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <Download size={18} />
              {lang === "ar" ? "تصدير PDF" : "Export PDF"}
            </button>
          </div>

          <div className="overflow-auto max-h-[600px]">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  {lang === "ar" ? "لا توجد سجلات معدات" : "No equipment records found"}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "المعدة" : "Equipment"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "النوع" : "Type"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الأيام" : "Days"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "السعر اليومي" : "Daily Rate"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "تكلفة الإيجار" : "Rental Cost"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "التشغيل" : "Operating"}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {lang === "ar" ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            record.equipmentSource === 'COMPANY_ASSET' 
                              ? 'bg-blue-100' 
                              : 'bg-purple-100'
                          }`}>
                            {record.equipmentSource === 'COMPANY_ASSET' ? (
                              <Building size={20} className="text-blue-600" />
                            ) : (
                              <Truck size={20} className="text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {record.equipmentSource === 'COMPANY_ASSET' 
                                ? (lang === 'ar' ? record.assetId?.nameAr : record.assetId?.nameEn) || '-'
                                : record.equipmentName || '-'
                              }
                            </div>
                            {record.equipmentSource === 'COMPANY_ASSET' && record.assetId?.code && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {lang === 'ar' ? 'كود:' : 'Code:'} {record.assetId.code}
                              </div>
                            )}
                            {record.supplierName && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {lang === 'ar' ? 'المورد:' : 'Supplier:'} {record.supplierName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.equipmentSource === 'COMPANY_ASSET'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {record.equipmentSource === 'COMPANY_ASSET'
                            ? (lang === 'ar' ? 'من الشركة' : 'Company Asset')
                            : (lang === 'ar' ? 'إيجار خارجي' : 'External Rental')
                          }
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-semibold">
                          {record.numberOfDays}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(record.dailyRentalRate, lang)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-orange-600">
                          {formatCurrency(record.rentalCost, lang)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-blue-600">
                            {formatCurrency(record.totalOperatingCost, lang)}
                          </div>
                          {(record.fuelCost > 0 || record.operatorCost > 0 || record.maintenanceCost > 0) && (
                            <div className="text-xs text-gray-500">
                              {record.fuelCost > 0 && (
                                <div className="flex items-center gap-1 justify-end">
                                  <Fuel size={10} />
                                  {formatCurrency(record.fuelCost, lang)}
                                </div>
                              )}
                              {record.operatorCost > 0 && (
                                <div className="flex items-center gap-1 justify-end">
                                  <UserIcon size={10} />
                                  {formatCurrency(record.operatorCost, lang)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(record.totalCost, lang)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {formatDateShort(record.startDate, lang)}
                        </div>
                        {record.endDate && (
                          <div className="text-xs text-gray-400">
                            {lang === 'ar' ? 'إلى' : 'to'} {formatDateShort(record.endDate, lang)}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedEquipment(record);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title={lang === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEquipment(record);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t bg-gray-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "عدد المعدات" : "Total Equipment"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {totalRecords}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "تكلفة الإيجار" : "Rental Cost"}
                    </p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(totalRentalCost, lang)}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "تكلفة التشغيل" : "Operating Cost"}
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(totalOperatingCost, lang)}
                    </p>
                  </div>

                  <div className="h-12 w-px bg-gray-300"></div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === "ar" ? "الإجمالي الكلي" : "Grand Total"}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(totalCost, lang)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/projects/${id}`)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  {lang === "ar" ? "رجوع" : "Back"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                  {lang === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'المعدة:' : 'Equipment:'}</p>
              <p className="font-semibold text-gray-900">
                {selectedEquipment.equipmentSource === 'COMPANY_ASSET'
                  ? (lang === 'ar' ? selectedEquipment.assetId?.nameAr : selectedEquipment.assetId?.nameEn)
                  : selectedEquipment.equipmentName
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEquipment(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDelete(selectedEquipment._id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && <AddEquipmentModal />}
      {showEditModal && <EditEquipmentModal />}
    </div>
  );

  function AddEquipmentModal() {
    const [formData, setFormData] = useState({
      equipmentSource: 'EXTERNAL_RENTAL',
      equipmentName: '',
      assetId: '',
      supplierName: '',
      startDate: '',
      endDate: '',
      numberOfDays: '',
      dailyRentalRate: '',
      fuelCost: '',
      operatorCost: '',
      maintenanceCost: '',
      notes: ''
    });
    const [assets, setAssets] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (formData.equipmentSource === 'COMPANY_ASSET') {
        fetchAssets();
      }
    }, [formData.equipmentSource]);

    useEffect(() => {
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        setFormData(prev => ({ ...prev, numberOfDays: days > 0 ? days : '' }));
      }
    }, [formData.startDate, formData.endDate]);

    const fetchAssets = async () => {
      try {
        const response = await axiosInstance.get('/assets');
        setAssets(response.data.result || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        setSubmitting(true);
        
        const payload = {
          equipmentSource: formData.equipmentSource,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          numberOfDays: parseInt(formData.numberOfDays),
          dailyRentalRate: parseFloat(formData.dailyRentalRate),
          fuelCost: parseFloat(formData.fuelCost) || 0,
          operatorCost: parseFloat(formData.operatorCost) || 0,
          maintenanceCost: parseFloat(formData.maintenanceCost) || 0,
          notes: formData.notes.trim() || undefined
        };

        if (formData.equipmentSource === 'COMPANY_ASSET') {
          payload.assetId = formData.assetId;
        } else {
          payload.equipmentName = formData.equipmentName.trim();
          payload.supplierName = formData.supplierName.trim() || undefined;
        }

        await axiosInstance.post(`/projects/${id}/equipment`, payload);
        
        toast.success(lang === 'ar' ? 'تم إضافة المعدة بنجاح' : 'Equipment added successfully');
        setShowAddModal(false);
        fetchData();
        
      } catch (error) {
        console.error('Error adding equipment:', error);
        toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل إضافة المعدة' : 'Failed to add equipment'));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-600 to-orange-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {lang === 'ar' ? 'إضافة معدة جديدة' : 'Add New Equipment'}
              </h3>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Equipment Source */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'مصدر المعدة' : 'Equipment Source'} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, equipmentSource: 'COMPANY_ASSET', equipmentName: '', supplierName: '' })}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition ${
                    formData.equipmentSource === 'COMPANY_ASSET'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <Building className={`w-6 h-6 ${formData.equipmentSource === 'COMPANY_ASSET' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{lang === 'ar' ? 'من الشركة' : 'Company Asset'}</div>
                    <div className="text-xs text-gray-500">{lang === 'ar' ? 'أصول الشركة' : 'Company owned'}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, equipmentSource: 'EXTERNAL_RENTAL', assetId: '' })}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg transition ${
                    formData.equipmentSource === 'EXTERNAL_RENTAL'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <Truck className={`w-6 h-6 ${formData.equipmentSource === 'EXTERNAL_RENTAL' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{lang === 'ar' ? 'إيجار خارجي' : 'External Rental'}</div>
                    <div className="text-xs text-gray-500">{lang === 'ar' ? 'من مورد خارجي' : 'From supplier'}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Equipment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.equipmentSource === 'COMPANY_ASSET' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'الأصل' : 'Asset'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">{lang === 'ar' ? 'اختر أصل' : 'Select asset'}</option>
                    {assets.map(asset => (
                      <option key={asset._id} value={asset._id}>
                        {lang === 'ar' ? asset.nameAr : asset.nameEn} ({asset.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'اسم المعدة' : 'Equipment Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.equipmentName}
                      onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={lang === 'ar' ? 'أدخل اسم المعدة' : 'Enter equipment name'}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={lang === 'ar' ? 'أدخل اسم المورد' : 'Enter supplier name'}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'عدد الأيام' : 'Number of Days'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.numberOfDays}
                  onChange={(e) => setFormData({ ...formData, numberOfDays: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Costs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'السعر اليومي' : 'Daily Rental Rate'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.dailyRentalRate}
                    onChange={(e) => setFormData({ ...formData, dailyRentalRate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                  <DollarSign className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تكلفة الوقود' : 'Fuel Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.fuelCost}
                    onChange={(e) => setFormData({ ...formData, fuelCost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <Fuel className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تكلفة المشغل' : 'Operator Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.operatorCost}
                    onChange={(e) => setFormData({ ...formData, operatorCost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <UserIcon className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تكلفة الصيانة' : 'Maintenance Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.maintenanceCost}
                    onChange={(e) => setFormData({ ...formData, maintenanceCost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <Wrench className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
                rows={3}
              />
            </div>

            {/* Cost Summary */}
            {formData.dailyRentalRate && formData.numberOfDays && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {lang === 'ar' ? 'تكلفة الإيجار:' : 'Rental Cost:'}
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(parseFloat(formData.dailyRentalRate) * parseInt(formData.numberOfDays || 0), lang)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {lang === 'ar' ? 'تكلفة التشغيل:' : 'Operating Cost:'}
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(
                      (parseFloat(formData.fuelCost) || 0) + 
                      (parseFloat(formData.operatorCost) || 0) + 
                      (parseFloat(formData.maintenanceCost) || 0),
                      lang
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t-2 border-orange-300 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'الإجمالي:' : 'Total:'}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(
                      (parseFloat(formData.dailyRentalRate) * parseInt(formData.numberOfDays || 0)) +
                      (parseFloat(formData.fuelCost) || 0) + 
                      (parseFloat(formData.operatorCost) || 0) + 
                      (parseFloat(formData.maintenanceCost) || 0),
                      lang
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function EditEquipmentModal() {
    const [formData, setFormData] = useState({
      equipmentSource: selectedEquipment?.equipmentSource || 'EXTERNAL_RENTAL',
      equipmentName: selectedEquipment?.equipmentName || '',
      assetId: selectedEquipment?.assetId?._id || '',
      supplierName: selectedEquipment?.supplierName || '',
      startDate: selectedEquipment?.startDate?.split('T')[0] || '',
      endDate: selectedEquipment?.endDate?.split('T')[0] || '',
      numberOfDays: selectedEquipment?.numberOfDays || '',
      dailyRentalRate: selectedEquipment?.dailyRentalRate || '',
      fuelCost: selectedEquipment?.fuelCost || '',
      operatorCost: selectedEquipment?.operatorCost || '',
      maintenanceCost: selectedEquipment?.maintenanceCost || '',
      notes: selectedEquipment?.notes || ''
    });
    const [assets, setAssets] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (formData.equipmentSource === 'COMPANY_ASSET') {
        fetchAssets();
      }
    }, [formData.equipmentSource]);

    useEffect(() => {
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        setFormData(prev => ({ ...prev, numberOfDays: days > 0 ? days : '' }));
      }
    }, [formData.startDate, formData.endDate]);

    const fetchAssets = async () => {
      try {
        const response = await axiosInstance.get('/assets');
        setAssets(response.data.result || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        setSubmitting(true);
        
        const payload = {
          equipmentSource: formData.equipmentSource,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          numberOfDays: parseInt(formData.numberOfDays),
          dailyRentalRate: parseFloat(formData.dailyRentalRate),
          fuelCost: parseFloat(formData.fuelCost) || 0,
          operatorCost: parseFloat(formData.operatorCost) || 0,
          maintenanceCost: parseFloat(formData.maintenanceCost) || 0,
          notes: formData.notes.trim() || undefined
        };

        if (formData.equipmentSource === 'COMPANY_ASSET') {
          payload.assetId = formData.assetId;
        } else {
          payload.equipmentName = formData.equipmentName.trim();
          payload.supplierName = formData.supplierName.trim() || undefined;
        }

        await axiosInstance.patch(`/projects/${id}/equipment/${selectedEquipment._id}`, payload);
        
        toast.success(lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully');
        setShowEditModal(false);
        setSelectedEquipment(null);
        fetchData();
        
      } catch (error) {
        console.error('Error updating equipment:', error);
        toast.error(error.response?.data?.message || (lang === 'ar' ? 'فشل التحديث' : 'Failed to update'));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {lang === 'ar' ? 'تعديل المعدة' : 'Edit Equipment'}
              </h3>
            </div>
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedEquipment(null);
              }}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Equipment Source (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'مصدر المعدة' : 'Equipment Source'}
              </label>
              <div className={`flex items-center gap-3 p-4 border-2 rounded-lg ${
                formData.equipmentSource === 'COMPANY_ASSET'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-purple-600 bg-purple-50'
              }`}>
                {formData.equipmentSource === 'COMPANY_ASSET' ? (
                  <>
                    <Building className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">{lang === 'ar' ? 'من الشركة' : 'Company Asset'}</div>
                      <div className="text-xs text-gray-500">{lang === 'ar' ? 'أصول الشركة' : 'Company owned'}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Truck className="w-6 h-6 text-purple-600" />
                    <div>
                      <div className="font-semibold text-gray-900">{lang === 'ar' ? 'إيجار خارجي' : 'External Rental'}</div>
                      <div className="text-xs text-gray-500">{lang === 'ar' ? 'من مورد خارجي' : 'From supplier'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Equipment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.equipmentSource === 'COMPANY_ASSET' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {lang === 'ar' ? 'الأصل' : 'Asset'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{lang === 'ar' ? 'اختر أصل' : 'Select asset'}</option>
                    {assets.map(asset => (
                      <option key={asset._id} value={asset._id}>
                        {lang === 'ar' ? asset.nameAr : asset.nameEn} ({asset.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'اسم المعدة' : 'Equipment Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.equipmentName}
                      onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={lang === 'ar' ? 'أدخل اسم المعدة' : 'Enter equipment name'}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'اسم المورد' : 'Supplier Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={lang === 'ar' ? 'أدخل اسم المورد' : 'Enter supplier name'}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ البداية' : 'Start Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'عدد الأيام' : 'Number of Days'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.numberOfDays}
                  onChange={(e) => setFormData({ ...formData, numberOfDays: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Costs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'السعر اليومي' : 'Daily Rental Rate'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.dailyRentalRate}
                    onChange={(e) => setFormData({ ...formData, dailyRentalRate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                  <DollarSign className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تكلفة الوقود' : 'Fuel Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.fuelCost}
                    onChange={(e) => setFormData({ ...formData, fuelCost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <Fuel className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تكلفة المشغل' : 'Operator Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.operatorCost}
                    onChange={(e) => setFormData({ ...formData, operatorCost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <UserIcon className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'تكلفة الصيانة' : 'Maintenance Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.maintenanceCost}
                    onChange={(e) => setFormData({ ...formData, maintenanceCost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  <Wrench className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={lang === 'ar' ? 'أدخل ملاحظات' : 'Enter notes'}
                rows={3}
              />
            </div>

            {/* Cost Summary */}
            {formData.dailyRentalRate && formData.numberOfDays && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {lang === 'ar' ? 'تكلفة الإيجار:' : 'Rental Cost:'}
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(parseFloat(formData.dailyRentalRate) * parseInt(formData.numberOfDays || 0), lang)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {lang === 'ar' ? 'تكلفة التشغيل:' : 'Operating Cost:'}
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(
                      (parseFloat(formData.fuelCost) || 0) + 
                      (parseFloat(formData.operatorCost) || 0) + 
                      (parseFloat(formData.maintenanceCost) || 0),
                      lang
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t-2 border-blue-300 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {lang === 'ar' ? 'الإجمالي:' : 'Total:'}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(
                      (parseFloat(formData.dailyRentalRate) * parseInt(formData.numberOfDays || 0)) +
                      (parseFloat(formData.fuelCost) || 0) + 
                      (parseFloat(formData.operatorCost) || 0) + 
                      (parseFloat(formData.maintenanceCost) || 0),
                      lang
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEquipment(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تحديث' : 'Update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}