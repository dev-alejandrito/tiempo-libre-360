// Datos oficiales de contacto de TIEMPO LIBRE 360.
export const CONTACT_EMAIL = "alejandroortizcalles@gmail.com";

// Abre la ventana de redacción de Gmail Web; el usuario revisa y presiona Enviar.
export function gmailComposeUrl(to = CONTACT_EMAIL, subject = "Contacto desde TIEMPO LIBRE 360", body = "Hola, me comunico desde TIEMPO LIBRE 360.\n\n") {
  const p = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return "https://mail.google.com/mail/?" + p.toString();
}
