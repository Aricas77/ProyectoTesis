export const ROLES = ['docente', 'estudiante'];

export class HttpError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v) => (typeof v === 'string' ? v.trim() : '');

function failIfInvalid(fields) {
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisa los campos marcados.', fields);
}

export function parseRegister(body) {
  const b = body ?? {};
  const fields = {};
  const name = text(b.name);
  const email = text(b.email).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const role = b.role;

  if (name.length < 2 || name.length > 80) fields.name = 'Escribe tu nombre completo (de 2 a 80 caracteres).';
  if (!EMAIL_RE.test(email) || email.length > 120) fields.email = 'Escribe un correo válido, por ejemplo nombre@uv.mx.';
  if (Buffer.byteLength(password) < 8 || Buffer.byteLength(password) > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    fields.password = 'Usa entre 8 y 72 caracteres, con al menos una letra y un número.';
  }
  if (!ROLES.includes(role)) fields.role = 'Elige si eres docente o estudiante.';

  failIfInvalid(fields);
  return { name, email, password, role };
}

export function parseLogin(body) {
  const b = body ?? {};
  const email = text(b.email).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const fields = {};
  if (!EMAIL_RE.test(email)) fields.email = 'Escribe un correo válido.';
  if (!password) fields.password = 'Escribe tu contraseña.';
  failIfInvalid(fields);
  return { email, password };
}

export function parseSession(body) {
  const b = body ?? {};
  const fields = {};
  const title = text(b.title);
  const subject = text(b.subject);
  const description = text(b.description);
  const { maxParticipants, durationMinutes } = b;

  if (title.length < 3 || title.length > 100) fields.title = 'El nombre debe tener entre 3 y 100 caracteres.';
  if (subject.length < 2 || subject.length > 100) fields.subject = 'Indica la materia o experiencia educativa (de 2 a 100 caracteres).';
  if (description.length > 500) fields.description = 'La descripción admite hasta 500 caracteres.';
  if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 500) {
    fields.maxParticipants = 'Escribe un número entero entre 2 y 500.';
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
    fields.durationMinutes = 'Escribe una duración entre 5 y 180 minutos.';
  }

  const cards = [];
  if (!Array.isArray(b.cards) || b.cards.length < 2 || b.cards.length > 50) {
    fields.cards = 'Agrega entre 2 y 50 pares de concepto y definición.';
  } else {
    const seen = new Set();
    b.cards.forEach((c, i) => {
      const concept = text(c?.concept);
      const definition = text(c?.definition);
      if (!concept || concept.length > 120) fields[`cards.${i}.concept`] = 'Escribe el concepto (hasta 120 caracteres).';
      else if (seen.has(concept.toLowerCase())) fields[`cards.${i}.concept`] = 'Este concepto ya está en otra tarjeta.';
      else seen.add(concept.toLowerCase());
      if (!definition || definition.length > 400) fields[`cards.${i}.definition`] = 'Escribe la definición (hasta 400 caracteres).';
      cards.push({ concept, definition });
    });
  }

  failIfInvalid(fields);
  return { title, subject, description, maxParticipants, durationMinutes, cards };
}
