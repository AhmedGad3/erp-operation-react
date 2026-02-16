import React, { useState, useContext } from 'react';
import { UserPlus, Mail, Phone, MapPin, FileText, Building2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateClient = () => {
  const { lang, t } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    taxNumber: '',
    commercialRegister: '',
    type: 'INDIVIDUAL'
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Name Arabic validation
    if (!formData.nameAr || formData.nameAr.length < 2) {
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية يجب أن يكون حرفين على الأقل' : 'Arabic name must be at least 2 characters';
    }

    // Name English validation
    if (!formData.nameEn || formData.nameEn.length < 2) {
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية يجب أن يكون حرفين على الأقل' : 'English name must be at least 2 characters';
    }

    // Code validation
    if (!formData.code || formData.code.length < 2) {
      newErrors.code = lang === 'ar' ? 'الكود يجب أن يكون حرفين على الأقل' : 'Code must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    }

    // Phone validation
    if (formData.phone && formData.phone.length < 7) {
      newErrors.phone = lang === 'ar' ? 'رقم الهاتف يجب أن يكون 7 أرقام على الأقل' : 'Phone must be at least 7 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(lang === 'ar' ? 'يرجى إصلاح الأخطاء قبل الإرسال' : 'Please fix errors before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        code: formData.code.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        taxNumber: formData.taxNumber.trim(),
        commercialRegister: formData.commercialRegister.trim(),
        type: formData.type
      };

      await axiosInstance.post('/clients', payload);
      
      toast.success(lang === 'ar' ? 'تم إنشاء العميل بنجاح!' : 'Client created successfully!');
      
      setTimeout(() => {
        navigate('/clients');
      }, 1500);
    } catch (error) {
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء العميل' : 'Failed to create client');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Submitting Overlay */}
      {submitting && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'إضافة عميل جديد' : 'Add New Client'}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === 'ar' ? 'إنشاء ملف عميل جديد' : 'Create a new client profile'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/clients')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Names Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name (Arabic) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    errors.nameAr ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={lang === 'ar' ? 'أدخل اسم العميل بالعربية' : 'Enter client name in Arabic'}
                  dir="rtl"
                  disabled={submitting}
                />
                {errors.nameAr && <p className="mt-1 text-sm text-red-500">{errors.nameAr}</p>}
              </div>

              {/* Name (English) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    errors.nameEn ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={lang === 'ar' ? 'أدخل اسم العميل بالإنجليزية' : 'Enter client name in English'}
                  disabled={submitting}
                />
                {errors.nameEn && <p className="mt-1 text-sm text-red-500">{errors.nameEn}</p>}
              </div>
            </div>
 {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={lang === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                    disabled={submitting}
                  />
                  <Mail className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>
           

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'الهاتف' : 'Phone'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={lang === 'ar' ? 'أدخل رقم الهاتف' : 'Enter phone number'}
                    disabled={submitting}
                  />
                  <Phone className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
              </div>
 {/* Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={lang === 'ar' ? 'أدخل كود العميل' : 'Enter client code'}
                disabled={submitting}
              />
              {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
            </div>
             
            </div>

            {/* Business Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tax Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'رقم التعريف الضريبي' : 'Tax Number'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'أدخل رقم التعريف الضريبي' : 'Enter tax number'}
                    disabled={submitting}
                  />
                  <FileText className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Commercial Register */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {lang === 'ar' ? 'رقم السجل التجاري' : 'Commercial Register'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.commercialRegister}
                    onChange={(e) => setFormData({ ...formData, commercialRegister: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder={lang === 'ar' ? 'أدخل رقم السجل التجاري' : 'Enter commercial register'}
                    disabled={submitting}
                  />
                  <Building2 className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'العنوان' : 'Address'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={lang === 'ar' ? 'أدخل العنوان' : 'Enter address'}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  disabled={submitting}
                />
                <MapPin className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder={lang === 'ar' ? 'أدخل أي ملاحظات إضافية' : 'Enter any additional notes'}
                rows={4}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                disabled={submitting}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                disabled={submitting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                {lang === 'ar' ? 'إنشاء العميل' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateClient;