import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = await fs.readFile(path.join(root, 'index.html'), 'utf8');

function methodBody(name, nextName, exactEnd = false) {
  const startToken = `  ${name}() {`;
  const endToken = exactEnd ? nextName : `\n  ${nextName}`;
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`No se pudo extraer ${name}`);
  const raw = source.slice(start + startToken.length, end);
  return raw.replace(/\n  }\s*$/, '');
}

function evaluateMethod(name, body) {
  const script = new vm.Script(`(function ${name}(){${body}\n})`);
  const fn = script.runInNewContext({}, { timeout: 1000 });
  return fn.call({ res: (value) => value, state: { cms: null } });
}

const products = evaluateMethod('products', methodBody('products', 'postsData() {'));
const posts = evaluateMethod('postsData', methodBody('postsData', 'toTop ='));
const faqs = evaluateMethod('faqList', methodBody('faqList', '\n  }\n}\n</script>', true));
const shelters = JSON.parse(await fs.readFile(path.join(root, 'refugios.json'), 'utf8'));

const content = [
  {
    id: 'home',
    type: 'page',
    slug: 'inicio',
    status: 'published',
    title: 'Inicio',
    summary: 'Textos de la portada',
    data: {
      heroBefore: 'Nutrición',
      heroHighlight: 'natural',
      heroAfter: 'para perros y gatos',
      heroCta: 'Ver los productos',
      stat1: '100',
      stat1Label: 'ingredientes naturales',
      stat2a: '22',
      stat2b: '34',
      stat2Label: 'de proteína',
      stat3: '85',
      stat3Label: 'proteína de origen animal',
      stat4: '0',
      stat4Label: 'colorantes y saborizantes artificiales',
      familiaProductsCta: 'Ver todos los productos →',
      railHint: 'DESLIZÁ PARA VER TODOS',
      kongoLabel: 'Kongo',
      kongoText: 'Kongo cuenta con una línea completa de alimento para perros y gatos que aporta una nutrición natural y saludable sin colorantes ni saborizantes artificiales. Está formulado con productos naturales de excelente calidad y proteína animal como su principal ingrediente. De esta manera es la mejor opción del segmento ya que otorga una excelente relación entre precio y calidad.',
      kongoCta: 'Ver los alimentos Kongo',
      goldLabel: 'Kongo Gold',
      goldText: 'Kongo Gold es el alimento súper premium de la familia de Kongo y ofrece los estándares más altos de calidad en su segmento. Con la fórmula ideal para cada etapa de la vida y proteína de pollo como ingrediente principal.',
      goldCta: 'Ver los alimentos Kongo Gold',
      communityKicker: 'Ayudamos a los que más lo necesitan · ¿Te sumás?',
      communityText: 'Con cada envase vacío de Kongo podés ayudar a perritos que están en los refugios y además cuidar al medio ambiente.',
      communityCta: 'Conocé la campaña',
      communityIg: '@kongooficial',
      communityIgUrl: 'https://instagram.com/kongooficial',
      communityVideo: 'https://www.youtube.com/watch?v=VEUU6t2USAk',
      communityVideoStart: '7',
      familiaTitle: 'Familia',
      exchangeLine: '1 envase vacío = 1 kg de alimento',
      joinCount: '3',
      joinLabel: 'formas de sumarse',
      joinMore: 'Más información →',
      censoKicker: 'Registro Nacional de Perros y Gatos',
      censoTitleBefore: 'Tu perro y tu gato no son',
      censoHighlight: 'uno más',
      censoText: 'Tienen nombre, tienen historia y son parte de tu familia. Registralos y sumate a una comunidad que celebra ese vínculo todos los días.',
      censoCta: 'Registralo →',
      censoUrl: 'https://censo.oldprince.com.ar/',
      consejosTitle: 'Consejos',
      consejosCta: 'Ver todas las notas',
      bairesTitleBefore: 'Trabajamos todos los días para hacer el',
      bairesHighlight: 'mejor alimento para ellos',
      bairesText: 'Somos una empresa responsable y comprometida. Es nuestro propósito ofrecer excelencia en nutrición, aportando más salud y mejor calidad de vida a perros y gatos. Para ello nos especializamos en la producción de sus alimentos y trabajamos con pasión, logrando así ingresar día a día en nuevos hogares para compartir el cuidado con sus familias.',
      bairesCta: 'Conocé Baires S.A.',
      bairesUrl: 'https://baires-sa.com.ar/'
    },
    sortOrder: 1
  },
  {
    id: 'community',
    type: 'page',
    slug: 'comunidad-baires',
    status: 'published',
    title: 'Comunidad Baires',
    summary: 'Campaña de recuperación de envases',
    data: {
      kicker: 'Ayudamos a los que más lo necesitan',
      headline: 'Ayudamos a los que más lo necesitan',
      text: 'No tires la bolsa vacía de Kongo: llevala a un refugio. Nosotros la retiramos y les dejamos alimento; después las bolsas se reciclan y el plástico vuelve a ser materia prima. Con algo que ibas a tirar cuidamos al planeta y ayudamos a quienes más lo necesitan.',
      video: 'https://www.youtube.com/watch?v=VEUU6t2USAk',
      videoStart: '7',
      intro: 'No tires la bolsa vacía de Kongo: llevala a un refugio. Nosotros la retiramos y les dejamos alimento; después las bolsas se reciclan y el plástico vuelve a ser materia prima. Con algo que ibas a tirar cuidamos al planeta y ayudamos a quienes más lo necesitan.',
      cicloIntro: 'Porque cuando trabajamos juntos, cada pequeño gesto puede generar un gran impacto para los animales y para el planeta.',
      cicloNote: 'Cada envase tiene una segunda oportunidad: alimenta a quien espera una familia y cuida el ambiente.',
      ciclo1: 'Comprá cualquier producto Kongo, en cualquiera de sus presentaciones.',
      ciclo2: 'Llevá el envase vacío a un refugio adherido o a un punto de acopio de Comunidad Baires.',
      ciclo3: 'Nosotros retiramos los envases y entregamos alimento a los refugios participantes.',
      ciclo4: 'Las bolsas recolectadas se envían a una cooperativa de reciclado, donde el plástico se transforma en nueva materia prima.',
      perfilesTitleBefore: 'Elegí tu',
      perfilesHighlight: 'lugar',
      perfilesTitleAfter: 'en la campaña',
      perfilesCta: 'Contactanos',
      perfil1t1: 'Tengo un',
      perfil1t2: 'refugio',
      perfil1text: 'Escribinos por Instagram desde la cuenta del refugio a @kongooficial. Te mandamos el formulario para sumarte y material para difundir la campaña.',
      perfil1cta: 'Escribinos',
      perfil2t1: 'Tengo un',
      perfil2t2: 'punto de venta',
      perfil2text: 'Tu local puede recibir las bolsas vacías. Hablá con tu distribuidor o escribinos a @kongooficial con los datos del comercio: te llevamos el botadero y el material para arrancar.',
      perfil2cta: 'Sumá tu local',
      perfil3t1: 'Soy',
      perfil3t2: 'consumidor',
      perfil3text: 'Guardá las bolsas vacías de Kongo y llevalas al refugio o local que participe más cerca de tu casa. Mirá el listado completo y elegí el tuyo.',
      perfil3cta: 'Ver el listado de refugios',
      refugiosKicker: 'Ya son más de 300 en todo el país',
      refugiosTitle: 'Conocé los refugios',
      refugiosHighlight: 'beneficiados',
      refugiosText: 'Mirá el listado completo por localidad, encontrá el más cercano a tu casa y llevale las bolsas vacías.',
      refugiosCta: 'Ver el listado →'
    },
    sortOrder: 2
  },
  {
    id: 'contact',
    type: 'page',
    slug: 'contacto',
    status: 'published',
    title: 'Contacto',
    summary: 'Textos y datos de contacto',
    data: {
      headline: 'Contáctanos',
      text: 'Escribinos y te respondemos a la brevedad.',
      pageBefore: '¡Contactate con',
      pageHighlight: 'nosotros',
      email: 'consultas@baires-sa.com.ar',
      whatsapp: '+54 9 11 6405-0041',
      whatsappExtra: '@consultasbaires',
      whatsappHref: 'https://wa.me/5491164050041',
      instagram: '@kongooficial',
      instagramUrl: 'https://instagram.com/kongooficial',
      facebookUrl: 'https://www.facebook.com/KongoOficial/',
      youtubeUrl: 'https://www.youtube.com/channel/UColFvIkhJhcC3K8ip8eK6tw',
      mailLabel: 'Mail',
      whatsappLabel: 'WhatsApp',
      redesLabel: 'Redes',
      redesText: 'Instagram, Facebook y YouTube: @kongooficial'
    },
    sortOrder: 3
  },
  {
    id: 'products-page',
    type: 'page',
    slug: 'productos',
    status: 'published',
    title: 'Productos',
    summary: 'Títulos de la página de productos',
    data: {
      heroBefore: 'Nuestros',
      heroHighlight: 'productos',
      filtersLabel: 'Filtros',
      clearFilters: 'Limpiar filtros'
    },
    sortOrder: 4
  },
  {
    id: 'tips-page',
    type: 'page',
    slug: 'consejos',
    status: 'published',
    title: 'Consejos',
    summary: 'Títulos de la sección de notas',
    data: {
      heroBefore: 'Consejos',
      heroHighlight: 'Kongo',
      intro: 'Notas sobre alimentación, salud y convivencia con perros y gatos.'
    },
    sortOrder: 5
  },
  {
    id: 'faq-page',
    type: 'page',
    slug: 'faq',
    status: 'published',
    title: 'Preguntas frecuentes',
    summary: 'Título de la página de FAQ',
    data: {
      heroBefore: 'Preguntas',
      heroHighlight: 'frecuentes'
    },
    sortOrder: 6
  },
  {
    id: 'shelters-page',
    type: 'page',
    slug: 'refugios',
    status: 'published',
    title: 'Refugios',
    summary: 'Textos del listado de refugios',
    data: {
      backLabel: '← Volver a Comunidad Baires',
      heroBefore: 'Refugios',
      heroHighlight: 'beneficiados',
      intro: 'Estos son los refugios que reciben el alimento de Comunidad Baires. Buscá el más cercano y llevale tus bolsas vacías de Kongo.',
      footnote: '¿Participas de comunidad y querés aparecer acá? Escribinos por Instagram a @kongooficial.'
    },
    sortOrder: 7
  },
  {
    id: 'nav-page',
    type: 'page',
    slug: 'navegacion',
    status: 'published',
    title: 'Navegación y pie',
    summary: 'Menú, footer y textos legales',
    data: {
      inicio: 'Inicio',
      productos: 'Productos',
      comunidad: 'Comunidad Baires',
      consejos: 'Consejos',
      faq: 'Preguntas frecuentes',
      contacto: 'Contacto',
      footerBlurb: 'Nutrición natural para perros y gatos. Una marca de Baires S.A.',
      sectionsTitle: 'Secciones',
      followTitle: 'Seguinos',
      contactTitle: 'Contacto',
      legal: '© 2026 Baires S.A. Todos los derechos reservados. Kongo es una marca registrada de Baires S.A.',
      legalLinks: 'Términos y condiciones · Política de privacidad · Defensa del consumidor'
    },
    sortOrder: 8
  }
];

const normalized = {
  products: products.map((item, index) => ({
    id: item.id,
    type: 'product',
    slug: item.id,
    status: 'published',
    title: `${item.tipo} ${item.etapaLabel}`,
    summary: item.benefit,
    data: item,
    sortOrder: index + 1
  })),
  posts: posts.map((item, index) => ({
    id: String(item.id),
    type: 'post',
    slug: item.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    status: 'published',
    title: item.title,
    summary: item.excerpt,
    data: item,
    publishedAt: item.date,
    sortOrder: index + 1
  })),
  shelters: shelters.map((item, index) => ({
    id: `shelter-${index + 1}`,
    type: 'shelter',
    slug: `shelter-${index + 1}`,
    status: 'published',
    title: item.name,
    summary: `${item.loc}, ${item.prov}`,
    data: item,
    sortOrder: index + 1
  })),
  faqs: faqs.map((item, index) => ({
    id: `faq-${index + 1}`,
    type: 'faq',
    slug: `faq-${index + 1}`,
    status: 'published',
    title: item.q,
    summary: item.a,
    data: item,
    sortOrder: index + 1
  })),
  pages: content
};

await fs.mkdir(path.join(root, 'server'), { recursive: true });
await fs.writeFile(path.join(root, 'server', 'seed-data.json'), JSON.stringify(normalized, null, 2) + '\n');
console.log(`Seed generado: ${Object.values(normalized).reduce((n, items) => n + items.length, 0)} registros.`);
