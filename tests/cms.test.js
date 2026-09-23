import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSchema } from '../server/validation.js';
import { createItem, deleteItem, duplicateItem, getPublicContent, listItems, updateItem } from '../server/store.js';

test('el seed conserva el contenido principal del sitio', async () => {
  const content = await getPublicContent();
  assert.equal(content.products.length, 9);
  assert.equal(content.posts.length, 1);
  assert.ok(content.shelters.length > 300);
  assert.equal(content.faqs.length, 6);
  assert.ok(content.pages.inicio);
  assert.ok(content.pages.inicio.kongoText);
  assert.ok(content.pages.inicio.goldText);
  assert.ok(content.pages.inicio.communityVideo);
  assert.ok(content.pages.inicio.heroHighlight);
  assert.ok(content.products.every((product) => product.sabor));
  assert.ok(content.pages.contacto);
});

test('valida una publicación programada', () => {
  const result = contentSchema.safeParse({
    type: 'post',
    slug: 'nota-programada',
    status: 'scheduled',
    title: 'Nota programada',
    summary: '',
    data: {},
    sortOrder: 0
  });
  assert.equal(result.success, false);
});

test('permite duplicar un contenido como borrador', async () => {
  const created = await createItem({
    type: 'faq',
    slug: 'pregunta-a-duplicar',
    status: 'published',
    title: 'Original',
    summary: 'Respuesta',
    data: { q: 'Original', a: 'Respuesta', dot: '#003E51' },
    sortOrder: 1
  }, 1);
  const copy = await duplicateItem(created.dbId, 1);
  assert.equal(copy.status, 'draft');
  assert.match(copy.slug, /copia/);
  assert.equal(await deleteItem(created.dbId), true);
  assert.equal(await deleteItem(copy.dbId), true);
});

test('publica contenido programado cuando llega la fecha', async () => {
  const created = await createItem({
    type: 'post',
    slug: 'nota-ya-programada',
    status: 'scheduled',
    title: 'Nota programada',
    summary: 'Bajada',
    data: { title: 'Nota programada', excerpt: 'Bajada', cat: 'Comunidad', date: '01.01.2026', body: [] },
    sortOrder: 50,
    publishedAt: new Date(Date.now() - 60_000).toISOString()
  }, 1);
  const content = await getPublicContent();
  assert.ok(content.posts.some((post) => post.slug === 'nota-ya-programada'));
  assert.equal(await deleteItem(created.dbId), true);
});

test('permite crear, editar y eliminar un contenido', async () => {
  const created = await createItem({
    type: 'faq',
    slug: 'pregunta-de-prueba',
    status: 'draft',
    title: 'Pregunta de prueba',
    summary: 'Respuesta',
    data: { q: 'Pregunta de prueba', a: 'Respuesta', dot: '#003E51' },
    sortOrder: 99
  }, 1);
  assert.ok(created.dbId);
  const updated = await updateItem(created.dbId, { ...created, status: 'published' }, 1);
  assert.equal(updated.status, 'published');
  const listed = await listItems({ type: 'faq', q: 'prueba', limit: 20 });
  assert.equal(listed.total, 1);
  assert.equal(await deleteItem(created.dbId), true);
});
