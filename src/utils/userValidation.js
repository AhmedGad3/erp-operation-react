const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const tr = (lang, ar, en) => (lang === "ar" ? ar : en);

export function validateCreateUserInput(
  formData,
  lang,
  { requireConfirmPassword = false } = {}
) {
  const errors = {};

  if (!formData.name?.trim() || formData.name.trim().length < 3) {
    errors.name = tr(
      lang,
      "الاسم يجب أن يكون 3 أحرف على الأقل",
      "Name must be at least 3 characters"
    );
  }

  if (!formData.email?.trim()) {
    errors.email = tr(lang, "البريد الإلكتروني مطلوب", "Email is required");
  } else if (!emailRegex.test(formData.email.trim())) {
    errors.email = tr(
      lang,
      "البريد الإلكتروني غير صحيح",
      "Invalid email format"
    );
  }

  if (!formData.password) {
    errors.password = tr(
      lang,
      "كلمة المرور مطلوبة",
      "Password is required"
    );
  } else if (!strongPasswordRegex.test(formData.password)) {
    errors.password = tr(
      lang,
      "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم ورمز",
      "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol"
    );
  }

  if (!formData.role) {
    errors.role = tr(lang, "الدور مطلوب", "Role is required");
  }

  if (requireConfirmPassword && formData.password !== formData.confirmPassword) {
    errors.confirmPassword = tr(
      lang,
      "كلمتا المرور غير متطابقتين",
      "Passwords do not match"
    );
  }

  return errors;
}
