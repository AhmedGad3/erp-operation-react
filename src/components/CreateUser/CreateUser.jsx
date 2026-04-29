import { useContext, useState } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LanguageContext } from "../../context/LanguageContext";
import axiosInstance from "../../utils/axiosInstance";
import { getErrorMessage } from "../../utils/axiosInstance";
import { validateCreateUserInput } from "../../utils/userValidation";
import FullPageLoader from "../Loader/Loader";

const CreateUser = () => {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "accountant",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const nextErrors = validateCreateUserInput(formData, lang, {
      requireConfirmPassword: true,
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(
        lang === "ar"
          ? "يرجى إصلاح الأخطاء قبل الإرسال"
          : "Please fix errors before submitting"
      );
      return;
    }

    try {
      setSubmitting(true);
      await axiosInstance.post("/create", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });
      toast.success(
        lang === "ar"
          ? "تم إنشاء المستخدم بنجاح!"
          : "User created successfully!"
      );
      setTimeout(() => navigate("/users"), 1500);
    } catch (error) {
      const message = getErrorMessage(
        error,
        lang === "ar" ? "فشل إنشاء المستخدم" : "Failed to create user"
      );
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <FullPageLoader
        text={lang === "ar" ? "جاري المعالجة..." : "Processing..."}
      />
    );
  }

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-gray-50 ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lang === "ar" ? "إضافة مستخدم جديد" : "Add New User"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lang === "ar"
                ? "إنشاء حساب مستخدم جديد للنظام"
                : "Create a new user account for the system."}
            </p>
          </div>
          <button
            onClick={() => navigate("/users")}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === "ar" ? "رجوع" : "Back"}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === "ar" ? "الاسم الكامل" : "Full Name"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={inputClass("name")}
                placeholder={lang === "ar" ? "أدخل الاسم الكامل" : "John Doe"}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === "ar" ? "البريد الإلكتروني" : "Email"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={inputClass("email")}
                placeholder={
                  lang === "ar"
                    ? "أدخل البريد الإلكتروني"
                    : "john@company.com"
                }
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === "ar" ? "الدور" : "Role"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className={inputClass("role")}
              >
                <option value="accountant">
                  {lang === "ar" ? "محاسب" : "Accountant"}
                </option>
                <option value="manager">
                  {lang === "ar" ? "مدير قسم" : "Manager"}
                </option>
                <option value="admin">
                  {lang === "ar" ? "مدير" : "Admin"}
                </option>
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-red-500">{errors.role}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "ar" ? "كلمة المرور" : "Password"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={inputClass("password")}
                  placeholder="********"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  className={inputClass("confirmPassword")}
                  placeholder="********"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/users")}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {lang === "ar" ? "إنشاء مستخدم" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
