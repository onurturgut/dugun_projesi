export const LOAD_PARTNER_ID = "load-test-partner";
export const LOAD_EVENT_ID = "00000000-0000-4000-8000-000000000001";
export const LOAD_USER_ID = "00000000-0000-4000-8000-000000000002";
export const LOAD_EVENT_SLUG = "temsili-yuk-testi";
export const LOAD_USERNAME = "load-test-owner";

export function requireLoadTestConfirmation() {
  if (process.env.LOAD_TEST_CONFIRM !== "YES")
    throw new Error(
      "Güvenlik için LOAD_TEST_CONFIRM=YES ayarlanmalıdır.",
    );
}

export function loadTestPassword() {
  const password = process.env.LOAD_TEST_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("LOAD_TEST_PASSWORD en az 12 karakter olmalıdır.");
  return password;
}
