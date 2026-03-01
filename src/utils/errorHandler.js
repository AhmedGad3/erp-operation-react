function getCurrentLang() {
  try {
    return localStorage.getItem("lang") || "en";
  } catch {
    return "en";
  }
}

function statusFallback(status, lang) {
  const isAr = lang === "ar";
  const map = {
    400: isAr ? "بيانات الطلب غير صحيحة. يرجى مراجعة المدخلات." : "Invalid request data. Please review your input.",
    401: isAr ? "انتهت الجلسة أو تسجيل الدخول غير صحيح. يرجى تسجيل الدخول مرة أخرى." : "Session expired or invalid login. Please sign in again.",
    403: isAr ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.",
    404: isAr ? "العنصر المطلوب غير موجود أو تم حذفه." : "The requested resource was not found or may have been removed.",
    409: isAr ? "تعارض في البيانات: قد يكون العنصر موجوداً بالفعل." : "Data conflict: the item may already exist.",
    422: isAr ? "البيانات المقدمة غير مكتملة أو غير صحيحة." : "Provided data is incomplete or invalid.",
    429: isAr ? "عدد الطلبات كثير جداً. يرجى المحاولة بعد قليل." : "Too many requests. Please try again shortly.",
    500: isAr ? "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى." : "Server error occurred. Please try again later.",
    502: isAr ? "الخدمة غير متاحة مؤقتاً (Gateway Error)." : "Service is temporarily unavailable (gateway error).",
    503: isAr ? "الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً." : "Service is currently unavailable. Please try again later.",
    504: isAr ? "انتهت مهلة الاستجابة من الخادم. يرجى المحاولة مرة أخرى." : "Server timeout. Please try again.",
  };
  return map[status];
}

function normalizeValidationMessage(message) {
  if (!Array.isArray(message)) return null;
  const parts = message.filter((m) => typeof m === "string" && m.trim());
  return parts.length ? parts.join(" - ") : null;
}

function extractServerMessage(data) {
  if (!data) return null;

  if (typeof data === "string" && data.trim()) return data;

  const fromArray = normalizeValidationMessage(data.message);
  if (fromArray) return fromArray;

  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (typeof data.details === "string" && data.details.trim()) return data.details;

  if (Array.isArray(data.errors) && data.errors.length) {
    const flat = data.errors
      .map((e) => (typeof e === "string" ? e : e?.message))
      .filter((m) => typeof m === "string" && m.trim());
    if (flat.length) return flat.join(" - ");
  }

  return null;
}

export function getErrorMessage(error, fallback = "Something went wrong") {
  const lang = getCurrentLang();
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (!error?.response) {
    const raw = (error?.message || "").toLowerCase();
    if (raw.includes("network") || raw.includes("failed to fetch")) {
      return lang === "ar"
        ? "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً."
        : "Could not reach the server. Check your internet connection and try again.";
    }
    if (raw.includes("timeout")) {
      return lang === "ar"
        ? "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى."
        : "Request timed out. Please try again.";
    }
    return error?.message || fallback;
  }

  const serverMsg = extractServerMessage(data);
  if (serverMsg) return serverMsg;

  const byStatus = statusFallback(status, lang);
  if (byStatus) return byStatus;

  return fallback;
}
