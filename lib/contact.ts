/** Studio contact channels, shared by the footer and the custom order form. */
export const WHATSAPP_NUMBER = "919123394109";
export const EMAIL_ADDRESS = "rockndrollricky@gmail.com";
export const INSTAGRAM_URL =
  "https://www.instagram.com/_a_r_t_speaks_?igsh=MXd2bTFwNHRoa2E2Mg==";

export function buildWhatsAppLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
