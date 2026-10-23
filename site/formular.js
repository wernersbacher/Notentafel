// Bausteine für die Formularseiten (/login/, /account/): Elemente per DOM-Aufruf, Eingabefelder, Meldungen und
// Formulare mit Absenden-Knopf. Die Stile stehen in /form.css.
export function node(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
export function button(text, cls, onClick) {
  const b = node('button', cls, text);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
export function anchor(href, text, cls) {
  const a = node('a', cls, text);
  a.href = href;
  return a;
}
// Meldung mit Rolle: Fehler werden vorgelesen (alert), Hinweise höflich (status)
export function note(text, kind) {
  const p = node('p', 'meldung' + (kind ? ' ' + kind : ''), text);
  p.setAttribute('role', kind === 'fehler' ? 'alert' : 'status');
  return p;
}
// Eingabefeld mit Beschriftung; Passwort bekommt den Zeigen-Schalter statt eines Wiederholungsfeldes
export function field(label, { type = 'text', autocomplete, name, show = false, required = true } = {}) {
  const wrap = node('label', 'feld');
  const input = node('input');
  input.type = type;
  input.name = name;
  input.required = required;
  input.autocomplete = autocomplete;
  if (type === 'email') { input.inputMode = 'email'; input.autocapitalize = 'none'; input.spellcheck = false; }
  wrap.append(node('span', '', label));
  if (!show) { wrap.append(input); return { wrap, input }; }
  const row = node('div', 'passwort');
  const toggle = button('Zeigen', 'zeigen');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => {
    const on = input.type === 'password';
    input.type = on ? 'text' : 'password';
    toggle.textContent = on ? 'Verbergen' : 'Zeigen';
    toggle.setAttribute('aria-pressed', String(on));
  });
  row.append(input, toggle);
  wrap.append(row);
  return { wrap, input };
}
// Formular mit Absenden-Knopf; submit() liefert '' (Erfolg, macht die Ansicht weiter) oder eine Fehlermeldung.
// Der Knopf ist währenddessen gesperrt, damit ein zweiter Tipp nichts doppelt abschickt. f.msg: Platz für
// Meldungen über den Feldern, f.extra: Platz unter dem Knopf.
export function form(fields, label, submit) {
  const f = node('form');
  f.noValidate = false;
  const msg = node('div');
  const go = node('button', 'knopf', label);
  go.type = 'submit';
  f.append(msg, ...fields.map((x) => x.wrap));
  const extra = node('div');
  f.append(go, extra);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    go.disabled = true;
    msg.replaceChildren();
    const err = await submit();
    go.disabled = false;
    if (err) msg.replaceChildren(note(err, 'fehler'));
  });
  f.msg = msg;
  f.extra = extra;
  return f;
}
