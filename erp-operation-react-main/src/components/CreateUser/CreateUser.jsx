import React, { useState, useContext } from 'react';
import { UserPlus, Mail, Lock, Shield, ArrowLeft, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import FullPageLoader from '../Loader/Loader';
import { LanguageContext } from '../../context/LanguageContext';
import { toast } from 'react-toastify';

const CreateUser = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'accountant'
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = lang === 'ar' ? 'الاسم يجب أن يكون 3 أحرف على الأقل' : 'Name must be at least 3 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = lang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email format';
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match';
    }

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
        password: formData.password,
        role: formData.role
      };

      await axiosInstance.post('/create', payload);
      toast.success(lang === 'ar' ? 'تم إنشاء المستخدم بنجاح!' : 'User created successfully!');
      setTimeout(() => navigate('/users'), 1500);
    } catch (error) {
      const message = error.response?.data?.message || (lang === 'ar' ? 'فشل إنشاء المستخدم' : 'Failed to create user');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) return <FullPageLoader text={lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'} />;

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'إنشاء حساب مستخدم جديد للنظام' : 'Create a new user account for the system.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
        </div>

        {/* ── Form Card ── */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass('name')}
                placeholder={lang === 'ar' ? 'أدخل الاسم الكامل' : 'John Doe'}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass('email')}
                placeholder={lang === 'ar' ? 'أدخل البريد الإلكتروني' : 'john@company.com'}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'الدور' : 'Role'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={inputClass('role')}
              >
                <option value="accountant">{lang === 'ar' ? 'محاسب' : 'Accountant'}</option>
                <option value="manager">{lang === 'ar' ? 'مدير قسم' : 'Manager'}</option>
                <option value="admin">{lang === 'ar' ? 'مدير' : 'Admin'}</option>
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
            </div>

            {/* Password + Confirm - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={inputClass('password')}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={inputClass('confirmPassword')}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {lang === 'ar' ? 'إنشاء مستخدم' : 'Create User'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default CreateUser;