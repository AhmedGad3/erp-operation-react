import { useContext, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "../ui/button";
import axiosInstance from "../../utils/axiosInstance";
import { LanguageContext } from "../../context/LanguageContext";

export default function SupplierModal({ 
  formData, 
  setFormData, 
  onClose, 
  fetchSuppliers,
  editing 
}) {
    const { lang, t } = useContext(LanguageContext);
  
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nameAr?.trim() && !formData.nameEn?.trim()) {
      toast.error(t?.supplierNameRequired || "Supplier name is required", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nameAr: formData.nameAr?.trim() || "",
        nameEn: formData.nameEn?.trim() || "",
        code: formData.code?.trim() || "",
        phone: formData.phone?.trim() || "",
        email: formData.email?.trim() || "",
        address: formData.address?.trim() || "",
        notes: formData.notes?.trim() || "",
      };

      if (editing) {
        // Get supplier ID from formData or use a different approach
        const supplierId = formData._id || formData.id;
        await axiosInstance.put(`/suppliers/${supplierId}`, payload);
        toast.success(t?.supplierUpdated || "Supplier updated successfully", {
          position: "top-right",
          autoClose: 2000,
        });
      } else {
        await axiosInstance.post("/suppliers", payload);
        toast.success(t?.supplierAdded || "Supplier added successfully", {
          position: "top-right",
          autoClose: 2000,
        });
      }
      
      onClose();
      await fetchSuppliers();
      
    } catch (err) {
      console.error("Error saving supplier:", err);
      
      let errorMsg = "Error saving supplier";
      
      if (err.response?.data?.message && Array.isArray(err.response.data.message)) {
        errorMsg = err.response.data.message.join(", ");
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-[500px] shadow-2xl my-8 max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
            <h3 className="text-xl font-bold">
              {editing ? (t?.editSupplier || "Edit Supplier") : (t?.addSupplier || "Add Supplier")}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={saving}
            >
              <X size={24} />
            </button>
          </div>

          {/* Form Fields */}
          <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.nameAr || "Name (Arabic)"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t?.nameAr || "Name (Arabic)"}
                value={formData.nameAr}
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.nameEn || "Name (English)"}
              </label>
              <input
                type="text"
                placeholder={t?.nameEn || "Name (English)"}
                value={formData.nameEn}
                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.code || "Code"}
              </label>
              <input
                type="text"
                placeholder={t?.code || "Code"}
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.phone || "Phone"}
              </label>
              <input
                type="text"
                placeholder={t?.phone || "Phone"}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.email || "Email"}
              </label>
              <input
                type="email"
                placeholder={t?.email || "Email"}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.address || "Address"}
              </label>
              <input
                type="text"
                placeholder={t?.address || "Address"}
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir={lang === "ar" ? "rtl" : "ltr"}
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t?.notes || "Notes"}
              </label>
              <textarea
                placeholder={t?.notes || "Notes"}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                dir={lang === "ar" ? "rtl" : "ltr"}
                disabled={saving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-4 py-2"
              disabled={saving}
            >
              {t?.cancel || "Cancel"}
            </Button>
            <Button 
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {lang === "ar" ? "جاري الحفظ..." : "Saving..."}
                </div>
              ) : (
                <>{t?.save || "Save"}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}