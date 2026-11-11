export function loginErrorMessage(error: { status?: number | undefined; code?: string | undefined; name?: string | undefined }) {
  if (error.code === "invalid_credentials") return "ایمیل یا رمز عبور نادرست است";
  if (error.code === "email_not_confirmed") return "لطفاً ابتدا ایمیل خود را تأیید کنید.";
  if (error.status === 429) return "تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
  if (!error.status || error.status >= 500 || error.name === "AuthRetryableFetchError") {
    return "خطا در اتصال به سرور. لطفاً کمی بعد دوباره تلاش کنید.";
  }
  return "ورود انجام نشد. لطفاً اطلاعات حساب را بررسی کنید.";
}