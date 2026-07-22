/** Studio contact channels, shared by the footer and the custom order form. */
export const WHATSAPP_NUMBER = "919123394109";
export const EMAIL_ADDRESS = "rockndrollricky@gmail.com";
export const INSTAGRAM_URL =
  "https://www.instagram.com/_a_r_t_speaks_?igsh=MXd2bTFwNHRoa2E2Mg==";

/**
 * Builds a WhatsApp click-to-chat link to the studio number, optionally
 * pre-filling `message`. Uses the `api.whatsapp.com/send` universal endpoint
 * rather than `wa.me` because it carries the pre-filled text more reliably
 * across the mobile app and WhatsApp Web/Desktop. Note: this only *pre-fills*
 * the message — the sender still has to press send in WhatsApp.
 */
export function buildWhatsAppLink(message?: string): string {
  const base = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}`;
  return message ? `${base}&text=${encodeURIComponent(message)}` : base;
}
