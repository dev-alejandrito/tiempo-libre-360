// Datos oficiales de contacto de TIEMPO LIBRE 360.
export const CONTACT_PHONE_DISPLAY = "55 3677 6271";
export const CONTACT_PHONE_TEL = "+525536776271";
// Formato internacional de México (+52 55 3677 6271): solo dígitos, sin espacios ni signos.
export const CONTACT_WHATSAPP_NUMBER = "525536776271";
export const CONTACT_WHATSAPP_MESSAGE = "Hola, estoy interesado en conocer más sobre TIEMPO LIBRE 360";
export const CONTACT_WHATSAPP_URL = "https://wa.me/" + CONTACT_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(CONTACT_WHATSAPP_MESSAGE);
export const CONTACT_EMAIL = "alejandroortizcalles@gmail.com";

// Abre la ventana de redacción de Gmail Web; el usuario revisa y presiona Enviar.
export function gmailComposeUrl(to = CONTACT_EMAIL, subject = "Contacto desde TIEMPO LIBRE 360", body = "Hola, me comunico desde TIEMPO LIBRE 360.\n\n") {
  const p = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return "https://mail.google.com/mail/?" + p.toString();
}
