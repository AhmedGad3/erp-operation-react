import React, { useState, useEffect, useContext } from 'react';
import { Edit, Mail, Shield, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const EditUser = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'accountant'
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/user/${id}`);
      const user = response.data;
      
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'accountant'
      });
    } catch (error) {
      console.error('Fetch user error:', error);
      toast.error(lang === 'ar' ? 'فشل تحميل بيانات المستخدم' : 'Failed to load user data');
      setTimeout(() => navigate('/users'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = lang === 'ar' ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = lang === 'ar' ? 'الدور مطلوب' : 'Role is required';
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
        name: formData.name,
        email: formData.email,
        role: formData.role
      };

      await axiosInstance.patch(`/user/${id}`, payload);
      
      toast.success(lang === 'ar' ? 'تم تحديث المستخدم بنجاح!' : 'User updated successfully!');
      
      setTimeout(() => {
        navigate('/users');
      }, 1500);
    } catch (error) {
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل تحديث المستخدم' : 'Failed to update user');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FullPageLoader text={lang === "ar" ? "جاري تحميل البيانات..." : "Loading data..."} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      {/* Toast */}

      {/* Submitting Overlay */}
      {submitting && <FullPageLoader text={lang === "ar" ? "جاري المعالجة..." : "Processing..."} />}

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {lang === 'ar' ? 'تعديل المستخدم' : 'Edit User'}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {lang === 'ar' ? 'تحديث بيانات المستخدم' : 'Update user information'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/users')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الاسم' : 'Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={lang === 'ar' ? 'أدخل اسم المستخدم' : 'Enter user name'}
                disabled={submitting}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} <span className="text-red-500">*</span>
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

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {lang === 'ar' ? 'الدور' : 'Role'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="accountant">{lang === 'ar' ? '💼 محاسب' : '💼 Accountant'}</option>
                  <option value="manager">{lang === 'ar' ? '📊 مدير قسم' : '📊 Manager'}</option>
                  <option value="admin">{lang === 'ar' ? '👑 مدير' : '👑 Admin'}</option>
                </select>
                <Shield className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-blue-800">
                <strong>{lang === 'ar' ? 'ملاحظة:' : 'Note:'}</strong>{' '}
                {lang === 'ar' 
                  ? 'لا يمكن تغيير كلمة المرور من هنا. إذا كنت بحاجة لتغيير كلمة المرور، يرجى الاتصال بالمسؤول.'
                  : 'Password cannot be changed from here. If you need to change the password, please contact the administrator.'}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/users')}
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
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Edit className="w-5 h-5" />
                    {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUser;