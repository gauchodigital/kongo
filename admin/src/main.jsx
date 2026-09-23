import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PAGE_DEFAULTS, PAGE_SCHEMAS, pageFieldKeys, youtubeId } from './page-schema.js';
import './styles.css';

const labels = {
  dashboard: 'Resumen', post: 'Notas', product: 'Productos', shelter: 'Refugios',
  faq: 'Preguntas frecuentes', page: 'Textos del sitio', media: 'Biblioteca', users: 'Usuarios'
};

const typeMeta = {
  post: { singular: 'nota', icon: '✦' },
  product: { singular: 'producto', icon: '◇' },
  shelter: { singular: 'refugio', icon: '⌂' },
  faq: { singular: 'pregunta', icon: '?' },
  page: { singular: 'sección', icon: '¶' }
};

let csrf = '';

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (csrf && !['GET', 'HEAD'].includes(options.method || 'GET')) headers['x-csrf-token'] = csrf;
  const response = await fetch(`/api${url}`, { credentials: 'same-origin', ...options, headers });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la acción');
  if (body.csrfToken) csrf = body.csrfToken;
  return body;
}

function Icon({ name }) {
  const paths = {
    dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
    content: 'M5 4h14v16H5z M8 8h8M8 12h8M8 16h5',
    media: 'M4 5h16v14H4z M7 15l3-3 2 2 3-4 3 5M8 9h.01',
    users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11l2 2 4-4'
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] || paths.content} /></svg>;
}

function Login({ onLogin, needsBootstrap }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api(needsBootstrap ? '/auth/bootstrap' : '/auth/login', { method: 'POST', body: JSON.stringify(form) });
      onLogin(result.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-brand">
      <div className="brand-mark">K</div>
      <p>Panel editorial</p>
      <h1>Todo Kongo,<br />en un solo lugar.</h1>
      <span>Publicá notas, actualizá productos y administrá la comunidad sin tocar código.</span>
    </section>
    <section className="login-card">
      <div className="mobile-brand">Kongo <small>CMS</small></div>
      <p className="eyebrow">{needsBootstrap ? 'CONFIGURACIÓN INICIAL' : 'ACCESO SEGURO'}</p>
      <h2>{needsBootstrap ? 'Crear administrador' : 'Bienvenido'}</h2>
      <p className="muted">{needsBootstrap ? 'Solo en local, para crear el primer administrador.' : 'Solo personal autorizado de Baires. Si no tenés cuenta, pedila a un administrador.'}</p>
      <form onSubmit={submit}>
        {needsBootstrap && <label>Nombre<input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellido" required /></label>}
        <label>Email<input autoFocus type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@baires-sa.com.ar" required /></label>
        <label>Contraseña<input type="password" minLength={needsBootstrap ? 12 : 8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••••••" required /></label>
        {error && <div className="alert error">{error}</div>}
        <button className="primary wide" disabled={busy}>{busy ? 'Procesando…' : needsBootstrap ? 'Crear cuenta y entrar' : 'Ingresar al panel'}</button>
      </form>
      <p className="security-note">Sesión protegida y acceso restringido al equipo autorizado.</p>
    </section>
  </main>;
}

function Shell({ user, onLogout }) {
  const [section, setSection] = useState('dashboard');
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const nav = [
    ['dashboard', 'dashboard'], ['post', 'content'], ['product', 'content'], ['shelter', 'content'],
    ['faq', 'content'], ['page', 'content'], ['media', 'media'], ...(user.role === 'admin' ? [['users', 'users']] : [])
  ];
  function navigate(next) { setEditor(null); setSection(next); setNotice(''); }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo">Kongo<span>CMS</span></div>
      <nav>{nav.map(([key, icon]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => navigate(key)}>
        <Icon name={icon} /><span>{labels[key]}</span>
      </button>)}</nav>
      <div className="sidebar-user"><div className="avatar">{user.name.charAt(0)}</div><div><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Administrador' : 'Editor'}</small></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div><p className="eyebrow">KONGO · PANEL EDITORIAL</p><h1>{editor ? `Editar ${typeMeta[section]?.singular || 'contenido'}` : labels[section]}</h1></div>
        <div className="top-actions"><a href="/" target="_blank" rel="noreferrer" className="ghost">Ver sitio ↗</a><button className="ghost" onClick={onLogout}>Salir</button></div>
      </header>
      {notice && <div className="toast">{notice}</div>}
      <div className="workspace">
        {section === 'dashboard' && <Dashboard navigate={navigate} />}
        {typeMeta[section] && (editor
          ? <Editor type={section} item={editor === 'new' ? null : editor} onBack={() => setEditor(null)} onSaved={(message) => { setEditor(null); setNotice(message); }} />
          : <ContentList type={section} onEdit={setEditor} onNotice={setNotice} />)}
        {section === 'media' && <MediaLibrary onNotice={setNotice} />}
        {section === 'users' && <Users user={user} onNotice={setNotice} />}
      </div>
      {typeMeta[section] && !editor && <button className="fab" onClick={() => setEditor('new')}>＋ Nuevo</button>}
    </div>
  </div>;
}

function Dashboard({ navigate }) {
  const [data, setData] = useState(null);
  useEffect(() => { api('/admin/dashboard').then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const cards = [
    ['post', 'Notas', '#97272d'], ['product', 'Productos', '#96661f'],
    ['shelter', 'Refugios', '#a1a467'], ['faq', 'Preguntas', '#003e51']
  ];
  return <>
    <section className="welcome"><div><p className="eyebrow">BUEN DÍA</p><h2>El contenido está bajo control.</h2><p>Gestioná y publicá cambios en la web desde un solo lugar.</p></div><button className="primary" onClick={() => navigate('post')}>Crear una nota</button></section>
    <div className="stat-grid">{cards.map(([key, label, color]) => <button className="stat-card" key={key} onClick={() => navigate(key)} style={{ '--accent': color }}>
      <span>{label}</span><strong>{data.stats.byType[key] || 0}</strong><small>Administrar →</small>
    </button>)}</div>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">ACTIVIDAD</p><h3>Últimos cambios</h3></div></div>
      <div className="activity-list">{data.audit.length ? data.audit.map((entry) => <div key={entry.id}><span className="activity-dot" /><div><strong>{entry.action}</strong> en {entry.entity_type}<small>{new Date(entry.created_at || entry.createdAt).toLocaleString('es-AR')}</small></div></div>) : <Empty text="Todavía no hay cambios registrados." />}</div>
    </section>
  </>;
}

function ContentList({ type, onEdit, onNotice }) {
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  async function load(nextPage = page) {
    setBusy(true);
    try { setData(await api(`/admin/content?type=${type}&q=${encodeURIComponent(q)}&status=${status}&page=${nextPage}&limit=20`)); }
    finally { setBusy(false); }
  }
  useEffect(() => { setPage(1); }, [type, q, status]);
  useEffect(() => { const timer = setTimeout(() => load(page), 180); return () => clearTimeout(timer); }, [type, q, status, page]);
  async function remove(item) {
    if (!confirm(`¿Eliminar “${item.title}”? Esta acción no se puede deshacer.`)) return;
    await api(`/admin/content/${item.dbId}`, { method: 'DELETE' });
    onNotice('Contenido eliminado correctamente.'); load();
  }
  async function duplicate(item) {
    await api(`/admin/content/${item.dbId}/duplicate`, { method: 'POST' });
    onNotice('Se creó un borrador duplicado.'); load();
  }
  async function exportCsv() {
    const response = await fetch('/api/admin/shelters.csv', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('No se pudo exportar el CSV');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'refugios-kongo.csv'; link.click();
    URL.revokeObjectURL(url);
    onNotice('CSV de refugios descargado.');
  }
  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = await api('/admin/shelters/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
    onNotice(`Se importaron ${result.created} refugios.`); load();
  }
  const pages = Math.max(1, Math.ceil((data.total || 0) / 20));
  return <section className="panel content-panel">
    <div className="toolbar">
      <div className="search"><span>⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar ${labels[type].toLowerCase()}…`} /></div>
      <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option><option value="published">Publicado</option><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="archived">Archivado</option></select>
      {type === 'shelter' && <>
        <button type="button" className="ghost" onClick={exportCsv}>Exportar CSV</button>
        <label className="ghost file-btn">Importar CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label>
      </>}
      <span className="result-count">{data.total} resultados</span>
    </div>
    {busy ? <Loading /> : data.items.length ? type === 'page' ? <div className="page-cards">
      {data.items.map((item) => <button type="button" className={`page-card tone-${pageTone(item.slug)}`} key={item.dbId} onClick={() => onEdit(item)}>
        <span className="page-card-art" aria-hidden="true" />
        <strong>{item.title}</strong>
        <small>{item.summary || 'Textos de esta página'}</small>
        <Status value={item.status} />
      </button>)}
    </div> : <div className="content-table">
      <div className="table-row table-header"><span>Contenido</span><span>Estado</span><span>Actualizado</span><span /></div>
      {data.items.map((item) => <div className="table-row" key={item.dbId}>
        <div className="item-title"><div className="type-icon">{typeMeta[type].icon}</div><div><strong>{item.title}</strong><small>{item.summary || item.slug}</small></div></div>
        <Status value={item.status} />
        <span className="date">{new Date(item.updatedAt).toLocaleDateString('es-AR')}</span>
        <div className="row-actions"><button onClick={() => onEdit(item)}>Editar</button><button onClick={() => duplicate(item)}>Duplicar</button><button className="danger-link" onClick={() => remove(item)}>Eliminar</button></div>
      </div>)}
      {pages > 1 && <div className="pagination">
        <button className="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button className="ghost" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</button>
      </div>}
    </div> : <Empty text={`No encontramos ${labels[type].toLowerCase()} con esos filtros.`} />}
  </section>;
}

function Editor({ type, item, onBack, onSaved }) {
  const initial = useMemo(() => makeForm(type, item), [type, item]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function field(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  async function save(status = form.status) {
    setSaving(true); setError('');
    try {
      const payload = toPayload(type, { ...form, status }, item);
      await api(item ? `/admin/content/${item.dbId}` : '/admin/content', { method: item ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      onSaved(status === 'published' ? 'Contenido publicado correctamente.' : 'Borrador guardado.');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <div className="editor-layout">
    <section className="panel editor-main">
      <button className="back" onClick={onBack}>← Volver al listado</button>
      <div className="editor-heading"><div className="type-icon large">{typeMeta[type].icon}</div><div><p className="eyebrow">{item ? 'EDITANDO' : 'NUEVO CONTENIDO'}</p><h2>{item?.title || `Nueva ${typeMeta[type].singular}`}</h2></div></div>
      <div className="form-grid">
        <label className="span-2">Título<input value={form.title} onChange={(e) => field('title', e.target.value)} placeholder={titlePlaceholder(type)} /></label>
        {type !== 'shelter' && <label>Slug<input value={form.slug} onChange={(e) => field('slug', slug(e.target.value))} placeholder="url-amigable" /></label>}
        <label>Orden<input type="number" min="0" value={form.sortOrder} onChange={(e) => field('sortOrder', e.target.value)} /></label>
        {type === 'post' && <PostFields form={form} field={field} />}
        {type === 'product' && <ProductFields form={form} field={field} />}
        {type === 'shelter' && <ShelterFields form={form} field={field} />}
        {type === 'faq' && <FaqFields form={form} field={field} />}
        {type === 'page' && <PageFields form={form} field={field} />}
      </div>
      {error && <div className="alert error">{error}</div>}
    </section>
    <aside className="panel publish-box"><p className="eyebrow">PUBLICACIÓN</p><h3>Estado</h3><Status value={form.status} />
      <label>Publicar el<select value={form.status} onChange={(e) => field('status', e.target.value)}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="scheduled">Programado</option><option value="archived">Archivado</option></select></label>
      {form.status === 'scheduled' && <label>Fecha y hora<input type="datetime-local" value={form.publishedAt || ''} onChange={(e) => field('publishedAt', e.target.value)} /></label>}
      <button className="primary wide" disabled={saving || !form.title} onClick={() => save()}>{saving ? 'Guardando…' : form.status === 'published' ? 'Publicar cambios' : 'Guardar'}</button>
      {form.status !== 'draft' && <button className="secondary wide" disabled={saving} onClick={() => save('draft')}>Guardar como borrador</button>}
      {type === 'post' && <article className="preview-card">
        <p className="eyebrow">VISTA PREVIA</p>
        <h4>{form.title || 'Título de la nota'}</h4>
        <p>{form.summary || 'La bajada aparecerá aquí.'}</p>
        {(form.body || []).filter((block) => block.text).slice(0, 4).map((block, index) => {
          if (block.type === 'quote') return <blockquote className="preview-quote" key={index}><p>“{block.text}”</p>{block.who && <cite>{block.who}</cite>}</blockquote>;
          if (block.type === 'heading') return <strong className="preview-heading" key={index}>{block.text}</strong>;
          if (block.type === 'note') return <small className="preview-note" key={index}>{block.text}</small>;
          return <p key={index}>{block.text}</p>;
        })}
      </article>}
      <small>Los cambios publicados aparecerán en el sitio conectado a este entorno.</small>
    </aside>
  </div>;
}

function PostFields({ form, field }) {
  return <><label>Categoría<select value={form.category} onChange={(e) => field('category', e.target.value)}><option>Gatos</option><option>Perros</option><option>Comunidad</option></select></label>
    <label>Fecha<input type="date" value={form.date} onChange={(e) => field('date', e.target.value)} /></label>
    <label className="span-2">Bajada<textarea rows="3" value={form.summary} onChange={(e) => field('summary', e.target.value)} placeholder="Resumen que aparecerá en el listado" /></label>
    <label className="span-2">Imagen de portada<MediaField value={form.cover} onChange={(value) => field('cover', value)} /></label>
    <div className="span-2"><p className="eyebrow">CUERPO DE LA NOTA</p><ArticleBlocks blocks={form.body} onChange={(blocks) => field('body', blocks)} /></div>
    <label>SEO título<input value={form.seoTitle} onChange={(e) => field('seoTitle', e.target.value)} placeholder="Título para buscadores" /></label>
    <label className="span-2">SEO descripción<textarea rows="2" value={form.seoDescription} onChange={(e) => field('seoDescription', e.target.value)} placeholder="Hasta 160 caracteres" /></label></>;
}

const BLOCK_TYPES = [
  { id: 'text', label: 'Párrafo' },
  { id: 'heading', label: 'Título' },
  { id: 'quote', label: 'Cita' },
  { id: 'note', label: 'Nota al pie' }
];

function emptyBlock(type = 'text') { return { id: crypto.randomUUID(), type, text: '', who: '' }; }

function blocksFromData(body) {
  if (!Array.isArray(body) || !body.length) return [emptyBlock()];
  return body.map((block) => {
    if (block.quote) return { id: crypto.randomUUID(), type: 'quote', text: block.t || '', who: block.who || '' };
    if (block.note) return { id: crypto.randomUUID(), type: 'note', text: block.t || '', who: '' };
    if (block.h) return { id: crypto.randomUUID(), type: 'heading', text: block.h, who: '' };
    return { id: crypto.randomUUID(), type: 'text', text: block.t || '', who: '' };
  });
}

function blocksToData(blocks) {
  return (blocks || []).map((block) => {
    if (block.type === 'quote') return { quote: true, t: block.text, who: block.who };
    if (block.type === 'note') return { note: true, t: block.text };
    if (block.type === 'heading') return { h: block.text };
    return { t: block.text };
  }).filter((block) => block.t || block.h);
}

function ArticleBlocks({ blocks, onChange }) {
  const items = blocks?.length ? blocks : [emptyBlock()];
  function update(index, patch) {
    onChange(items.map((block, i) => i === index ? { ...block, ...patch } : block));
  }
  function add(type, after = items.length - 1) {
    const next = items.slice();
    next.splice(after + 1, 0, emptyBlock(type));
    onChange(next);
  }
  function move(index, dir) {
    const next = items.slice();
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(next);
  }
  function remove(index) {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length ? next : [emptyBlock()]);
  }
  return <div className="article-blocks">
    <p className="article-hint">Elegí el diseño de cada bloque. La cita es el recuadro con barra roja que se ve en la nota.</p>
    {items.map((block, index) => <article className={`article-block is-${block.type}`} key={block.id || index}>
      <div className="block-toolbar">
        <div className="block-types">{BLOCK_TYPES.map((kind) => <button type="button" key={kind.id} className={block.type === kind.id ? 'on' : ''} onClick={() => update(index, { type: kind.id })}>{kind.label}</button>)}</div>
        <div className="block-move">
          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir">↑</button>
          <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar">↓</button>
          <button type="button" className="danger-link" onClick={() => remove(index)}>Quitar</button>
        </div>
      </div>
      {block.type === 'heading'
        ? <input className="block-heading" value={block.text} onChange={(e) => update(index, { text: e.target.value })} placeholder="Título de la sección" />
        : <textarea rows={block.type === 'quote' ? 4 : 5} value={block.text} onChange={(e) => update(index, { text: e.target.value })} placeholder={block.type === 'quote' ? 'Texto de la cita' : block.type === 'note' ? 'Nota al pie, crédito o aviso' : 'Párrafo de la nota'} />}
      {block.type === 'quote' && <input value={block.who} onChange={(e) => update(index, { who: e.target.value })} placeholder="Autor · cargo o fuente" />}
    </article>)}
    <div className="block-add">
      {BLOCK_TYPES.map((kind) => <button type="button" className="ghost" key={kind.id} onClick={() => add(kind.id)}>+ {kind.label}</button>)}
    </div>
  </div>;
}

function ProductFields({ form, field }) {
  return <><label>Nombre comercial<input value={form.tipo} onChange={(e) => field('tipo', e.target.value)} placeholder="Kongo Cachorros" /></label>
    <label>Etiqueta de etapa<input value={form.etapaLabel} onChange={(e) => field('etapaLabel', e.target.value)} placeholder="Todas las Razas" /></label>
    <label>Sabor / proteína<input value={form.sabor} onChange={(e) => field('sabor', e.target.value)} placeholder="Carne y pollo" /></label>
    <label>Línea<select value={form.line} onChange={(e) => field('line', e.target.value)}><option value="kongo">Kongo</option><option value="gold">Kongo Gold</option></select></label>
    <label>Especie<select value={form.species} onChange={(e) => field('species', e.target.value)}><option value="perro">Perro</option><option value="gato">Gato</option></select></label>
    <label>Etapa<select value={form.stage} onChange={(e) => field('stage', e.target.value)}><option value="cachorro">Cachorro / Gatito</option><option value="adulto">Adulto</option></select></label>
    <label>Proteína (%)<input type="number" value={form.protein} onChange={(e) => field('protein', e.target.value)} /></label>
    <label className="span-2">Beneficio principal<textarea rows="2" value={form.summary} onChange={(e) => field('summary', e.target.value)} /></label>
    <label className="span-2">Imagen del envase<MediaField value={form.image} onChange={(value) => field('image', value)} /></label>
    <label className="span-2">Presentaciones (kg, separadas por coma)<input value={form.sizes} onChange={(e) => field('sizes', e.target.value)} placeholder="1.5, 3, 8, 15" /></label>
    <label className="span-2">Ingredientes<textarea rows="8" value={form.ingredients} onChange={(e) => field('ingredients', e.target.value)} /></label>
    <label className="span-2">Beneficios (uno por línea)<textarea rows="5" value={form.claims} onChange={(e) => field('claims', e.target.value)} /></label></>;
}
function ShelterFields({ form, field }) {
  return <><label>Provincia<input value={form.province} onChange={(e) => field('province', e.target.value)} /></label>
    <label>Localidad<input value={form.location} onChange={(e) => field('location', e.target.value)} /></label>
    <label className="span-2">Instagram<input value={form.instagram} onChange={(e) => field('instagram', e.target.value.replace(/^@/, ''))} placeholder="usuario sin @" /></label></>;
}
function FaqFields({ form, field }) {
  return <><label className="span-2">Respuesta<textarea rows="10" value={form.answer} onChange={(e) => field('answer', e.target.value)} /></label>
    <label>Color<input type="color" value={form.color} onChange={(e) => field('color', e.target.value)} /></label></>;
}
function pageTone(slug) {
  return ({ inicio: 'petrol', 'comunidad-baires': 'sage', contacto: 'cream', productos: 'gold', consejos: 'red', faq: 'petrol', refugios: 'sage', navegacion: 'cream' })[slug] || 'petrol';
}

function PageFields({ form, field }) {
  const schema = PAGE_SCHEMAS[form.slug];
  const [open, setOpen] = useState(schema?.sections[0]?.id || null);
  if (!schema) {
    return <><label className="span-2">Texto destacado<input value={form.headline || ''} onChange={(e) => field('headline', e.target.value)} /></label>
      <label className="span-2">Texto principal<textarea rows="10" value={form.text || ''} onChange={(e) => field('text', e.target.value)} /></label>
      <label>SEO título<input value={form.seoTitle} onChange={(e) => field('seoTitle', e.target.value)} /></label>
      <label className="span-2">SEO descripción<textarea rows="2" value={form.seoDescription} onChange={(e) => field('seoDescription', e.target.value)} /></label></>;
  }
  const current = schema.sections.find((section) => section.id === open) || schema.sections[0];
  return <div className="span-2 page-map">
    <p className="page-map-intro">{schema.intro}</p>
    <div className="section-map">
      {schema.sections.map((section) => <button type="button" key={section.id} className={`section-thumb tone-${section.tone}${open === section.id ? ' open' : ''}`} onClick={() => setOpen(section.id)}>
        <span className="thumb-art" aria-hidden="true" />
        <strong>{section.title}</strong>
        <small>{section.preview}</small>
      </button>)}
    </div>
    <div className="section-editor">
      <p className="eyebrow">EDITANDO ESTE BLOQUE</p>
      <h3>{current.title}</h3>
      <div className="form-grid">
        {current.fields.map(([key, label, kind]) => {
          const value = form[key] ?? '';
          if (kind === 'video') {
            const id = youtubeId(value);
            return <label className="span-2" key={key}>{label}
              <input value={value} onChange={(e) => field(key, e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
              {id && <a className="video-thumb" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer"><img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" /><span>Vista previa del video</span></a>}
            </label>;
          }
          if (kind === 'area') return <label className="span-2" key={key}>{label}<textarea rows="5" value={value} onChange={(e) => field(key, e.target.value)} /></label>;
          return <label key={key} className={label.length > 22 ? 'span-2' : ''}>{label}<input value={value} onChange={(e) => field(key, e.target.value)} /></label>;
        })}
      </div>
    </div>
  </div>;
}

function MediaField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  useEffect(() => { if (open) api('/admin/media').then(setItems); }, [open]);
  return <div className="media-field">
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/cms/imagen.webp o /uploads/..." />
    <button type="button" className="ghost" onClick={() => setOpen((current) => !current)}>{open ? 'Cerrar biblioteca' : 'Elegir de la biblioteca'}</button>
    {open && <div className="media-picker">{items.map((item) => <button type="button" key={item.id} onClick={() => { onChange(item.path); setOpen(false); }}><img src={item.path} alt="" /><span>{item.original_name || item.originalName}</span></button>)}</div>}
  </div>;
}

function MediaLibrary({ onNotice }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api('/admin/media').then(setItems);
  useEffect(() => { load(); }, []);
  async function uploadFile(event) {
    event.preventDefault(); if (!file) return;
    setBusy(true);
    const body = new FormData(); body.append('file', file); body.append('altText', alt);
    try { await api('/admin/media', { method: 'POST', body }); setFile(null); setAlt(''); onNotice('Imagen subida y optimizada.'); load(); }
    catch (error) { onNotice(error.message); } finally { setBusy(false); }
  }
  return <><section className="panel upload-panel"><div><p className="eyebrow">NUEVA IMAGEN</p><h2>Subir a la biblioteca</h2><p>JPG, PNG, WEBP o GIF · máximo 12 MB. Se optimiza automáticamente.</p></div>
    <form onSubmit={uploadFile}><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files[0])} /><input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Texto alternativo" /><button className="primary" disabled={!file || busy}>{busy ? 'Subiendo…' : 'Subir imagen'}</button></form></section>
    <section className="media-grid">{items.map((item) => <button className="media-card" key={item.id} onClick={() => { navigator.clipboard.writeText(item.path); onNotice('Ruta copiada.'); }}><img src={item.path} alt={item.alt_text || item.altText || ''} /><span>{item.original_name || item.originalName}</span><small>Copiar ruta</small></button>)}</section>
    {!items.length && <section className="panel"><Empty text="Todavía no hay imágenes en la biblioteca." /></section>}</>;
}

function Users({ user, onNotice }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'editor', password: '' });
  const load = () => api('/admin/users').then(setItems);
  useEffect(() => { load(); }, []);
  async function submit(event) {
    event.preventDefault();
    try { await api('/admin/users', { method: 'POST', body: JSON.stringify(form) }); setForm({ name: '', email: '', role: 'editor', password: '' }); onNotice('Usuario creado.'); load(); }
    catch (error) { onNotice(error.message); }
  }
  return <div className="users-layout"><section className="panel"><div className="panel-head"><div><p className="eyebrow">EQUIPO</p><h2>Usuarios con acceso</h2></div></div>
    <div className="user-list">{items.map((item) => <div key={item.id}><div className="avatar">{item.name.charAt(0)}</div><div><strong>{item.name}{String(item.id) === String(user.id) ? ' · Vos' : ''}</strong><small>{item.email}</small></div><Status value={item.role} /></div>)}</div></section>
    <section className="panel"><p className="eyebrow">INVITAR</p><h2>Nuevo usuario</h2><form className="stack" onSubmit={submit}><label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Rol<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="editor">Editor</option><option value="admin">Administrador</option></select></label><label>Contraseña temporal<input type="password" minLength="12" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><button className="primary">Crear usuario</button></form></section></div>;
}

function makeForm(type, item) {
  const data = item?.data || {};
  const base = { title: item?.title || '', slug: item?.slug || '', summary: item?.summary || '', status: item?.status || 'draft', sortOrder: item?.sortOrder || 0, publishedAt: toDatetimeLocal(item?.publishedAt), seoTitle: data.seoTitle || '', seoDescription: data.seoDescription || '' };
  if (type === 'post') return { ...base, category: data.cat || 'Gatos', date: isoDate(data.date), cover: data.cover || '', body: blocksFromData(data.body) };
  if (type === 'product') return { ...base, tipo: data.tipo || '', etapaLabel: data.etapaLabel || '', sabor: data.sabor || '', line: data.line || 'kongo', species: data.especie || 'perro', stage: data.etapa || 'adulto', protein: data.protein || 0, image: data.img || '', sizes: (data.pres || []).join(', '), ingredients: data.ingredientes || '', claims: (data.claims || []).join('\n') };
  if (type === 'shelter') return { ...base, slug: item?.slug || `refugio-${Date.now()}`, province: data.prov || '', location: data.loc || '', instagram: data.ig || '' };
  if (type === 'faq') return { ...base, answer: data.a || '', color: data.dot || '#96661f' };
  const defaults = PAGE_DEFAULTS[item?.slug] || {};
  const keys = pageFieldKeys(item?.slug);
  const page = { ...defaults };
  for (const key of keys) if (data[key] != null && data[key] !== '') page[key] = data[key];
  if (data.intro && !page.text) page.text = data.intro;
  if (data.communityText && !page.communityText) page.communityText = data.communityText;
  return { ...base, headline: data.headline || data.kicker || page.headline || '', text: data.text || data.intro || page.text || '', ...page };
}

function toPayload(type, form, item) {
  let data = { ...(item?.data || {}) };
  if (type === 'post') data = { ...data, title: form.title, excerpt: form.summary, cat: form.category, date: displayDate(form.date), cover: form.cover, seoTitle: form.seoTitle, seoDescription: form.seoDescription, body: blocksToData(form.body) };
  if (type === 'product') data = { ...data, id: item?.id || form.slug, tipo: form.tipo || form.title, etapaLabel: form.etapaLabel, sabor: form.sabor, line: form.line, especie: form.species, etapa: form.stage, protein: Number(form.protein), img: form.image, pres: form.sizes.split(',').map((value) => Number(value.trim())).filter(Number.isFinite), ingredientes: form.ingredients, claims: form.claims.split('\n').filter(Boolean), benefit: form.summary };
  if (type === 'shelter') data = { prov: form.province, loc: form.location, name: form.title, ig: form.instagram };
  if (type === 'faq') data = { q: form.title, a: form.answer, dot: form.color };
  if (type === 'page') {
    data = { ...data, seoTitle: form.seoTitle, seoDescription: form.seoDescription };
    for (const key of pageFieldKeys(form.slug)) data[key] = form[key];
    if (form.headline) data.headline = form.headline;
    if (form.text) data.text = form.text;
    if (form.slug === 'inicio') data.communityText = form.communityText || form.text;
    if (form.slug === 'comunidad-baires') { data.intro = form.text; data.kicker = form.kicker || form.headline; }
  }
  return { id: item?.id, type, slug: form.slug || slug(form.title), status: form.status, title: form.title, summary: form.summary || (type === 'faq' ? form.answer : ''), data, sortOrder: Number(form.sortOrder || 0), publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null };
}

function slug(value) { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function isoDate(value) { if (!value) return new Date().toISOString().slice(0, 10); const parts = String(value).split('.'); return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : String(value).slice(0, 10); }
function displayDate(value) { const [year, month, day] = String(value).split('-'); return day ? `${day}.${month}.${year}` : value; }
function titlePlaceholder(type) { return ({ post: 'Título de la nota', product: 'Nombre del producto', shelter: 'Nombre del refugio', faq: 'Pregunta', page: 'Nombre de la sección' })[type]; }
function Status({ value }) { const text = ({ published: 'Publicado', draft: 'Borrador', scheduled: 'Programado', archived: 'Archivado', admin: 'Administrador', editor: 'Editor' })[value] || value; return <span className={`status ${value}`}>{text}</span>; }
function Loading() { return <div className="loading"><span /><p>Cargando contenido…</p></div>; }
function Empty({ text }) { return <div className="empty"><div>◇</div><strong>{text}</strong><span>Probá ajustar los filtros o creá un contenido nuevo.</span></div>; }

function App() {
  const [session, setSession] = useState(undefined);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  useEffect(() => { api('/auth/session').then((result) => { csrf = result.csrfToken; setNeedsBootstrap(result.needsBootstrap); setSession(result.user); }).catch(() => setSession(null)); }, []);
  async function logout() { await api('/auth/logout', { method: 'POST' }); setSession(null); }
  if (session === undefined) return <Loading />;
  return session ? <Shell user={session} onLogout={logout} /> : <Login needsBootstrap={needsBootstrap} onLogin={setSession} />;
}

createRoot(document.getElementById('root')).render(<App />);
