import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-function-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Financial logic ─────────────────────────────────────────────────────────

function calculateIMT(price: number): number {
  if (price <= 97064) return price * 0.01
  if (price <= 132774) return price * 0.02
  if (price <= 181034) return price * 0.05
  if (price <= 301688) return price * 0.07
  if (price <= 578598) return price * 0.08
  return price * 0.06
}

function calculateFinancials(
  purchasePrice: number,
  renovationCost: number,
  estimatedSalePrice: number
) {
  const imt = calculateIMT(purchasePrice)
  const stampDuty = purchasePrice * 0.008
  const notaryFees = 700
  const totalAcquisitionCost = purchasePrice + imt + stampDuty + notaryFees + renovationCost

  const agencyCommission = estimatedSalePrice * 0.05
  const agencyVAT = agencyCommission * 0.23
  const energyCertificate = 300
  const capitalGain = estimatedSalePrice - totalAcquisitionCost
  const capitalGainsTax = capitalGain > 0 ? capitalGain * 0.5 * 0.28 : 0
  const totalSaleCosts = agencyCommission + agencyVAT + capitalGainsTax + energyCertificate

  const grossProfit = estimatedSalePrice - purchasePrice - renovationCost
  const netProfit = estimatedSalePrice - totalAcquisitionCost - totalSaleCosts
  const netMargin = (netProfit / totalAcquisitionCost) * 100

  return {
    purchasePrice, imt, stampDuty, notaryFees, renovationCost, totalAcquisitionCost,
    estimatedSalePrice, agencyCommission, agencyVAT, capitalGainsTax, energyCertificate,
    totalSaleCosts, grossProfit, netProfit, netMargin, roi: netMargin,
  }
}

function getVerdict(netMargin: number): string {
  if (netMargin < 15) return 'pass'
  if (netMargin < 20) return 'grey_zone'
  if (netMargin < 30) return 'investigate'
  return 'excellent'
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Comparable {
  title: string
  price: number
  area: number
  pricePerSqm: number
  daysOnMarket: number
  url?: string
  location: string
  rooms?: string
}

interface INEMarketData {
  medianPricePerSqm: number
  priceChangePct: number | null
  period: string
  region: string
}

// ─── NUTS II map for INE API ──────────────────────────────────────────────────
// Maps Portuguese city/area names → NUTS-2024 region codes used by INE's API
const INE_NUTS_MAP: Array<{ code: string; region: string; names: string[] }> = [
  {
    code: 'PT17', region: 'A.M. de Lisboa',
    names: ['lisboa', 'lisbon', 'loures', 'sintra', 'cascais', 'oeiras', 'amadora', 'odivelas',
      'mafra', 'torres vedras', 'vila franca de xira', 'alenquer', 'azambuja', 'lourinha',
      'almada', 'seixal', 'barreiro', 'montijo', 'alcochete', 'sesimbra', 'palmela',
      'moita', 'setubal', 'setúbal', 'costa da caparica', 'caparica', 'sobral'],
  },
  {
    code: 'PT15', region: 'Algarve',
    names: ['faro', 'albufeira', 'portimao', 'portimão', 'lagos', 'silves', 'loule', 'loulé',
      'tavira', 'olhao', 'olhão', 'vila real de santo antonio', 'algarve', 'lagoa',
      'monchique', 'aljezur', 'alcoutim', 'castro marim', 'sao bras de alportel'],
  },
  {
    code: 'PT11', region: 'Norte',
    names: ['porto', 'oporto', 'gaia', 'vila nova de gaia', 'matosinhos', 'maia', 'gondomar',
      'valongo', 'braga', 'guimaraes', 'guimarães', 'barcelos', 'famalicao', 'famalicão',
      'povoa de varzim', 'espinho', 'vila do conde', 'amarante', 'felgueiras', 'paredes',
      'penafiel', 'viana do castelo', 'chaves', 'braganca', 'bragança', 'vila real', 'mirandela'],
  },
  {
    code: 'PT16', region: 'Centro',
    names: ['coimbra', 'leiria', 'marinha grande', 'aveiro', 'ilhavo', 'ilhavo', 'figueira da foz',
      'agueda', 'viseu', 'lamego', 'castelo branco', 'covilha', 'covilhã', 'guarda',
      'nazare', 'alcobaca', 'batalha', 'caldas da rainha', 'obidos', 'peniche',
      'tomar', 'abrantes', 'torres novas', 'fundao', 'seia', 'gouveia'],
  },
  {
    code: 'PT18', region: 'Alentejo',
    names: ['evora', 'évora', 'beja', 'portalegre', 'moura', 'serpa', 'elvas',
      'campo maior', 'estremoz', 'borba', 'redondo', 'arraiolos', 'montemor o novo',
      'vendas novas', 'grandola', 'grândola', 'santiago do cacem', 'sines', 'comporta', 'troia'],
  },
  {
    code: 'PT20', region: 'Açores',
    names: ['acores', 'açores', 'azores', 'ponta delgada', 'angra', 'horta', 'terceira', 'sao miguel', 'faial'],
  },
  {
    code: 'PT30', region: 'Madeira',
    names: ['madeira', 'funchal', 'canico', 'camara de lobos', 'machico', 'porto santo'],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lowercase, strip diacritics, trim */
function normalise(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Convert a string to a URL slug */
function toSlug(s: string): string {
  return normalise(s)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Imovirtual 3-level location map — freguesia / concelho / distrito.
 * Each entry: `path` = the most specific confirmed valid Imovirtual URL segment,
 * `names` = address keywords that resolve to that path.
 *
 * URL structure: /pt/resultados/comprar/apartamento/{path}
 * Fallback: if a path returns < MIN_COMPARABLES results or 404, the caller
 * automatically retries with progressively shorter paths (drop last segment).
 *
 * All paths tested & confirmed valid (HTTP 200) on Imovirtual May 2025.
 */
const LOCATION_MAP: Array<{ path: string; names: string[] }> = [
  // ── Lisboa / Lisboa — freguesia level ────────────────────────────────────
  { path: 'lisboa/lisboa/santa-maria-maior', names: [
    'mouraria', 'alfama', 'castelo', 'intendente', 'santa maria maior', 'baixa', 'martim moniz',
  ]},
  { path: 'lisboa/lisboa/misericordia', names: [
    'misericordia', 'bairro alto', 'chiado', 'cais do sodre', 'santos o velho',
  ]},
  { path: 'lisboa/lisboa/santo-antonio', names: [
    'santo antonio', 'avenida da liberdade', 'marques de pombal', 'liberdade',
  ]},
  { path: 'lisboa/lisboa/estrela', names: [
    'estrela', 'lapa', 'madragoa', 'santos', 'prazeres',
  ]},
  { path: 'lisboa/lisboa/alcantara', names: [
    'alcantara', 'pedroucos',
  ]},
  { path: 'lisboa/lisboa/ajuda', names: [
    'ajuda', 'belém', 'belem',
  ]},
  { path: 'lisboa/lisboa/belem', names: [
    'belem centro', 'torre de belem',
  ]},
  { path: 'lisboa/lisboa/campo-de-ourique', names: [
    'campo ourique', 'campo de ourique',
  ]},
  { path: 'lisboa/lisboa/campolide', names: [
    'campolide', 'amoreiras',
  ]},
  { path: 'lisboa/lisboa/areeiro', names: [
    'areeiro', 'praca de londres',
  ]},
  { path: 'lisboa/lisboa/arroios', names: [
    'arroios', 'anjos', 'intendente', 'pena',
  ]},
  { path: 'lisboa/lisboa/avenidas-novas', names: [
    'avenidas novas', 'saldanha', 'entrecampos', 'praca de espanha',
  ]},
  { path: 'lisboa/lisboa/beato', names: [
    'beato', 'chelas',
  ]},
  { path: 'lisboa/lisboa/alvalade', names: [
    'alvalade', 'roma', 'alameda',
  ]},
  { path: 'lisboa/lisboa/benfica', names: [
    'benfica',
  ]},
  { path: 'lisboa/lisboa/lumiar', names: [
    'lumiar', 'quinta das conchas', 'telheiras',
  ]},
  { path: 'lisboa/lisboa/marvila', names: [
    'marvila', 'braço de prata',
  ]},
  { path: 'lisboa/lisboa/olivais', names: [
    'olivais', 'encarnacao',
  ]},
  { path: 'lisboa/lisboa/parque-das-nacoes', names: [
    'parque das nacoes', 'parque das nações', 'oriente', 'expo',
  ]},
  { path: 'lisboa/lisboa/penha-de-franca', names: [
    'penha de franca', 'penha de frança', 'gracas', 'graca',
  ]},
  { path: 'lisboa/lisboa/santa-clara', names: [
    'santa clara', 'charneca', 'ameixoeira',
  ]},
  { path: 'lisboa/lisboa/sao-domingos-de-benfica', names: [
    'sao domingos de benfica', 'são domingos de benfica',
  ]},
  { path: 'lisboa/lisboa/sao-vicente', names: [
    'sao vicente', 'são vicente',
  ]},
  { path: 'lisboa/lisboa/carnide', names: [
    'carnide',
  ]},
  // Lisboa municipality catch-all
  { path: 'lisboa/lisboa', names: [
    'lisboa', 'lisbon',
  ]},

  // ── Lisboa / Cascais — freguesia level ──────────────────────────────────
  { path: 'lisboa/cascais/cascais-e-estoril', names: [
    'cascais', 'estoril', 'parede', 'carcavelos', 'sao joao do estoril',
  ]},
  { path: 'lisboa/cascais/alcabideche', names: [
    'alcabideche', 'birre', 'murches',
  ]},
  { path: 'lisboa/cascais/sao-domingos-de-rana', names: [
    'sao domingos de rana', 'linda a velha', 'alges', 'cruz quebrada', 'dafundo',
  ]},
  // Cascais catch-all
  { path: 'lisboa/cascais', names: [
    'cascais concelho',
  ]},

  // ── Lisboa / Sintra — freguesia level ───────────────────────────────────
  { path: 'lisboa/sintra/queluz-e-belas', names: [
    'queluz', 'belas',
  ]},
  { path: 'lisboa/sintra/agualva-e-mira-sintra', names: [
    'agualva', 'mira sintra', 'agualva cacem',
  ]},
  { path: 'lisboa/sintra/cacem-e-sao-marcos', names: [
    'cacem', 'cacém', 'sao marcos', 'são marcos',
  ]},
  { path: 'lisboa/sintra/rio-de-mouro', names: [
    'rio de mouro',
  ]},
  // Sintra catch-all
  { path: 'lisboa/sintra', names: [
    'sintra', 'mem martins', 'algueirao', 'algueirao mem martins', 'colares',
    'azenhas do mar', 'pena', 'terrugem',
  ]},

  // ── Lisboa / Oeiras — freguesia level ───────────────────────────────────
  { path: 'lisboa/oeiras/carnaxide-e-queijas', names: [
    'carnaxide', 'queijas',
  ]},
  { path: 'lisboa/oeiras/porto-salvo', names: [
    'porto salvo',
  ]},
  // Oeiras catch-all
  { path: 'lisboa/oeiras', names: [
    'oeiras', 'paco de arcos', 'barcarena', 'porto salvo',
  ]},

  // ── Lisboa / Loures ──────────────────────────────────────────────────────
  { path: 'lisboa/loures', names: [
    'loures', 'sacavem', 'moscavide', 'portela', 'camarate', 'unhos', 'prior velho',
    'apelacao', 'bobadela', 'santa iria da azoia', 'povoa de santa iria', 'frielas',
    'bucelas', 'fanhoes', 'santo antonio dos cavaleiros', 'forte da casa', 'vialonga',
  ]},

  // ── Lisboa / Vila Franca de Xira ─────────────────────────────────────────
  { path: 'lisboa/vila-franca-de-xira', names: [
    'vila franca de xira', 'alverca', 'alverca do ribatejo', 'alhandra', 'cachoeiras',
    'castanheira do ribatejo', 'sobralinho', 'verdelha', 'verdelha de baixo', 'calhandriz',
  ]},

  // ── Lisboa / Amadora ─────────────────────────────────────────────────────
  { path: 'lisboa/amadora', names: [
    'amadora', 'alfragide', 'venda nova', 'damaia', 'buraca', 'falagueira', 'reboleira', 'brandoa',
  ]},

  // ── Lisboa / Odivelas ────────────────────────────────────────────────────
  { path: 'lisboa/odivelas', names: [
    'odivelas', 'pontinha', 'famoes', 'ramada', 'canecas', 'povoa de santo adriao', 'olival basto',
  ]},

  // ── Lisboa / Mafra & others ──────────────────────────────────────────────
  { path: 'lisboa/mafra',          names: ['mafra', 'ericeira', 'malveira'] },
  { path: 'lisboa/torres-vedras',  names: ['torres vedras', 'lourinha'] },
  { path: 'lisboa/alenquer',       names: ['alenquer'] },
  { path: 'lisboa/azambuja',       names: ['azambuja'] },

  // ── Setúbal / Almada — freguesia level ──────────────────────────────────
  { path: 'setubal/almada/costa-da-caparica', names: [
    'costa da caparica', 'caparica', 'fonte da telha',
  ]},
  { path: 'setubal/almada/caparica-e-trafaria', names: [
    'trafaria', 'caparica e trafaria',
  ]},
  { path: 'setubal/almada/almada-cova-da-piedade-pragal-e-cacilhas', names: [
    'almada', 'cova da piedade', 'pragal', 'cacilhas',
  ]},
  // Almada catch-all
  { path: 'setubal/almada', names: ['almada concelho', 'charneca da caparica', 'corroios'] },

  // ── Setúbal / rest ───────────────────────────────────────────────────────
  { path: 'setubal/seixal',            names: ['seixal', 'fernao ferro', 'amora', 'aldeia de paio pires'] },
  { path: 'setubal/barreiro',          names: ['barreiro', 'lavradio', 'palhais'] },
  { path: 'setubal/setubal',           names: ['setubal', 'setúbal'] },
  { path: 'setubal/palmela',           names: ['palmela', 'pinhal novo', 'poceirao'] },
  { path: 'setubal/sesimbra',          names: ['sesimbra'] },
  { path: 'setubal/montijo',           names: ['montijo', 'alcochete'] },
  { path: 'setubal/moita',             names: ['moita', 'alhos vedros', 'baixa da banheira'] },
  { path: 'setubal/grandola',          names: ['grandola', 'comporta', 'troia'] },
  { path: 'setubal/santiago-do-cacem', names: ['santiago do cacem', 'sines'] },

  // ── Porto / Porto — freguesia level ─────────────────────────────────────
  { path: 'porto/porto/aldoar-foz-do-douro-e-nevogilde', names: [
    'foz do douro', 'nevogilde', 'aldoar', 'boavista',
  ]},
  { path: 'porto/porto/lordelo-do-ouro-e-massarelos', names: [
    'lordelo do ouro', 'massarelos', 'miragaia',
  ]},
  { path: 'porto/porto/cedofeita-santo-ildefonso-se-miragaia-sao-nicolau-e-vitoria', names: [
    'cedofeita', 'santo ildefonso', 'se', 'sao nicolau', 'vitoria', 'baixa do porto',
    'bolhao', 'aliados',
  ]},
  { path: 'porto/porto/bonfim', names: [
    'bonfim', 'antas', 'campanha',
  ]},
  { path: 'porto/porto/paranhos', names: [
    'paranhos', 'asprela', 'ramalde',
  ]},
  { path: 'porto/porto/ramalde', names: [
    'ramalde', 'francos',
  ]},
  { path: 'porto/porto/campanha', names: [
    'campanha', 'contumil',
  ]},
  // Porto city catch-all
  { path: 'porto/porto', names: [
    'porto', 'oporto',
  ]},

  // ── Porto / Vila Nova de Gaia — freguesia level ──────────────────────────
  { path: 'porto/vila-nova-de-gaia/santa-marinha-e-sao-pedro-da-afurada', names: [
    'santa marinha', 'afurada', 'cais de gaia',
  ]},
  { path: 'porto/vila-nova-de-gaia/mafamude-e-vilar-do-paraiso', names: [
    'mafamude', 'vilar do paraiso',
  ]},
  { path: 'porto/vila-nova-de-gaia/gulpilhares-e-valadares', names: [
    'gulpilhares', 'valadares',
  ]},
  // Gaia catch-all
  { path: 'porto/vila-nova-de-gaia', names: [
    'gaia', 'vila nova de gaia', 'avintes', 'canidelo', 'arcozelo', 'oliveira do douro',
  ]},

  // ── Porto / rest ─────────────────────────────────────────────────────────
  { path: 'porto/matosinhos',      names: ['matosinhos', 'leiao', 'perafita', 'lavra', 'guifoes', 'sr da hora'] },
  { path: 'porto/maia',            names: ['maia', 'moreira', 'nogueira', 'castelo da maia', 'vermoim'] },
  { path: 'porto/gondomar',        names: ['gondomar', 'valbom', 'foz do sousa'] },
  { path: 'porto/valongo',         names: ['valongo', 'ermesinde', 'alfena'] },
  { path: 'porto/povoa-de-varzim', names: ['povoa de varzim'] },
  { path: 'porto/vila-do-conde',   names: ['vila do conde', 'azurara'] },
  { path: 'porto/espinho',         names: ['espinho'] },
  { path: 'porto/felgueiras',      names: ['felgueiras'] },
  { path: 'porto/paredes',         names: ['paredes'] },
  { path: 'porto/penafiel',        names: ['penafiel'] },

  // ── Braga ─────────────────────────────────────────────────────────────────
  { path: 'braga/braga',       names: ['braga', 'nogueiro', 'esposende'] },
  { path: 'braga/guimaraes',   names: ['guimaraes', 'guimarães'] },
  { path: 'braga/barcelos',    names: ['barcelos'] },
  { path: 'braga/famalicao',   names: ['famalicao', 'famalicão', 'vila nova de famalicao'] },
  { path: 'braga/esposende',   names: ['esposende'] },

  // ── Faro / Loulé — freguesia level ──────────────────────────────────────
  { path: 'faro/loule/quarteira', names: [
    'quarteira', 'vilamoura',
  ]},
  { path: 'faro/loule/almancil', names: [
    'almancil', 'quinta do lago', 'vale do lobo',
  ]},
  // Loulé catch-all
  { path: 'faro/loule', names: ['loule', 'loulé'] },

  // ── Faro / Albufeira — freguesia level ──────────────────────────────────
  { path: 'faro/albufeira/albufeira-e-olhos-de-agua', names: [
    'albufeira', 'olhos de agua', 'gale', 'galé',
  ]},

  // ── Faro / Portimão — freguesia level ──────────────────────────────────
  { path: 'faro/portimao/portimao', names: [
    'portimao', 'portimão',
  ]},
  // Portimão catch-all (other parishes)
  { path: 'faro/portimao', names: ['alvor', 'ferragudo', 'mexilhoeira grande'] },

  { path: 'faro/lagos',  names: ['lagos', 'meia praia', 'luz', 'burgau', 'sagres'] },
  { path: 'faro/lagoa',  names: ['lagoa', 'carvoeiro', 'estombar', 'armacao de pera'] },
  { path: 'faro/silves', names: ['silves', 'messines'] },
  { path: 'faro/tavira', names: ['tavira', 'cabanas de tavira'] },
  { path: 'faro/olhao',  names: ['olhao', 'olhão', 'fuzeta', 'moncarapacho'] },
  { path: 'faro/faro',   names: ['faro'] },
  { path: 'faro/vila-real-de-santo-antonio', names: ['vila real de santo antonio', 'monte gordo'] },

  // ── Aveiro ────────────────────────────────────────────────────────────────
  { path: 'aveiro/aveiro',              names: ['aveiro', 'esgueira', 'vera cruz'] },
  { path: 'aveiro/ilhavo',              names: ['ilhavo', 'vista alegre'] },
  { path: 'aveiro/santa-maria-da-feira',names: ['santa maria da feira'] },
  { path: 'aveiro/ovar',                names: ['ovar', 'furadouro'] },
  { path: 'aveiro/agueda',              names: ['agueda'] },
  { path: 'aveiro/oliveira-de-azemeis', names: ['oliveira de azemeis'] },
  { path: 'aveiro/sao-joao-da-madeira', names: ['sao joao da madeira'] },
  { path: 'aveiro/espinho',             names: ['espinho aveiro'] },

  // ── Coimbra ───────────────────────────────────────────────────────────────
  { path: 'coimbra/coimbra',        names: ['coimbra'] },
  { path: 'coimbra/figueira-da-foz',names: ['figueira da foz', 'buarcos'] },
  { path: 'coimbra/cantanhede',     names: ['cantanhede'] },

  // ── Leiria ────────────────────────────────────────────────────────────────
  { path: 'leiria/leiria',            names: ['leiria'] },
  { path: 'leiria/marinha-grande',    names: ['marinha grande'] },
  { path: 'leiria/nazare',            names: ['nazare', 'nazaré'] },
  { path: 'leiria/alcobaca',          names: ['alcobaca', 'alcobaça'] },
  { path: 'leiria/peniche',           names: ['peniche'] },
  { path: 'leiria/caldas-da-rainha',  names: ['caldas da rainha'] },
  { path: 'leiria/obidos',            names: ['obidos', 'óbidos'] },

  // ── Santarém ──────────────────────────────────────────────────────────────
  { path: 'santarem/santarem',      names: ['santarem', 'santarém'] },
  { path: 'santarem/tomar',         names: ['tomar'] },
  { path: 'santarem/torres-novas',  names: ['torres novas'] },
  { path: 'santarem/abrantes',      names: ['abrantes'] },
  { path: 'santarem/almeirim',      names: ['almeirim'] },
  { path: 'santarem/rio-maior',     names: ['rio maior'] },
  { path: 'santarem/entroncamento', names: ['entroncamento'] },

  // ── Setúbal / Alcácer & further south ────────────────────────────────────
  { path: 'setubal/alcacer-do-sal', names: ['alcacer do sal'] },
  { path: 'setubal/odemira',        names: ['odemira'] },

  // ── Évora ─────────────────────────────────────────────────────────────────
  { path: 'evora/evora',            names: ['evora', 'évora'] },
  { path: 'evora/estremoz',         names: ['estremoz'] },
  { path: 'evora/montemor-o-novo',  names: ['montemor o novo'] },

  // ── Beja ──────────────────────────────────────────────────────────────────
  { path: 'beja/beja',   names: ['beja'] },
  { path: 'beja/moura',  names: ['moura'] },
  { path: 'beja/serpa',  names: ['serpa'] },
  { path: 'beja/sines',  names: ['sines'] },

  // ── Viseu ─────────────────────────────────────────────────────────────────
  { path: 'viseu/viseu',   names: ['viseu'] },
  { path: 'viseu/lamego',  names: ['lamego'] },
  { path: 'viseu/tondela', names: ['tondela'] },

  // ── Castelo Branco ────────────────────────────────────────────────────────
  { path: 'castelo-branco/castelo-branco', names: ['castelo branco'] },
  { path: 'castelo-branco/covilha',        names: ['covilha', 'covilhã'] },
  { path: 'castelo-branco/fundao',         names: ['fundao', 'fundão'] },

  // ── Guarda ────────────────────────────────────────────────────────────────
  { path: 'guarda/guarda', names: ['guarda'] },
  { path: 'guarda/seia',   names: ['seia'] },

  // ── Vila Real ─────────────────────────────────────────────────────────────
  { path: 'vila-real/vila-real', names: ['vila real'] },
  { path: 'vila-real/chaves',    names: ['chaves'] },

  // ── Viana do Castelo ──────────────────────────────────────────────────────
  { path: 'viana-do-castelo/viana-do-castelo', names: ['viana do castelo'] },
  { path: 'viana-do-castelo/ponte-de-lima',    names: ['ponte de lima'] },

  // ── Bragança ──────────────────────────────────────────────────────────────
  { path: 'braganca/braganca',   names: ['braganca', 'bragança'] },
  { path: 'braganca/mirandela',  names: ['mirandela'] },

  // ── Portalegre ────────────────────────────────────────────────────────────
  { path: 'portalegre/portalegre', names: ['portalegre'] },
  { path: 'portalegre/elvas',      names: ['elvas'] },
]

/** Minimum comparables before widening the search scope */
const MIN_COMPARABLES = 8

/**
 * Resolve a full address to the most specific Imovirtual location path.
 * Scans every comma-separated part, scores by name match quality.
 * Returns path with most segments first; caller widens by dropping segments.
 */
function resolveImovirtualPath(address: string): string {
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  let best: { path: string; score: number } = { path: '', score: -1 }

  for (const part of parts) {
    const key = normalise(part)
    for (const entry of LOCATION_MAP) {
      for (const n of entry.names) {
        const nn = normalise(n)
        let score = 0
        if (key === nn)                                score = 100
        else if (key.includes(nn) && nn.length > 4)   score = 80
        else if (nn.includes(key) && key.length > 4)  score = 60
        if (score > best.score) best = { path: entry.path, score }
      }
    }
  }

  if (best.score >= 0) {
    console.log(`resolveImovirtualPath: "${address}" → "${best.path}" (score=${best.score})`)
    return best.path
  }

  // Fallback: derive slug from the city part of the address
  const directSlug = toSlug(extractCity(address))
  console.warn(`resolveImovirtualPath: no match for "${address}", using "${directSlug}"`)
  return directSlug
}

/** Map city name to INE NUTS II code + human label */
function resolveNUTSCode(cityPart: string): { code: string; region: string } {
  const key = normalise(cityPart)
  for (const entry of INE_NUTS_MAP) {
    if (entry.names.some((n) => key.includes(normalise(n)) || normalise(n).includes(key))) {
      return { code: entry.code, region: entry.region }
    }
  }
  console.warn(`No NUTS code found for "${cityPart}", defaulting to national (PT)`)
  return { code: 'PT', region: 'Portugal' }
}

/** Extract city-level part from a full address string */
function extractCity(address: string): string {
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!parts[i].toLowerCase().includes(' e ') && parts[i].length > 3) {
      return parts[i]
    }
  }
  return parts[parts.length - 1] ?? address
}

// ─── Imovirtual scraper ───────────────────────────────────────────────────────
// Imovirtual migrated to Next.js App Router. Data is no longer in __NEXT_DATA__
// but in a plain <script> tag whose content starts with {"props":{"pageProps":…}.
// New search URL: /pt/resultados/comprar/apartamento/{district}/
// Items live at: props.pageProps.data.searchAds.items

/** Map Portuguese typology strings to Imovirtual's roomsNumber enum */
const ROOMS_MAP: Record<string, string[]> = {
  T0: ['ONE'],
  T1: ['ONE', 'TWO'],
  T2: ['TWO', 'THREE', 'FOUR'],
  T3: ['THREE', 'FOUR', 'FIVE'],
  'T4+': ['FOUR', 'FIVE', 'SIX', 'SEVEN'],
}

const IMOV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.google.pt/',
  'Cache-Control': 'no-cache',
}

async function fetchImovirtualListings(
  address: string,
  typology: string,
  _area: number
): Promise<Comparable[]> {
  const cityPart = extractCity(address)  // used for location label in comparables

  // Build candidate URL paths: most specific first, then progressively wider.
  // e.g. "lisboa/lisboa/misericordia" → "lisboa/lisboa" → "lisboa" → "todo-o-pais"
  const basePath = resolveImovirtualPath(address)
  const segments = basePath.split('/')
  const candidates: string[] = []
  for (let len = segments.length; len >= 1; len--) {
    candidates.push(segments.slice(0, len).join('/'))
  }
  candidates.push('todo-o-pais')

  let html = ''
  let usedPath = ''

  for (const path of candidates) {
    const url = `https://www.imovirtual.com/pt/resultados/comprar/apartamento/${path}?limit=24`
    console.log(`Imovirtual fetch: ${url}`)
    try {
      const res = await fetch(url, { headers: IMOV_HEADERS, signal: AbortSignal.timeout(20000) })
      if (!res.ok) {
        console.warn(`Imovirtual ${res.status} for "${path}" — widening scope`)
        continue
      }
      const text = await res.text()
      // Quick check: does it have pageProps data?
      if (!text.includes('"searchAds"')) {
        console.warn(`Imovirtual "${path}" returned no searchAds — widening scope`)
        continue
      }
      // Check result count before committing
      const countMatch = text.match(/"totalItems":(\d+)/)
      const totalItems = countMatch ? parseInt(countMatch[1]) : 0
      console.log(`Imovirtual "${path}": ${totalItems} total listings`)
      if (totalItems < MIN_COMPARABLES && path !== 'todo-o-pais') {
        console.warn(`Imovirtual "${path}" only ${totalItems} listings — widening scope`)
        html = text  // keep as fallback but try wider
        usedPath = path
        continue
      }
      html = text
      usedPath = path
      break
    } catch (err) {
      console.warn(`Imovirtual fetch error for "${path}":`, err)
    }
  }

  if (!html) {
    console.error('Imovirtual: all paths failed')
    return []
  }
  console.log(`Imovirtual: using path "${usedPath}", HTML length=${html.length}`)

  // Find the script tag whose content is the Next.js App Router page data
  // It starts with {"props":{"pageProps": — NOT id="__NEXT_DATA__"
  const scriptMatch = html.match(/<script[^>]*>\s*(\{"props":\{"pageProps":[\s\S]*?)\s*<\/script>/)
  if (!scriptMatch) {
    console.warn('Imovirtual: props/pageProps script not found. First 500 chars:', html.slice(0, 500))
    return []
  }

  // deno-lint-ignore no-explicit-any
  let pageData: any
  try {
    pageData = JSON.parse(scriptMatch[1])
  } catch {
    console.error('Imovirtual: failed to parse props/pageProps JSON')
    return []
  }

  // deno-lint-ignore no-explicit-any
  const items: any[] = pageData?.props?.pageProps?.data?.searchAds?.items ?? []
  console.log(`Imovirtual: raw items count=${items.length}`)

  if (items.length === 0) {
    console.warn('Imovirtual: no items in data.searchAds.items')
    return []
  }

  // Acceptable roomsNumber values for this typology
  const acceptedRooms = new Set(ROOMS_MAP[typology] ?? ROOMS_MAP['T2'])

  // deno-lint-ignore no-explicit-any
  const mapped = (items as any[])
    .filter((item) => acceptedRooms.has(item?.roomsNumber))
    .map((item) => {
      const price = Number(item?.totalPrice?.value ?? 0)
      const area = Number(item?.areaInSquareMeters ?? 0)
      if (price <= 0 || area <= 0) return null

      const ppsm = Number(item?.pricePerSquareMeter?.value ?? 0)
      const pricePerSqm = ppsm > 0 ? Math.round(ppsm) : Math.round(price / area)

      // Days on market based on first-listed date
      let daysOnMarket = 0
      const pubDate = item?.createdAtFirst ?? item?.dateCreated
      if (pubDate) {
        const published = new Date(String(pubDate)).getTime()
        if (Number.isFinite(published)) {
          daysOnMarket = Math.round((Date.now() - published) / (1000 * 60 * 60 * 24))
        }
      }
      if (daysOnMarket > 540) return null

      const title = String(item?.title ?? 'Apartamento')
      const slug = item?.slug ?? ''
      const listingUrl = slug
        ? `https://www.imovirtual.com/pt/ad/${slug}`
        : undefined

      const location = String(
        item?.location?.address?.city?.name ??
        item?.location?.address?.province?.name ??
        cityPart
      )

      const rooms = String(item?.roomsNumber ?? typology)

      return { title, price, area, pricePerSqm, daysOnMarket, url: listingUrl, location, rooms }
    })
    .filter((c): c is Comparable => c !== null)
    .slice(0, 15)

  console.log(`Imovirtual: returning ${mapped.length} comparables after rooms filter`)
  return mapped
}

// ─── INE market data ──────────────────────────────────────────────────────────
// Indicator 0012234: "Valor mediano das vendas de alojamentos familiares nos
// últimos 12 meses (€/m²)" — quarterly, NUTS-2024 geographic breakdown.
//
// NOTE: Dim3 must NOT be passed — omitting it returns all categories and the
// API accepts the request. "PT" is always a valid Dim2 (national level).
// Regional NUTS-2024 codes differ from NUTS-2013 and require separate discovery;
// for now we use PT (national) which always works and is still very useful.

/** Parse the INE Dados structure which can be either an array or an object
 *  keyed by period label (e.g. "4.º Trimestre de 2025": [...]).
 *  Returns the "Total" category value, or the first numeric value found.
 */
// deno-lint-ignore no-explicit-any
function extractINEValue(response: any): number {
  const dados = response?.[0]?.Dados
  if (!dados) return 0

  // deno-lint-ignore no-explicit-any
  let entries: any[]
  if (Array.isArray(dados)) {
    entries = dados
  } else if (typeof dados === 'object') {
    // Object keyed by period label: {"4.º Trimestre de 2025": [...]}
    const firstKey = Object.keys(dados)[0]
    entries = Array.isArray(dados[firstKey]) ? dados[firstKey] : []
  } else {
    return 0
  }

  // Prefer the "Total" category entry; fall back to the first entry
  // deno-lint-ignore no-explicit-any
  const total = entries.find((e: any) =>
    String(e?.categ_Dim3 ?? '').toLowerCase().includes('total') ||
    String(e?.categ ?? '').toLowerCase().includes('total')
  ) ?? entries[0]

  const val = parseFloat(total?.valor ?? '0')
  return Number.isFinite(val) && val > 0 ? Math.round(val) : 0
}

// Municipality-level INE codes (alphanumeric, discovered via bulk API fetch May 2025)
// Format: normalisedKeyword → [geoCode, regionLabel]
// These override the national PT fallback with real local transaction data.
const INE_MUNIC: Record<string, [string, string]> = {
  // Lisboa municipality & neighbourhoods
  'mouraria':    ['1A01106', 'Lisboa'], 'alfama':    ['1A01106', 'Lisboa'],
  'bairro alto': ['1A01106', 'Lisboa'], 'chiado':    ['1A01106', 'Lisboa'],
  'estrela':     ['1A01106', 'Lisboa'], 'lapa':      ['1A01106', 'Lisboa'],
  'belem':       ['1A01106', 'Lisboa'], 'alcantara': ['1A01106', 'Lisboa'],
  'alvalade':    ['1A01106', 'Lisboa'], 'benfica':   ['1A01106', 'Lisboa'],
  'areeiro':     ['1A01106', 'Lisboa'], 'arroios':   ['1A01106', 'Lisboa'],
  'lumiar':      ['1A01106', 'Lisboa'], 'marvila':   ['1A01106', 'Lisboa'],
  'carnide':     ['1A01106', 'Lisboa'], 'saldanha':  ['1A01106', 'Lisboa'],
  'intendente':  ['1A01106', 'Lisboa'], 'ajuda':     ['1A01106', 'Lisboa'],
  'lisboa':      ['1A01106', 'Lisboa'], 'lisbon':    ['1A01106', 'Lisboa'],
  // Lisboa concelhos
  'cascais':     ['1A01105', 'Cascais'],   'estoril':    ['1A01105', 'Cascais'],
  'oeiras':      ['1A01110', 'Oeiras'],    'carnaxide':  ['1A01110', 'Oeiras'],
  'sintra':      ['1A01111', 'Sintra'],    'queluz':     ['1A01111', 'Sintra'],
  'agualva':     ['1A01111', 'Sintra'],    'cacem':      ['1A01111', 'Sintra'],
  'loures':      ['1A01107', 'Loures'],    'sacavem':    ['1A01107', 'Loures'],
  'camarate':    ['1A01107', 'Loures'],    'moscavide':  ['1A01107', 'Loures'],
  'alverca':     ['1A01114', 'Vila Franca de Xira'],
  'vila franca de xira': ['1A01114', 'Vila Franca de Xira'],
  'verdelha':    ['1A01114', 'Vila Franca de Xira'],
  'odivelas':    ['1A01116', 'Odivelas'],  'amadora':    ['1A01115', 'Amadora'],
  'mafra':       ['1A01109', 'Mafra'],     'ericeira':   ['1A01109', 'Mafra'],
  // Setubal concelhos
  'almada':      ['1B01503', 'Almada'],    'caparica':   ['1B01503', 'Almada'],
  'seixal':      ['1B01509', 'Seixal'],    'barreiro':   ['1B01504', 'Barreiro'],
  'setubal':     ['1B01511', 'Setubal'],   'palmela':    ['1B01508', 'Palmela'],
  'sesimbra':    ['1B01510', 'Sesimbra'],  'montijo':    ['1B01506', 'Montijo'],
  // Porto municipality & parishes
  'porto':       ['11A1312', 'Porto'],     'oporto':     ['11A1312', 'Porto'],
  'bonfim':      ['11A1312', 'Porto'],     'paranhos':   ['11A1312', 'Porto'],
  'foz do douro':['11A1312', 'Porto'],     'boavista':   ['11A1312', 'Porto'],
  // Porto concelhos
  'matosinhos':  ['11A1308', 'Matosinhos'],
  'gaia':        ['11A1317', 'Vila Nova de Gaia'],
  'vila nova de gaia': ['11A1317', 'Vila Nova de Gaia'],
  'maia':        ['11A1306', 'Maia'],      'gondomar':   ['11A1304', 'Gondomar'],
  'valongo':     ['11A1315', 'Valongo'],   'ermesinde':  ['11A1315', 'Valongo'],
  'povoa de varzim': ['11A1313', 'Povoa de Varzim'],
  'vila do conde':   ['11A1316', 'Vila do Conde'],
  // Braga
  'braga':       ['1120303', 'Braga'],     'guimaraes':  ['1120304', 'Guimaraes'],
  // Algarve concelhos
  'loule':       ['1500808', 'Loule'],     'vilamoura':  ['1500808', 'Loule'],
  'quarteira':   ['1500808', 'Loule'],     'almancil':   ['1500808', 'Loule'],
  'lagos':       ['1500807', 'Lagos'],     'albufeira':  ['1500801', 'Albufeira'],
  'portimao':    ['1500811', 'Portimao'],  'tavira':     ['1500814', 'Tavira'],
  'faro':        ['1500804', 'Faro'],      'lagoa':      ['1500806', 'Lagoa'],
  // Other
  'funchal':     ['3003103', 'Funchal'],   'madeira':    ['3', 'Madeira'],
  'acores':      ['2', 'Acores'],          'aveiro':     ['191', 'Regiao de Aveiro'],
  'coimbra':     ['192', 'Regiao de Coimbra'],
}

async function fetchINEMarketData(address: string): Promise<INEMarketData | null> {
  const cityPart = extractCity(address)

  // Resolve the most specific INE code: scan all address parts, pick longest keyword match
  let geoCode = 'PT'
  let geoRegion = 'Portugal'
  let bestLen = 0
  const parts = address.split(',').map((s) => normalise(s.trim()))
  for (const part of parts) {
    for (const kw of Object.keys(INE_MUNIC)) {
      if ((part === kw || part.includes(kw) || kw.includes(part)) && kw.length > bestLen) {
        geoCode = INE_MUNIC[kw][0]
        geoRegion = INE_MUNIC[kw][1]
        bestLen = kw.length
      }
    }
  }
  // Fall back to resolveNUTSCode region label for display (even if we use PT geo code)
  const { region: nutsRegion } = resolveNUTSCode(cityPart)
  const region = bestLen > 0 ? geoRegion : nutsRegion

  console.log(`INE lookup: "${address}" -> geoCode=${geoCode} region=${region}`)

  // Try most-recent quarters first (INE publishes ~3 months after quarter end)
  // If municipality code fails, fall back to national PT (always works)
  const geoCandidates = geoCode !== 'PT' ? [geoCode, 'PT'] : ['PT']
  const quarters = ['S5A20254', 'S5A20253', 'S5A20252', 'S5A20244']

  for (const quarter of quarters) {
    for (const geo of geoCandidates) {
    try {
      const url =
        `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012234` +
        `&Dim1=${quarter}&Dim2=${geo}&lang=PT`
      console.log(`INE fetch: ${url}`)

      const res = await fetch(url, {
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) {
        console.warn(`INE HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      console.log('INE raw response snippet:', JSON.stringify(data).slice(0, 300))

      const medianPricePerSqm = extractINEValue(data)
      if (medianPricePerSqm <= 0) {
        console.warn(`INE: no valid value for ${quarter}`)
        continue
      }

      console.log(`INE: medianPricePerSqm=${medianPricePerSqm} (${quarter})`)

      // YoY trend — same quarter one year prior
      let priceChangePct: number | null = null
      try {
        const yMatch = quarter.match(/S5A(\d{4})(\d)/)
        if (yMatch) {
          const prevQuarter = `S5A${parseInt(yMatch[1]) - 1}${yMatch[2]}`
          const prevUrl =
            `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=0012234` +
            `&Dim1=${prevQuarter}&Dim2=${geoCode}&lang=PT`
          const prevRes = await fetch(prevUrl, {
            headers: { Accept: 'application/json, text/plain, */*' },
            signal: AbortSignal.timeout(8000),
          })
          if (prevRes.ok) {
            const prevVal = extractINEValue(await prevRes.json())
            if (prevVal > 0) {
              priceChangePct = ((medianPricePerSqm - prevVal) / prevVal) * 100
            }
          }
        }
      } catch { /* trend is optional */ }

      const qMatch = quarter.match(/S5A(\d{4})(\d)/)
      const period = qMatch ? `Q${qMatch[2]} ${qMatch[1]}` : quarter
      // Use the actual region for the geo code we succeeded with
      const finalRegion = geo === 'PT' ? (bestLen > 0 ? region : 'Portugal') : region
      return { medianPricePerSqm, priceChangePct, period, region: finalRegion }
    } catch (err) {
      console.warn(`INE error (${geo}/${quarter}):`, err)
    }
    } // end geoCandidates loop
  }

  console.warn('INE: all attempts failed — returning null')
  return null
}

// ─── Market stats ─────────────────────────────────────────────────────────────

function calcMedian(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function calcMarketStats(comparables: Comparable[], _area: number) {
  const prices = comparables.map((c) => c.price)
  const ppsm = comparables.map((c) => c.pricePerSqm).filter((v) => v > 0)

  return {
    min: Math.min(...(ppsm.length ? ppsm : [0])),
    max: Math.max(...(ppsm.length ? ppsm : [0])),
    median: calcMedian(prices),
    average: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    medianPricePerSqm: calcMedian(ppsm),
    averagePricePerSqm: ppsm.length ? ppsm.reduce((a, b) => a + b, 0) / ppsm.length : 0,
    count: comparables.length,
  }
}

// ─── Claude analysis ──────────────────────────────────────────────────────────

async function generateAnalysis(
  property: Record<string, unknown>,
  marketStats: ReturnType<typeof calcMarketStats>,
  ineData: INEMarketData | null,
  financial: ReturnType<typeof calculateFinancials>,
  verdict: string,
  anthropicKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey: anthropicKey })

  const conditionLabels: Record<string, string> = {
    bad: 'Mau estado (obras estruturais)',
    renovation: 'Remodelação necessária',
    good: 'Bom estado',
    renovated: 'Remodelado',
  }

  const userNotes = (property.comments as string | undefined)?.trim()
  const userNotesSection = userNotes
    ? `\nNOTAS DO UTILIZADOR:\n<user_notes>\n${userNotes}\n</user_notes>`
    : ''

  const ineSection = ineData
    ? `\nREFERÊNCIA INE — mediana nacional de transações reais (${ineData.period}): ${ineData.medianPricePerSqm.toLocaleString('pt-PT')} €/m²${
        ineData.priceChangePct !== null
          ? ` (${ineData.priceChangePct > 0 ? '+' : ''}${ineData.priceChangePct.toFixed(1)}% vs. ano anterior)`
          : ''
      }. ATENÇÃO: este valor é a mediana nacional incluindo zonas rurais — em mercados urbanos os preços reais são tipicamente mais altos.`
    : ''

  const comparablesSection = marketStats.count > 0
    ? `\nMERCADO LOCAL — Imovirtual (${marketStats.count} anúncios activos, tipologias próximas):
- Mediana pedida por m²: ${marketStats.medianPricePerSqm.toFixed(0)} €/m²
- Range: ${marketStats.min.toFixed(0)} – ${marketStats.max.toFixed(0)} €/m²
- O preço estimado de venda usa esta mediana com desconto de 10% para simular o gap pedido→transação.`
    : '\nMERCADO LOCAL: Sem comparáveis activos disponíveis — estimativa de venda baseada na mediana INE.'

  const prompt = `És um analista de investimento imobiliário sénior a trabalhar para a Polar Investimentos. Analisa este imóvel e fornece um veredicto fundamentado.

IMÓVEL:
- Morada: ${property.address}
- Tipologia: ${property.typology}, ${property.area} m²
- Preço pedido: ${(property.askingPrice as number).toLocaleString('pt-PT')} €
- Condição: ${conditionLabels[property.condition as string] ?? property.condition}
- Estimativa de obras: ${(property.renovationCost as number).toLocaleString('pt-PT')} €${userNotesSection}
${ineSection}
${comparablesSection}

ANÁLISE FINANCEIRA:
- Investimento total: ${financial.totalAcquisitionCost.toLocaleString('pt-PT')} € (inclui IMT ${financial.imt.toLocaleString('pt-PT')} €)
- Preço estimado de venda (pós-obra): ${financial.estimatedSalePrice.toLocaleString('pt-PT')} €
- Lucro líquido estimado: ${financial.netProfit.toLocaleString('pt-PT')} €
- Margem líquida: ${financial.netMargin.toFixed(1)}%

VEREDICTO AUTOMÁTICO: ${verdict}

Escreve uma análise de 3-4 parágrafos curtos que:
1. Avalie o posicionamento de preço face ao mercado local (Imovirtual) e à referência nacional INE
2. Comente os riscos principais (obras, localização, liquidez)
3. Dê uma recomendação clara e directa com o que fazer a seguir
4. Se existirem notas do utilizador, incorpora as informações relevantes

IMPORTANTE: Responde em português de Portugal. Não uses markdown — sem #, ##, *, **, _, listas com traço, etc. Apenas texto corrido em parágrafos separados por linha vazia.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('polar-goldsearch_Claude-APIKey')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Handler invoked — anthropicKey present:', !!anthropicKey)

    if (!anthropicKey) {
      console.error('Missing secret: polar-goldsearch_Claude-APIKey')
      return new Response(
        JSON.stringify({ error: 'Chave da API Claude não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse & validate
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const VALID_TYPOLOGIES = ['T0', 'T1', 'T2', 'T3', 'T4+']
    const VALID_CONDITIONS = ['bad', 'renovation', 'good', 'renovated']
    const body = raw as Record<string, unknown>
    const errors: string[] = []

    if (typeof body.address !== 'string' || body.address.trim().length < 3)
      errors.push('Morada inválida (mínimo 3 caracteres)')
    if (body.address && typeof body.address === 'string' && body.address.length > 300)
      errors.push('Morada demasiado longa (máximo 300 caracteres)')
    if (!VALID_TYPOLOGIES.includes(body.typology as string))
      errors.push(`Tipologia inválida — valores aceites: ${VALID_TYPOLOGIES.join(', ')}`)

    const area = Number(body.area)
    if (!Number.isFinite(area) || area < 10 || area > 5000)
      errors.push('Área inválida (deve estar entre 10 e 5000 m²)')

    const askingPrice = Number(body.askingPrice)
    if (!Number.isFinite(askingPrice) || askingPrice < 5000 || askingPrice > 100_000_000)
      errors.push('Preço pedido inválido')

    if (!VALID_CONDITIONS.includes(body.condition as string))
      errors.push(`Condição inválida — valores aceites: ${VALID_CONDITIONS.join(', ')}`)

    const renovationCost = Number(body.renovationCost ?? 0)
    if (!Number.isFinite(renovationCost) || renovationCost < 0 || renovationCost > 10_000_000)
      errors.push('Custo de obras inválido')

    if (body.comments !== undefined && body.comments !== null) {
      if (typeof body.comments !== 'string') errors.push('Comentários inválidos')
      else if (body.comments.length > 1000) errors.push('Comentários demasiado longos (máximo 1000 caracteres)')
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: errors.join('; ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const address = (body.address as string).replace(/[\n\r\t]/g, ' ').trim().slice(0, 300)
    const typology = body.typology as string
    const condition = body.condition as string
    const comments = typeof body.comments === 'string'
      ? body.comments.replace(/\r/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, 1000)
      : ''

    const property = { address, typology, area, askingPrice, condition, renovationCost, comments }

    // 1. Fetch Imovirtual comparables + INE market data in parallel
    console.log('Starting parallel fetch: Imovirtual + INE')
    const [comparables, ineData] = await Promise.all([
      fetchImovirtualListings(address, typology, area),
      fetchINEMarketData(address),
    ])

    // 2. Market stats from Imovirtual listings
    const marketStats = calcMarketStats(comparables, area)

    // 3. Estimated sale price
    // INE gives the NATIONAL median (all of Portugal, including rural), so it under-estimates
    // prices in urban / high-demand markets. Imovirtual asking prices are market-specific and
    // already filtered to comparable typologies — we apply a 10% haircut to simulate the
    // asking→transaction gap and use them as the primary estimator when available.
    // INE data remains on screen as a national benchmark, not as the pricing basis.
    const imovMedianPpsm = marketStats.medianPricePerSqm  // asking prices, comparable typology
    const estimatedSalePrice =
      imovMedianPpsm > 0
        ? Math.round(imovMedianPpsm * area * 0.90)        // 10% haircut on asking prices
        : ineData && ineData.medianPricePerSqm > 0
          ? Math.round(ineData.medianPricePerSqm * area)  // fallback: INE national
          : Math.round(askingPrice * 1.05)                // last resort: small premium

    // 4. Financials & verdict
    const financial = calculateFinancials(askingPrice, renovationCost, estimatedSalePrice)
    const verdict = getVerdict(financial.netMargin)

    // 5. AI analysis
    const aiAnalysis = await generateAnalysis(property, marketStats, ineData, financial, verdict, anthropicKey)

    const result = {
      property, comparables, marketStats, ineData, financial, verdict, aiAnalysis,
      createdAt: new Date().toISOString(),
    }

    // 6. Save to DB (best-effort)
    if (supabaseUrl && supabaseKey) {
      const db = createClient(supabaseUrl, supabaseKey)
      await db.from('analyses').insert({
        address, typology, area,
        asking_price: askingPrice,
        verdict,
        net_margin: financial.netMargin,
        result,
        created_at: result.createdAt,
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('analyze-property error:', err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
