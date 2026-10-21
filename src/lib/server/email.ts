import "server-only";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!key || !from) return { delivered: false as const, reason: "email_not_configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "ShineQR parola yenileme bağlantısı",
      html: `<p>ShineQR hesabınızın parolasını yenilemek için aşağıdaki bağlantıyı kullanın.</p><p><a href="${resetUrl}">Parolamı yenile</a></p><p>Bağlantı 30 dakika geçerlidir. Bu talebi siz oluşturmadıysanız mesajı yok sayın.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`E-posta sağlayıcısı ${response.status} döndürdü.`);
  return { delivered: true as const };
}
