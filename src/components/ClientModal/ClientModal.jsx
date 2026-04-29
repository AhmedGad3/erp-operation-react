import React, { useState, useContext } from 'react';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance, { getErrorMessage } from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import { createAutoCode } from '../../utils/autoCode';

const CreateClient = () => {
  const { lang } = useContext(LanguageContext);
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
    type: 'INDIVIDUAL',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  React.useEffect(() => {
    if (codeTouched) return;
    setFormData((prev) => ({
      ...prev,
      code: createAutoCode(prev.nameEn || prev.nameAr, 'CLT'),
    }));
  }, [formData.nameAr, formData.nameEn, codeTouched]);

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const setCode = (value) => {
    setCodeTouched(true);
    set('code', value.toUpperCase());
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nameAr || formData.nameAr.length < 2) {
      newErrors.nameAr = lang === 'ar' ? 'الاسم بالعربية يجب أن يكون حرفين على الأقل' : 'Arabic name must be at least 2 characters';
    }
    if (!formData.nameEn || formData.nameEn.length < 2) {
      newErrors.nameEn = lang === 'ar' ? 'الاسم بالإنجليزية يجب أن يكون حرفين على الأقل' : 'English name must be at least 2 characters';
    }
    if (!formData.code || formData.code.length < 2) {
      newErrors.code = lang === 'ar' ? 'الكود يجب أن يكون حرفين على الأقل' : 'Code must be at least 2 characters';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    }
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
      await axiosInstance.post('/clients', {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        code: formData.code.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        taxNumber: formData.taxNumber.trim(),
        commercialRegister: formData.commercialRegister.trim(),
        type: formData.type,
      });
      toast.success(lang === 'ar' ? 'تم إنشاء العميل بنجاح!' : 'Client created successfully!');
      setTimeout(() => navigate('/clients'), 1500);
    } catch (error) {
      toast.error(getErrorMessage(error, lang === 'ar' ? 'فشل إنشاء العميل' : 'Failed to create client'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 ${
      hasError ? 'border-red-400' : 'border-gray-200'
    }`;

  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'إضافة عميل جديد' : 'Add New Client'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'ابدأ بالاسم والكود ووسيلة التواصل الأساسية، وأضف الباقي عند الحاجة' : 'Start with the basics and add the rest only when needed'}
            </p>
          </div>
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition font-semibold text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              {lang === 'ar' ? 'البيانات الأساسية' : 'Core Details'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => set('nameAr', e.target.value)}
                  className={inputCls(errors.nameAr)}
                  placeholder={lang === 'ar' ? 'أدخل اسم العميل بالعربية' : 'Enter client name in Arabic'}
                  dir="rtl"
                  disabled={submitting}
                />
                {errors.nameAr && <p className="mt-1 text-xs text-red-500">{errors.nameAr}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => set('nameEn', e.target.value)}
                  className={inputCls(errors.nameEn)}
                  placeholder={lang === 'ar' ? 'أدخل اسم العميل بالإنجليزية' : 'Enter client name in English'}
                  disabled={submitting}
                />
                {errors.nameEn && <p className="mt-1 text-xs text-red-500">{errors.nameEn}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الكود' : 'Code'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setCode(e.target.value)}
                  className={inputCls(errors.code)}
                  placeholder="CLT-ALFA-TRADING"
                  disabled={submitting}
                />
                {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'الهاتف' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputCls(errors.phone)}
                  placeholder={lang === 'ar' ? 'أدخل رقم الهاتف' : 'Enter phone number'}
                  disabled={submitting}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <button
              type="button"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              {showMoreDetails
                ? (lang === 'ar' ? 'إخفاء التفاصيل الإضافية' : 'Hide optional details')
                : (lang === 'ar' ? 'إضافة تفاصيل اختيارية' : 'Add optional details')}
            </button>

            {showMoreDetails && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={inputCls(errors.email)}
                      placeholder={lang === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                      disabled={submitting}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'النوع' : 'Type'}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => set('type', e.target.value)}
                      className={inputCls(false)}
                      disabled={submitting}
                    >
                      <option value="INDIVIDUAL">{lang === 'ar' ? 'فرد' : 'Individual'}</option>
                      <option value="COMPANY">{lang === 'ar' ? 'شركة' : 'Company'}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'العنوان' : 'Address'}
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => set('address', e.target.value)}
                      className={inputCls(false)}
                      placeholder={lang === 'ar' ? 'أدخل العنوان' : 'Enter address'}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'رقم التعريف الضريبي' : 'Tax Number'}
                    </label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => set('taxNumber', e.target.value)}
                      className={inputCls(false)}
                      placeholder={lang === 'ar' ? 'أدخل رقم التعريف الضريبي' : 'Enter tax number'}
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'ar' ? 'رقم السجل التجاري' : 'Commercial Register'}
                    </label>
                    <input
                      type="text"
                      value={formData.commercialRegister}
                      onChange={(e) => set('commercialRegister', e.target.value)}
                      className={inputCls(false)}
                      placeholder={lang === 'ar' ? 'أدخل رقم السجل التجاري' : 'Enter commercial register'}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 resize-none"
                    placeholder={lang === 'ar' ? 'أدخل أي ملاحظات إضافية' : 'Enter any additional notes'}
                    rows={3}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/clients')}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold text-sm"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {lang === 'ar' ? 'إنشاء العميل' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClient;
