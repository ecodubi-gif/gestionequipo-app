// Ayudas del inicio de sesión.

// Intenta entrar con la contraseña tal cual. Si falla y tenía espacios al principio o al final (es muy
// fácil que se cuelen al copiar y pegar una contraseña de un mensaje), lo intenta una vez sin ellos.
export async function entrarConReintento(iniciar, email, password) {
  try {
    return await iniciar(email, password);
  } catch (err) {
    const limpia = password.trim();
    if (limpia.length > 0 && limpia !== password) return iniciar(email, limpia);
    throw err;
  }
}

// Qué se ha enviado, sin enseñar la contraseña: sirve para ver a simple vista si el email lleva algo raro
// o si la contraseña tiene más caracteres de los que se tecleaban.
export function describirEnvio(email, password) {
  return `Se envió: ${email} · contraseña de ${password.length} caracteres`;
}
