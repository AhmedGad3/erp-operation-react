import { CheckCircle, Trash2 } from "lucide-react";

const AR_ACTION = {
  delete: {
    title: "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0630\u0641",
    message: "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627",
    confirm: "\u062d\u0630\u0641",
  },
  activate: {
    title: "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0641\u0639\u064a\u0644",
    message:
      "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062a\u0641\u0639\u064a\u0644 \u0647\u0630\u0627",
    confirm: "\u062a\u0641\u0639\u064a\u0644",
  },
  deactivate: {
    title: "\u062a\u0623\u0643\u064a\u062f \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0641\u0639\u064a\u0644",
    message:
      "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0625\u0644\u063a\u0627\u0621 \u062a\u0641\u0639\u064a\u0644 \u0647\u0630\u0627",
    confirm: "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0641\u0639\u064a\u0644",
  },
};

const EN_ACTION = {
  delete: {
    title: "Confirm Delete",
    message: "Are you sure you want to delete this",
    confirm: "Delete",
  },
  activate: {
    title: "Confirm Activation",
    message: "Are you sure you want to activate this",
    confirm: "Activate",
  },
  deactivate: {
    title: "Confirm Deactivation",
    message: "Are you sure you want to deactivate this",
    confirm: "Deactivate",
  },
};

export default function AdminActionModal({
  type = "delete",
  lang = "en",
  entityLabelEn = "item",
  entityLabelAr = "\u0639\u0646\u0635\u0631",
  itemName,
  itemSubtitle,
  onClose,
  onConfirm,
}) {
  const isAr = lang === "ar";
  const isNegative = type === "delete" || type === "deactivate";
  const labels = (isAr ? AR_ACTION : EN_ACTION)[type] || EN_ACTION.delete;
  const entityLabel = isAr ? entityLabelAr : entityLabelEn;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isNegative ? "bg-red-100" : "bg-green-100"
            }`}
          >
            {isNegative ? (
              <Trash2 className="w-5 h-5 text-red-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900">{labels.title}</h3>
            <p className="text-sm text-gray-500">
              {labels.message} {entityLabel}?
            </p>
          </div>
        </div>

        {(itemName || itemSubtitle) && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            {itemName && <p className="font-medium text-gray-900 text-sm">{itemName}</p>}
            {itemSubtitle && <p className="text-xs text-gray-500">{itemSubtitle}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            {isAr ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl transition font-medium text-sm ${
              isNegative ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
