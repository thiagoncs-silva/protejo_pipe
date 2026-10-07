/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SB_URL = "https://rbizynwybepmlljgcveq.supabase.co";
const SB_KEY = "sb_publishable_oqQ9VvnLTSZI4yYiu4UsyA_EV1a2nT4";

// ─── TENANT CONFIG — branding por empresa ────────────────────────────────────
// Carregado do Supabase após login — sobrescreve os padrões
let TENANT_CONFIG = {
  companyName:  "Pipe.TM",
  slogan:       "Prospecção Inteligente",
  primaryColor: "#00B4D8",
  secondaryColor:"#0077B6",
  logoText:     "P.TM",
  segment:      "",
  city:         "",
  webhookUrl:   "",
  modules:      ["prospeccao"],
};

const applyTenantConfig = (tenant) => {
  if(!tenant) return;
  const cfg = typeof tenant.config==="string" ? JSON.parse(tenant.config||"{}") : (tenant.config||{});
  TENANT_CONFIG = {
    companyName:   tenant.name        || TENANT_CONFIG.companyName,
    slogan:        cfg.slogan         || TENANT_CONFIG.slogan,
    primaryColor:  cfg.primaryColor   || TENANT_CONFIG.primaryColor,
    secondaryColor:cfg.secondaryColor || TENANT_CONFIG.secondaryColor,
    logoText:      cfg.logoText       || TENANT_CONFIG.logoText,
    segment:       cfg.segment        || TENANT_CONFIG.segment,
    city:          cfg.city           || TENANT_CONFIG.city,
    webhookUrl:    cfg.webhookUrl     || TENANT_CONFIG.webhookUrl,
    modules:       Array.isArray(tenant.modules)?tenant.modules:(typeof tenant.modules==="string"?JSON.parse(tenant.modules||"[]"):TENANT_CONFIG.modules),
  };
  // Apply colors dynamically
  if(cfg.primaryColor) {
    C.accent  = cfg.primaryColor;
    C.accent2 = cfg.secondaryColor||cfg.primaryColor;
  }
};


const sbFetch = async (path, method="GET", body=null) => {
  const opts = {
    method,
    headers: {
      "apikey": SB_KEY,
      "Authorization": "Bearer " + (typeof sbAuth!=="undefined"&&sbAuth.token?sbAuth.token():SB_KEY),
      "Content-Type": "application/json",
      "Prefer": method==="POST" ? "return=representation" : "return=minimal",
    },
    mode: "cors",
  };
  if(body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(SB_URL + "/rest/v1/" + path, opts);
    if(!res.ok) { const err = await res.text(); throw new Error("Supabase "+res.status+": "+err); }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch(e) {
    if(e.message.includes("fetch")) throw new Error("Sem conexão com Supabase - verifique sua internet");
    throw e;
  }
};

// ── Supabase helpers ──────────────────────────────────────────────────────────
const sbGetLeads = (tenantId, module=null) => sbFetch("leads?select=*&order=created_at.desc"+(tenantId?"&tenant_id=eq."+tenantId:"")+(module?"&module=eq."+module:""));
const sbInsertLead = (lead) => sbFetch("leads", "POST", lead);
const sbUpdateLead = (id, patch) => sbFetch("leads?id=eq."+id, "PATCH", patch);
const sbDeleteLead = (id) => sbFetch("leads?id=eq."+id, "DELETE");
const sbUpsertGoal = (goal) => sbFetch("goals", "POST", goal);
const sbGetGoals = () => sbFetch("goals?select=*");
const sbGetLeadStages = () => sbFetch("lead_stages?select=*");
const sbUpsertLeadStage = (ls) => sbFetch("lead_stages", "POST", ls);
const sbInsertCadence = (entry) => sbFetch("cadence", "POST", entry);

// Convert DB lead to app lead format
const dbToLead = (r) => ({
  id: r.id,
  name: r.name,
  tipo: r.tipo||"PJ",
  company: r.company||r.name,
  role: r.role||"",
  email: r.email||"",
  phone: r.phone||"",
  phones: Array.isArray(r.phones) ? r.phones : (r.phone ? [r.phone] : []),
  emails: Array.isArray(r.emails) ? r.emails : (r.email ? [r.email] : []),
  address: r.address||"",
  website: r.website||"",
  city: r.city||"",
  origem: r.origem||"",
  score: r.score||0,
  status: r.status||"Novo cliente",
  funilStage: r.funil_stage||"s1",
  priority: r.priority||"Média",
  notes: r.notes||"",
  channel: r.channel||"Direto",
  description: r.description||"",
  business_hours: r.business_hours||"",
  cadence: [],
  createdAt: r.created_at,
  // Módulo e pós-venda
  module: r.module||"prospeccao",
  pos_venda_id: r.pos_venda_id||null,
  responsible: r.responsible||"",
  next_contact: r.next_contact||"",
  last_contact_at: r.last_contact_at||"",
  health_score: r.health_score||0,
});

// Convert app lead to DB format
const leadToDb = (l) => ({
  name: l.name,
  tipo: l.tipo||"PJ",
  company: l.company||l.name,
  role: l.role||"",
  email: (l.emails&&l.emails[0])||l.email||"",
  phone: (l.phones&&l.phones[0])||l.phone||"",
  phones: l.phones||[],
  emails: l.emails||[],
  address: l.address||"",
  website: l.website||"",
  city: l.city||"",
  origem: l.origem||"",
  score: l.score||0,
  status: l.status||"Novo cliente",
  funil_stage: l.funilStage||"s1",
  priority: l.priority||"Média",
  notes: l.notes||"",
  channel: l.channel||"Direto",
  description: l.description||"",
  business_hours: l.business_hours||"",
  tenant_id: l.tenant_id||null,
  module: l.module||"prospeccao",
});


const Icon = ({ d, size=18, color="currentColor", sw=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)?d.map((p,i)=><path key={i} d={p}/>):<path d={d}/>}
  </svg>
);

const IC = {
  dashboard:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  users:["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  message:["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  settings:["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z","M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check:"M20 6L9 17l-5-5",
  copy:["M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z","M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1"],
  mail:["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
  whatsapp:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.1-1.34A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z",
  linkedin:["M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z","M2 9h4v12H2z","M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  instagram:["M12 2H8C4.69 2 2 4.69 2 8v8c0 3.31 2.69 6 6 6h8c3.31 0 6-2.69 6-6V8c0-3.31-2.69-6-6-6z","M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z","M17.5 6.5h.01"],
  google:"M21.35 11.1H12v2.8h5.35c-.24 1.3-.95 2.4-2 3.1v2.6h3.24c1.9-1.74 3-4.3 3-7.34 0-.7-.06-1.4-.17-2.06h-.07z",
  bell:["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"],
  x:"M18 6L6 18M6 6l12 12",
  plus:"M12 5v14M5 12h14",
  export:["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  trash:["M3 6h18","M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"],
  building:["M2 20h20","M6 20V4h12v16","M10 8h4","M10 12h4","M10 16h4"],
  briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  eye:["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  eyeOff:["M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94","M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19","M1 1l22 22"],
  save:["M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z","M17 21v-8H7v8","M7 3v5h8"],
  info:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8h.01M12 12v4",
  target:["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z","M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z","M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  edit:["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7","M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"],
};

// ─── COLORS / STYLES ─────────────────────────────────────────────────────────
const C = { bg:"#060E1C", panel:"#0F2548", sidebar:"#0A1628", border:"#1E3A5F", accent:"#00B4D8", accent2:"#0077B6", text:"#E8F4FD", muted:"#64B5F6", dim:"#7BA7C4", faint:"#3A5470", gold:"#F59E0B" };
// getStatusList() is now derived from FUNIL_STAGES dynamically
const getStatusList = () => FUNIL_STAGES.map(s=>s.name);
const getStatusColor = (name) => { const s=FUNIL_STAGES.find(st=>st.name===name); return s?.color||"#6B7280"; };

const ACION_TIPOS = ["WhatsApp","E-mail","Ligação","LinkedIn","Visita Presencial","Indicação"];
const ACION_RES   = ["Sem resposta","Respondeu - interesse","Respondeu - sem interesse","Agendou reunião","Pediu proposta","Número errado","Caixa postal"];

// ── WhatsApp Templates ───────────────────────────────────────────────────────
const FUNIL_STAGES_MSGS = [
  "Novo cliente","Conversando","Relacionamento","Reunião agendada","Proposta enviada","Contratou"
];

// ─── TEMPLATES POR ETAPA DO FUNIL ────────────────────────────────────────────
const MSG_TEMPLATES = {
  whatsapp: {
    "Novo cliente": [
      { id:"wa_nc1", label:"1º Contato Direto", text:(l,p)=>"Olá! Sou da "+( p?.companyName||"OPEN Log")+", especializada em logística para o setor médico-hospitalar. Vi que a "+(l.company||l.name)+" atua no segmento de saúde. Podemos conversar rapidamente sobre como otimizamos a cadeia de suprimentos OPME?" },
      { id:"wa_nc2", label:"Apresentação Valor", text:(l,p)=>"Bom dia! A "+(p?.companyName||"OPEN Log")+" ajuda empresas como a "+(l.company||l.name)+" a reduzir custos logísticos em até 40% na distribuição de materiais cirúrgicos. Teria 10 minutos para conhecer nossa solução?" },
      { id:"wa_nc3", label:"Dor + Solução", text:(l,p)=>"Olá! Ruptura de estoque no centro cirúrgico é um dos maiores problemas do setor OPME. A "+(p?.companyName||"OPEN Log")+" resolve isso com entrega just-in-time. A "+(l.company||l.name)+" enfrenta esse desafio?" },
      { id:"wa_nc4", label:"Case de Sucesso", text:(l,p)=>"Oi! Recentemente ajudamos uma distribuidora similar à "+(l.company||l.name)+" a cortar 35% dos custos de armazenagem. Posso compartilhar o case? Acho que faz sentido para vocês!" },
      { id:"wa_nc5", label:"Conexão Segmento", text:(l,p)=>"Olá! Trabalho com logística especializada para o setor de OPME e materiais cirúrgicos. A "+(l.company||l.name)+" está no nosso radar de parceiros estratégicos. Quando podemos conversar?" },
    ],
    "Conversando": [
      { id:"wa_cv1", label:"Follow-up Engajamento", text:(l,p)=>"Oi! Passando para ver se teve oportunidade de pensar na nossa conversa. Temos uma solução que pode fazer diferença na operação da "+(l.company||l.name)+". Posso enviar mais detalhes?" },
      { id:"wa_cv2", label:"Material de Apoio", text:(l,p)=>"Olá! Preparei um material com cases de empresas do mesmo segmento da "+(l.company||l.name)+". Quer que eu envie? Acredito que vai agregar na sua avaliação." },
      { id:"wa_cv3", label:"Proposta de Reunião", text:(l,p)=>"Oi! Que tal uma conversa de 20 minutos para eu apresentar como a "+(p?.companyName||"OPEN Log")+" pode otimizar a logística da "+(l.company||l.name)+"? Tenho disponibilidade essa semana." },
      { id:"wa_cv4", label:"Diferencial Específico", text:(l,p)=>"Olá! Um diferencial que nossos clientes destacam é a rastreabilidade total dos materiais OPME, com relatórios em tempo real. Isso é um critério importante para a "+(l.company||l.name)+"?" },
      { id:"wa_cv5", label:"Urgência Positiva", text:(l,p)=>"Oi! Estamos com uma janela de onboarding aberta para novos parceiros este mês com condições especiais. Seria interessante para a "+(l.company||l.name)+" aproveitar?" },
    ],
    "Reunião agendada": [
      { id:"wa_ra1", label:"Confirmação", text:(l,p)=>"Olá! Confirmando nossa reunião amanhã. Estou animado para apresentar como a "+(p?.companyName||"OPEN Log")+" pode transformar a logística da "+(l.company||l.name)+"! Algum ponto específico que gostaria de abordar?" },
      { id:"wa_ra2", label:"Lembrete D-1", text:(l,p)=>"Oi! Só passando para confirmar nosso encontro amanhã. Preparei uma apresentação personalizada para a realidade da "+(l.company||l.name)+". Até lá!" },
      { id:"wa_ra3", label:"Lembrete Dia", text:(l,p)=>"Bom dia! Nossa reunião é hoje! Qualquer imprevisto me avise. Estou à disposição para reagendar se necessário. Até mais tarde!" },
      { id:"wa_ra4", label:"Pós-reunião", text:(l,p)=>"Olá! Foi ótimo conversar com você hoje. Conforme discutimos, vou preparar a proposta personalizada para a "+(l.company||l.name)+". Envio em breve!" },
      { id:"wa_ra5", label:"Reagendamento", text:(l,p)=>"Oi! Vi que não conseguimos nos falar. Tudo bem por aí? Podemos reagendar para outro horário que funcione melhor para a "+(l.company||l.name)+"?" },
    ],
    "Proposta enviada": [
      { id:"wa_pe1", label:"Follow Proposta", text:(l,p)=>"Olá! Enviamos a proposta há alguns dias. Teve oportunidade de analisar? Posso esclarecer qualquer dúvida ou ajustar algum ponto para a "+(l.company||l.name)+"." },
      { id:"wa_pe2", label:"Destaque Benefício", text:(l,p)=>"Oi! Destacando um ponto importante da proposta: o ROI médio dos nossos clientes é de 6 meses. Para a "+(l.company||l.name)+", estimamos ainda menos. Posso detalhar os cálculos?" },
      { id:"wa_pe3", label:"Pergunta Decisão", text:(l,p)=>"Olá! Para avançarmos, preciso entender: o que seria necessário para a "+(l.company||l.name)+" tomar a decisão? Posso ajustar a proposta ou facilitar algum ponto?" },
      { id:"wa_pe4", label:"Condição Especial", text:(l,p)=>"Oi! Tenho autorização para oferecer condições especiais para fecharmos ainda este mês. Seria possível conversar hoje ou amanhã?" },
      { id:"wa_pe5", label:"Última Tentativa", text:(l,p)=>"Olá! Não quero perder a oportunidade de trabalharmos com a "+(l.company||l.name)+". Se a proposta atual não atende, me diga o que precisamos ajustar. Estou aqui para encontrar o melhor caminho." },
    ],
    "Contratou": [
      { id:"wa_ct1", label:"Boas-vindas", text:(l,p)=>"Olá! Seja bem-vindo(a) à família "+(p?.companyName||"OPEN Log")+"! 🎉 Estamos muito felizes em ter a "+(l.company||l.name)+" como parceira. Nossa equipe entrará em contato para os próximos passos do onboarding." },
      { id:"wa_ct2", label:"Check-in Semana 1", text:(l,p)=>"Oi! Como está sendo a primeira semana de parceria? A "+(l.company||l.name)+" está satisfeita com o início do processo? Estamos à disposição!" },
      { id:"wa_ct3", label:"Suporte Ativo", text:(l,p)=>"Olá! Passando para verificar se a "+(l.company||l.name)+" precisa de algum suporte. Nossa equipe está disponível para qualquer dúvida operacional." },
      { id:"wa_ct4", label:"Resultado Parcial", text:(l,p)=>"Oi! Já temos os primeiros resultados da parceria com a "+(l.company||l.name)+". Gostaria de agendar uma conversa para compartilhar os indicadores?" },
      { id:"wa_ct5", label:"Indicação", text:(l,p)=>"Olá! Ficamos felizes com a parceria com a "+(l.company||l.name)+"! Conhece outras empresas do setor que poderiam se beneficiar das nossas soluções? Uma indicação seria muito bem-vinda!" },
    ],
  },

  ligacao: {
    "Novo cliente": [
      { id:"li_nc1", label:"Script Abertura Direta", text:(l)=>"Olá, bom dia! Falo com a "+( l.company||l.name)+"? Meu nome é [Seu Nome], sou da OPEN Log. Ligamos porque identificamos que a "+( l.company||l.name)+" atua no setor de materiais cirúrgicos e acreditamos ter uma solução muito relevante para vocês. Teria 5 minutos?" },
      { id:"li_nc2", label:"Script Referência Setor", text:(l)=>"Bom dia! Estou ligando para a "+(l.company||l.name)+" porque trabalhamos com diversas empresas do segmento de OPME em [cidade] e temos ajudado a reduzir custos logísticos significativamente. Quem seria a pessoa responsável pela área de operações ou compras?" },
      { id:"li_nc3", label:"Script Dor OPME", text:(l)=>"Olá! Você cuida da área de logística ou suprimentos da "+(l.company||l.name)+"? Ótimo! Ligamos especificamente porque ruptura de estoque e rastreabilidade são desafios críticos no setor de OPME. A OPEN Log resolveu isso para mais de [X] clientes. Posso apresentar como?" },
      { id:"li_nc4", label:"Script Curto e Direto", text:(l)=>"Oi, tudo bem? Aqui é da OPEN Log, logística especializada em OPME. Ligamos para a "+(l.company||l.name)+" para uma apresentação rápida de 10 minutos. Quando seria um bom horário para falarmos?" },
      { id:"li_nc5", label:"Script Gatilho Curiosidade", text:(l)=>"Bom dia! Queria compartilhar com a "+(l.company||l.name)+" um método que reduz em 40% o custo de armazenagem de materiais cirúrgicos, sem perda de qualidade. Tem 5 minutos para eu explicar como funciona?" },
    ],
    "Conversando": [
      { id:"li_cv1", label:"Script Follow-up", text:(l)=>"Olá! Aqui é da OPEN Log. Ligamos para dar continuidade à nossa conversa com a "+(l.company||l.name)+". Você teve oportunidade de pensar na nossa solução? Posso esclarecer alguma dúvida?" },
      { id:"li_cv2", label:"Script Aprofundamento", text:(l)=>"Bom dia! Ligando para a "+(l.company||l.name)+". Na nossa última conversa, você mencionou [dor específica]. Queria compartilhar como exatamente resolvemos isso com outros clientes. Tem alguns minutos?" },
      { id:"li_cv3", label:"Script Agendamento Reunião", text:(l)=>"Olá! Gostaria de propor uma reunião de apresentação mais detalhada para a "+(l.company||l.name)+". Seria esta semana ou na próxima? Tenho disponibilidade em alguns horários." },
      { id:"li_cv4", label:"Script Objeção Preço", text:(l)=>"Oi! Entendo que custo é um fator importante. Quero mostrar para a "+(l.company||l.name)+" que nosso serviço tem ROI comprovado de 6 meses em média. Posso enviar os números?" },
      { id:"li_cv5", label:"Script Urgência", text:(l)=>"Bom dia! Ligando para a "+(l.company||l.name)+" porque estamos com vagas limitadas de onboarding este trimestre. Gostaríamos de priorizar vocês. Podemos avançar?" },
    ],
    "Reunião agendada": [
      { id:"li_ra1", label:"Script Confirmação", text:(l)=>"Olá! Ligando para confirmar nossa reunião marcada com a "+(l.company||l.name)+". Tudo certo para [data e horário]? Há algum ponto específico que gostaria de abordar?" },
      { id:"li_ra2", label:"Script Reagendamento", text:(l)=>"Bom dia! Percebemos que não nos encontramos conforme agendado com a "+(l.company||l.name)+". Tudo bem por aí? Quando podemos reagendar?" },
      { id:"li_ra3", label:"Script Pré-reunião", text:(l)=>"Oi! Amanhã temos nossa reunião com a "+(l.company||l.name)+". Queria confirmar se receberam o material que enviamos e se há alguma pergunta prévia." },
      { id:"li_ra4", label:"Script Pós-reunião", text:(l)=>"Olá! Foi excelente conversar com a "+(l.company||l.name)+" hoje. Conforme combinado, enviarei a proposta personalizada. Alguma consideração adicional antes que eu prepare?" },
      { id:"li_ra5", label:"Script No-show", text:(l)=>"Bom dia! Tentamos contato mas não conseguimos falar com a "+(l.company||l.name)+". Gostaríamos muito de dar continuidade. Quando seria um bom momento para falarmos?" },
    ],
    "Proposta enviada": [
      { id:"li_pe1", label:"Script Follow Proposta", text:(l)=>"Olá! Ligando para verificar se a "+(l.company||l.name)+" recebeu e analisou nossa proposta. Há alguma dúvida ou ponto que gostaria de revisar?" },
      { id:"li_pe2", label:"Script Decisor", text:(l)=>"Bom dia! Queria entender o processo decisório da "+(l.company||l.name)+". Há outras pessoas envolvidas na aprovação? Posso fazer uma apresentação para toda a equipe?" },
      { id:"li_pe3", label:"Script Negociação", text:(l)=>"Olá! Sobre a proposta enviada para a "+(l.company||l.name)+": se houver algum ponto que não se encaixou, tenho flexibilidade para ajustar. O que precisaria mudar para fecharmos?" },
      { id:"li_pe4", label:"Script Prazo", text:(l)=>"Oi! Ligando pois nossa proposta para a "+(l.company||l.name)+" tem validade até o final do mês. Gostaríamos de fechar para garantir as condições atuais. Como estamos?" },
      { id:"li_pe5", label:"Script Última Tentativa", text:(l)=>"Bom dia! Esta é nossa última tentativa de contato com a "+(l.company||l.name)+". Queremos muito ter vocês como parceiros. Se não for o momento certo, tudo bem - mas adoraríamos saber como podemos ajudar no futuro." },
    ],
    "Contratou": [
      { id:"li_ct1", label:"Script Boas-vindas", text:(l)=>"Olá! Ligando para dar as boas-vindas à "+(l.company||l.name)+" à família OPEN Log! Nossa equipe de onboarding entrará em contato esta semana. Está com alguma dúvida?" },
      { id:"li_ct2", label:"Script Check-in", text:(l)=>"Bom dia! Como está sendo a experiência da "+(l.company||l.name)+" com a OPEN Log? Há algo que possamos melhorar ou ajustar?" },
      { id:"li_ct3", label:"Script Suporte", text:(l)=>"Olá! Só para reforçar: o suporte da OPEN Log está disponível 24h para a "+(l.company||l.name)+". Qualquer ocorrência operacional, estamos à disposição." },
      { id:"li_ct4", label:"Script Resultado", text:(l)=>"Oi! Temos os primeiros resultados da parceria com a "+(l.company||l.name)+". Gostaria de apresentar os indicadores. Quando teria disponibilidade?" },
      { id:"li_ct5", label:"Script Expansão", text:(l)=>"Bom dia! A "+(l.company||l.name)+" está satisfeita com os resultados? Gostaríamos de discutir a expansão da parceria para outras linhas de produto. Faz sentido conversarmos?" },
    ],
  },

  email: {
    "Novo cliente": [
      { id:"em_nc1", label:"Apresentação Institucional",
        subject:(l,p)=>"Solução logística para "+( l.company||l.name)+" - "+(p?.companyName||"OPEN Log"),
        body:(l,p)=>"Prezado(a),  Meu nome é [Seu Nome] e represento a "+(p?.companyName||"OPEN Log")+", especializada em logística médico-hospitalar para o setor OPME.  Identificamos que a "+(l.company||l.name)+" é referência no segmento e acreditamos que nossa solução pode agregar valor significativo às operações de vocês.  Nossos principais benefícios: • Entrega just-in-time para centros cirúrgicos • Rastreabilidade total de materiais OPME • Redução média de 40% nos custos logísticos • Armazenagem climatizada e certificada  Gostaria de agendar 20 minutos para uma apresentação?  Atenciosamente, [Seu Nome]" },
      { id:"em_nc2", label:"E-mail Curto Impactante",
        subject:(l,p)=>"40% de redução em custos logísticos para a "+(l.company||l.name),
        body:(l,p)=>"Olá,  Uma pergunta direta: a "+(l.company||l.name)+" já pensou em terceirizar a logística de OPME para reduzir custos e ganhar rastreabilidade?  A "+(p?.companyName||"OPEN Log")+" faz isso para empresas do mesmo segmento com resultado comprovado.  Posso mostrar como em 15 minutos?  [Seu Nome]" },
      { id:"em_nc3", label:"E-mail com Case",
        subject:(l,p)=>"Como uma distribuidora similar à "+(l.company||l.name)+" reduziu custos em 35%",
        body:(l,p)=>"Prezado(a),  Recentemente ajudamos uma distribuidora de materiais cirúrgicos a reduzir 35% dos custos de armazenagem e eliminar 100% das rupturas de estoque em centros cirúrgicos.  Acredito que a "+(l.company||l.name)+" poderia ter resultados similares.  Posso compartilhar o case completo e como poderíamos replicar para vocês?  [Seu Nome] "+(p?.companyName||"OPEN Log") },
      { id:"em_nc4", label:"E-mail Referência Setor",
        subject:(l,p)=>"Logística especializada em OPME para a "+(l.company||l.name),
        body:(l,p)=>"Prezado(a),  Trabalho com empresas do setor médico-hospitalar há anos e sei o quanto desafios como rastreabilidade de implantes, controle de validade e entrega urgente impactam a operação.  A "+(p?.companyName||"OPEN Log")+" foi criada especificamente para resolver esses problemas.  Teria interesse em conhecer nossa abordagem?  Aguardo retorno, [Seu Nome]" },
      { id:"em_nc5", label:"E-mail Indicação",
        subject:(l,p)=>"Indicação para a "+(l.company||l.name)+" - "+(p?.companyName||"OPEN Log"),
        body:(l,p)=>"Prezado(a),  Recebi indicação de um parceiro do setor para entrar em contato com a "+(l.company||l.name)+".  Somos a "+(p?.companyName||"OPEN Log")+", referência em logística para OPME e materiais cirúrgicos.  Gostaria de apresentar como podemos colaborar. Tem disponibilidade para uma conversa rápida?  [Seu Nome]" },
    ],
    "Proposta enviada": [
      { id:"em_pe1", label:"Follow-up Proposta",
        subject:(l,p)=>"Proposta "+(p?.companyName||"OPEN Log")+" para "+(l.company||l.name)+" - Aguardando retorno",
        body:(l,p)=>"Prezado(a),  Enviamos nossa proposta há alguns dias e gostaríamos de saber se houve oportunidade de análise.  Estamos à disposição para: • Esclarecer dúvidas • Ajustar condições • Apresentar para outros decisores  Qual seria o próximo passo?  [Seu Nome]" },
      { id:"em_pe2", label:"E-mail Condição Especial",
        subject:(l,p)=>"Condição especial para a "+(l.company||l.name)+" - válido até fim do mês",
        body:(l,p)=>"Prezado(a),  Tenho autorização para oferecer condições especiais para a "+(l.company||l.name)+" caso fechemos este mês:  • [Benefício 1] • [Benefício 2] • [Benefício 3]  Gostaria de aproveitar essa oportunidade?  [Seu Nome]" },
      { id:"em_pe3", label:"E-mail Decisor",
        subject:(l,p)=>"Próximos passos - Parceria "+(p?.companyName||"OPEN Log")+" e "+(l.company||l.name),
        body:(l,p)=>"Prezado(a),  Para avançarmos com a proposta, precisamos entender o processo decisório da "+(l.company||l.name)+".  Há outras pessoas que deveriam participar da avaliação? Podemos fazer uma apresentação conjunta para toda a equipe envolvida.  Aguardo orientação, [Seu Nome]" },
      { id:"em_pe4", label:"E-mail ROI",
        subject:(l,p)=>"ROI da parceria com a "+(p?.companyName||"OPEN Log")+" para "+(l.company||l.name),
        body:(l,p)=>"Prezado(a),  Quero reforçar um ponto da nossa proposta: o retorno sobre investimento médio dos nossos clientes é de 6 meses.  Para a "+(l.company||l.name)+", com base no volume estimado, projetamos ROI em [X meses].  Posso detalhar os cálculos em uma conversa rápida?  [Seu Nome]" },
      { id:"em_pe5", label:"E-mail Última Chance",
        subject:(l,p)=>"Última tentativa de contato - "+(p?.companyName||"OPEN Log"),
        body:(l,p)=>"Prezado(a),  Esta é nossa última tentativa de contato referente à proposta enviada para a "+(l.company||l.name)+".  Se não for o momento certo, compreendemos. Mas se houver qualquer barreira que possamos remover, estamos dispostos a ouvir.  O que precisaria mudar para avançarmos?  [Seu Nome]" },
    ],
  },
};

// Helper: get templates for a stage and channel
const getTemplates = (channel, stage) => {
  const ch = MSG_TEMPLATES[channel];
  if(!ch) return [];
  // Find best matching stage
  if(ch[stage]) return ch[stage];
  // Fallback to Novo cliente
  return ch["Novo cliente"] || [];
};


// ── Security helpers ──────────────────────────────────────────────────────────
const INACTIVITY_MS = 30*60*1000;
const sanitize = (s) => String(s||"").replace(/[<>]/g,"").trim().slice(0,500);
const sanitizeForPrompt = (s) => String(s||"").replace(/[$\\]/g,"").trim().slice(0,300);
class RateLimiter { constructor(max,ms){this.max=max;this.ms=ms;this.calls=[];} check(){const now=Date.now();this.calls=this.calls.filter(t=>now-t<this.ms);if(this.calls.length>=this.max)return false;this.calls.push(now);return true;} }
const verifyOwner = (user) => user?.role==="owner";


const inp = { width:"100%", background:C.sidebar, border:("1px solid "+C.border), borderRadius:8, padding:"9px 12px", color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const lbl = { fontSize:11, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 };
const card = (ex={}) => ({ background:C.panel, border:("1px solid "+C.border), borderRadius:12, padding:20, ...ex });
const btnP = { display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"), color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer" };
const btnG = { display:"inline-flex", alignItems:"center", gap:7, padding:"7px 14px", background:"transparent", color:C.dim, border:("1px solid "+C.border), borderRadius:8, fontWeight:500, fontSize:12, cursor:"pointer" };
const btnD = { display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(248,113,113,0.1)", color:"#F87171", border:"1px solid rgba(248,113,113,0.25)", borderRadius:8, fontWeight:600, fontSize:12, cursor:"pointer" };
const pill = (s) => { const c=getStatusColor(s)||C.dim; return { display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:c, background:(c+"18"), border:("1px solid "+c+"33") }; };

// ─── AUTH - persistent shared user store ─────────────────────────────────────
// All available module IDs
const ALL_MODULES = ["dashboard","profile","search","addlead","messages","whatsapp","crm","funil","metas","cadencia","receptivo","pos_venda","reativacao","suporte","settings","master","super_admin"];
const PERMISSIONS_SCHEMA = {
  dashboard:  { label:"Dashboard",          items:{ view:{label:"Ver dashboard"} } },
  profile:    { label:"Perfil da Empresa",  items:{ view:{label:"Ver perfil"}, edit:{label:"Editar perfil"} } },
  addlead:    { label:"Cadastrar Empresa",  items:{ view:{label:"Ver tela"}, create:{label:"Cadastrar"} } },
  search:     { label:"Busca de Leads",     items:{ view:{label:"Ver tela"}, search:{label:"Buscar leads"}, add_found:{label:"Adicionar lead"} }, quota:true },
  crm:        { label:"CRM",               items:{ view:{label:"Ver leads"}, edit:{label:"Editar lead"}, delete:{label:"Excluir lead"}, move:{label:"Mover no funil"}, history:{label:"Ver histórico"}, acionar:{label:"Acionar lead"} } },
  funil:      { label:"Funil de Vendas",   items:{ view:{label:"Ver funil"}, move:{label:"Mover etapas"}, config:{label:"Configurar etapas"} } },
  messages:   { label:"Mensagens",         items:{ view:{label:"Ver mensagens"}, send:{label:"Enviar mensagem"} } },
  whatsapp:   { label:"WhatsApp",          items:{ view:{label:"Ver tela"}, send:{label:"Enviar mensagem"}, bulk:{label:"Disparar em lote"} } },
  cadencia:   { label:"Cadências",         items:{ view:{label:"Ver cadencias"}, create:{label:"Criar"}, edit:{label:"Editar"}, apply:{label:"Aplicar"}, auto:{label:"Disparar automático"} } },
  metas:      { label:"Metas",             items:{ view:{label:"Ver metas"}, create:{label:"Criar meta"}, edit:{label:"Editar meta"} } },
  receptivo:  { label:"Receptivo",         items:{ view:{label:"Ver leads"}, kanban:{label:"Kanban"}, by_channel:{label:"Por canal"}, acionar:{label:"Acionar"} } },
  pos_venda:  { label:"Pós-venda",         items:{ view:{label:"Ver clientes"}, schedule:{label:"Agendar"}, import_csv:{label:"Importar CSV"}, update_status:{label:"Atualizar status"} } },
  reativacao: { label:"Reativação",        items:{ view:{label:"Ver leads frios"}, acionar:{label:"Acionar"} } },
  suporte:    { label:"Suporte",           items:{ view:{label:"Ver tickets"}, create:{label:"Criar ticket"}, close:{label:"Fechar ticket"} } },
  settings:   { label:"Configurações",     items:{ view:{label:"Ver config"}, funil_config:{label:"Config funil"}, segments:{label:"Segmentos"} } },
  master:     { label:"Controle de Acesso",items:{ view:{label:"Ver usuários"}, create_user:{label:"Criar usuário"}, edit_user:{label:"Editar usuário"}, reset_password:{label:"Resetar senha"}, permissions:{label:"Permissões"} } },
};
const getAllModPerms = (modId) => Object.keys(PERMISSIONS_SCHEMA[modId]?.items||{});
const hasPermission = (user, tenantCfg, mod, action) => {
  if(!user) return false;
  if(user.role==="owner") return true;
  const tp = tenantCfg?.permissions?.[mod];
  if(!tp||!tp.items?.includes(action)) return false;
  if(user.role==="admin") return true;
  const up = user.perms_v2?.[mod];
  return Array.isArray(up)&&up.includes(action);
};
const DEFAULT_USER_PERMS = ["dashboard","profile","search","addlead","messages","whatsapp","crm","funil","metas","settings"];
const DEFAULT_MASTER_PERMS = [...ALL_MODULES]; // master sees everything including master panel


// ─── FUNIL DE VENDAS - Dados Globais ─────────────────────────────────────────
const ACTION_TYPES = [
  {id:"whatsapp", label:"WhatsApp",  icon:"💬", color:"#25D366"},
  {id:"email",    label:"E-mail",    icon:"✉️",  color:"#2563EB"},
  {id:"audio",    label:"Áudio",     icon:"🎵",  color:"#A855F7"},
  {id:"ligacao",  label:"Ligação",   icon:"📞",  color:"#F59E0B"},
  {id:"visita",   label:"Visita",    icon:"🤝",  color:"#EC4899"},
  {id:"outro",    label:"Outro",     icon:"⚡",  color:"#6B7280"},
];

const DEFAULT_STAGES = [
  { id:"s1", name:"Novo cliente",     color:"#3B82F6", maxDays:7,  order:0,
    actions:[
      {id:"a1",day:1,type:"whatsapp",label:"1º Contato",    msg:"Olá {nome}! Sou da OPEN Log, especializada em logística para o setor médico-hospitalar. Posso apresentar como podemos otimizar sua cadeia de suprimentos OPME?"},
      {id:"a2",day:3,type:"whatsapp",label:"Follow-up",     msg:"Olá {nome}, tudo bem? Gostaria de saber se teve a oportunidade de pensar na nossa conversa. Temos cases incríveis na área hospitalar que podem te interessar!"},
      {id:"a3",day:6,type:"ligacao", label:"Tentativa liga",msg:"Ligar para {nome} - apresentar soluções OPEN Log"},
    ]},
  { id:"s2", name:"Conversando",      color:"#8B5CF6", maxDays:14, order:1,
    actions:[
      {id:"a4",day:1,type:"whatsapp",label:"Engajamento",   msg:"Olá {nome}! Preparei um material sobre como reduzimos em 40% o tempo de entrega de OPME em hospitais similares ao seu. Posso enviar?"},
      {id:"a5",day:4,type:"whatsapp",label:"Proposta valor",msg:"Oi {nome}! Nossa solução resolve diretamente a ruptura de estoque no centro cirúrgico. Quando podemos conversar melhor sobre isso?"},
      {id:"a6",day:8,type:"email",   label:"E-mail detalhado",msg:"Segue material completo sobre nossas soluções logísticas para OPME..."},
      {id:"a7",day:12,type:"ligacao",label:"Ligar",         msg:"Ligar para {nome} - agendar reunião de apresentação"},
    ]},
  { id:"s3", name:"Relacionamento",   color:"#10B981", maxDays:21, order:2,
    actions:[
      {id:"a8",day:3,type:"whatsapp",label:"Nutrição",      msg:"Olá {nome}! Compartilhando um case de sucesso do nosso cliente {empresa_similar} - resultado em 60 dias de parceria."},
      {id:"a9",day:10,type:"email",  label:"Newsletter",    msg:"Conteúdo exclusivo do setor OPME para {nome}..."},
    ]},
  { id:"s4", name:"Reunião agendada", color:"#F59E0B", maxDays:3,  order:3,
    actions:[
      {id:"a10",day:0,type:"whatsapp",label:"Confirmação",  msg:"Olá {nome}! Confirmando nossa reunião amanhã. Estou animado para apresentar como a OPEN Log pode transformar sua logística OPME!"},
      {id:"a11",day:1,type:"whatsapp",label:"Lembrete",     msg:"Oi {nome}! Só lembrando da nossa reunião hoje. Qualquer dúvida estou à disposição!"},
    ]},
  { id:"s5", name:"Montar orçamento", color:"#EC4899", maxDays:5,  order:4,
    actions:[
      {id:"a12",day:2,type:"whatsapp",label:"Status proposta",msg:"Olá {nome}! Estou finalizando sua proposta personalizada. Algum ponto específico que precisa de atenção especial?"},
    ]},
  { id:"s6", name:"Não compareceu",   color:"#EF4444", maxDays:7,  order:5,
    actions:[
      {id:"a13",day:1,type:"whatsapp",label:"Reagendamento",msg:"Olá {nome}! Vi que não conseguimos nos falar. Ficou alguma dúvida? Podemos reagendar em outro horário?"},
      {id:"a14",day:4,type:"ligacao", label:"Ligar",        msg:"Ligar para {nome} - tentar reagendar reunião"},
    ]},
  { id:"s7", name:"Proposta enviada", color:"#6366F1", maxDays:10, order:6,
    actions:[
      {id:"a15",day:2,type:"whatsapp",label:"Follow proposta",msg:"Olá {nome}! Enviamos a proposta há 2 dias. Teve a oportunidade de analisar? Posso esclarecer qualquer ponto!"},
      {id:"a16",day:5,type:"ligacao", label:"Ligar",        msg:"Ligar para {nome} - discutir proposta e negociar"},
      {id:"a17",day:9,type:"whatsapp",label:"Última chance",msg:"Oi {nome}! Não quero perder a oportunidade de trabalharmos juntos. Posso oferecer condições especiais para fecharmos esta semana?"},
    ]},
  { id:"s8", name:"Contratou", color:"#4ADE80", maxDays:999, order:7,
    actions:[
      {id:"a18",day:1,type:"whatsapp",label:"Boas-vindas",  msg:"Olá {nome}! Seja bem-vindo(a) à família OPEN Log! 🎉 Estamos muito felizes em ter {empresa} como parceiro. Em breve nossa equipe entrará em contato para os próximos passos."},
      {id:"a19",day:7,type:"whatsapp",label:"Check-in",     msg:"Oi {nome}! Como está sendo a experiência até agora? Precisa de algo?"},
    ]},
];

// Runtime state - mutable
let FUNIL_STAGES = JSON.parse(JSON.stringify(DEFAULT_STAGES));

// Lead stage tracking: { leadId: { stageId, enteredAt(ISO), actionsTriggered:[actionId] } }
const LEAD_STAGE = {};
const setLeadStage = (lid, sid) => {
  LEAD_STAGE[lid] = { stageId: sid, enteredAt: new Date().toISOString(), actionsTriggered: [] };
};
const getLeadStage = (lid) => LEAD_STAGE[lid] || null;
// ─── CADÊNCIA HELPERS ────────────────────────────────────────────────────────
const getCadencePending = (lead) => {
  if(!lead.cadence||lead.cadence.length===0) return [];
  const today = new Date().toISOString().split("T")[0];
  return lead.cadence.filter(step=>
    step.status==="pendente" && step.scheduledFor <= today
  ).map(step=>({...step, overdue: step.scheduledFor < today}));
};

const getCadenceProgress = (lead) => {
  if(!lead.cadence||lead.cadence.length===0) return null;
  const total = lead.cadence.length;
  const done  = lead.cadence.filter(s=>s.status==="concluido").length;
  const pct   = Math.round((done/total)*100);
  return { total, done, pct };
};

const markCadenceStepDone = (lead, stepIndex, onUpdate) => {
  const updated = lead.cadence.map((s,i)=>
    i===stepIndex ? {...s, status:"concluido", doneAt:new Date().toISOString()} : s
  );
  onUpdate({...lead, cadence:updated});
  // Check next auto step and trigger N8N if auto cadence
  const nextStep = updated.find(s=>s.status==="pendente");
  if(nextStep&&TENANT_CONFIG.webhookUrl&&nextStep.auto){
    fetch(TENANT_CONFIG.webhookUrl+"/cadence-next",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lead_id:lead.id,lead_name:lead.name,next_step:nextStep}),
      mode:"no-cors"
    }).catch(()=>{});
  }
};

const markCadenceStepDoneById = (lead, stepId, onUpdate) => {
  const updated = lead.cadence.map(s=>
    s.id===stepId ? {...s, status:"concluido", doneAt:new Date().toISOString()} : s
  );
  onUpdate({...lead, cadence:updated});
};

const markActionDone = (lid, aid) => {
  if(!LEAD_STAGE[lid]) return;
  if(!LEAD_STAGE[lid].actionsTriggered.includes(aid))
    LEAD_STAGE[lid].actionsTriggered.push(aid);
};

// Compute pending actions for a lead
const getPendingActions = (lead) => {
  const ls = getLeadStage(lead.id);
  if(!ls) return [];
  const stage = FUNIL_STAGES.find(s=>s.id===ls.stageId);
  if(!stage) return [];
  const daysIn = Math.floor((Date.now()-new Date(ls.enteredAt))/(1000*60*60*24));
  return stage.actions
    .filter(a => a.day <= daysIn && !ls.actionsTriggered.includes(a.id))
    .map(a => ({...a, daysIn, daysOverdue: daysIn - a.day, stage}));
};

// Check if lead has available contact method for action type
const canDoAction = (lead, type) => {
  if(type==="email")    return !!lead.email;
  if(type==="whatsapp") return !!lead.phone && lead.hasWhatsapp !== false;
  if(type==="audio")    return !!lead.phone && lead.hasWhatsapp !== false;
  if(type==="ligacao")  return !!lead.phone;
  return true;
};


// ─── METAS - Sistema de Metas ─────────────────────────────────────────────────
// Mapeamento de indicadores → etapas do funil
const GOAL_INDICATORS = [
  { id:"leads",     label:"Leads Gerados",       icon:"👥", color:"#00B4D8", stageIds:null,  desc:"Todo lead que entrar no funil" },
  { id:"conversa",  label:"Conversas Iniciadas",  icon:"💬", color:"#8B5CF6", stageIds:["s2"],desc:"Leads que chegaram em Conversando" },
  { id:"reuniao",   label:"Reuniões Realizadas",  icon:"🤝", color:"#F59E0B", stageIds:["s4"],desc:"Leads que chegaram em Reunião agendada" },
  { id:"fechamento",label:"Fechamentos",          icon:"🏆", color:"#4ADE80", stageIds:["s8"],desc:"Leads que chegaram em Contratou" },
];

// GOALS_DB: { "YYYY-MM": { company: {leads:0,conversa:0,reuniao:0,fechamento:0}, users: { userId: {leads,conversa,reuniao,fechamento} } } }
// ── GOALS DB - structure: { scope_id: { dia: {leads,conversa,reuniao,fechamento}, semana: {...}, mes: {...} } }
// scope_id = "company" or userId
const GOALS_DB2 = {};
const PERIODS = ["dia","semana","mes"];
const PERIOD_LABELS = {dia:"Dia",semana:"Semana",mes:"Mês"};

const getGoals2 = (scopeId) => {
  if(!GOALS_DB2[scopeId]) GOALS_DB2[scopeId] = {
    dia:    {leads:0,conversa:0,reuniao:0,fechamento:0},
    semana: {leads:0,conversa:0,reuniao:0,fechamento:0},
    mes:    {leads:0,conversa:0,reuniao:0,fechamento:0},
  };
  return GOALS_DB2[scopeId];
};

const setGoal2 = (scopeId, period, indicator, value) => {
  const g = getGoals2(scopeId);
  g[period][indicator] = parseInt(value)||0;
};

const getGoalValue = (scopeId, period, indicator) => {
  return getGoals2(scopeId)[period]?.[indicator] || 0;
};

const getGoalKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;

// Compute actual progress from leads for a given indicator and period
const computeProgress = (leads, indicator, periodLeads) => {
  if(indicator==="leads")      return periodLeads.length;
  if(indicator==="conversa")   return periodLeads.filter(l=>{ const ls=getLeadStage(l.id); return ["s2","s3","s4","s5","s6","s7","s8"].includes(ls?.stageId); }).length;
  if(indicator==="reuniao")    return periodLeads.filter(l=>{ const ls=getLeadStage(l.id); return ["s4","s5","s6","s7","s8"].includes(ls?.stageId); }).length;
  if(indicator==="fechamento") return periodLeads.filter(l=>{ const ls=getLeadStage(l.id); return ls?.stageId==="s8"; }).length;
  return 0;
};

const getDateRange = (filter) => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if(filter==="dia")    return { start:new Date(y,m,d,0,0,0), end:new Date(y,m,d,23,59,59) };
  if(filter==="semana"){ const dow=now.getDay(); return { start:new Date(y,m,d-dow), end:new Date(y,m,d+(6-dow),23,59,59) }; }
  if(filter==="mes")    return { start:new Date(y,m,1), end:new Date(y,m+1,0,23,59,59) };
  return { start:new Date(y,m,1), end:new Date(y,m+1,0,23,59,59) };
};

const filterLeadsByPeriod = (leads, filter) => {
  const { start, end } = getDateRange(filter);
  return leads.filter(l => {
    const ls = getLeadStage(l.id);
    if(!ls) return false;
    const entered = new Date(ls.enteredAt);
    return entered >= start && entered <= end;
  });
};




// ─── SEGMENTS - gerenciado pelo Owner ────────────────────────────────────────
let SEGMENTS_DB = [
  "Hospitais e Clínicas",
  "Distribuidoras de OPME",
  "Fabricantes de Implantes",
  "Distribuidoras de Material Cirúrgico",
  "Clínicas Ortopédicas",
  "Centros Cirúrgicos",
  "Clínicas de Traumatologia",
  "Distribuidoras de Próteses",
  "Revendas de Equipamentos Médicos",
  "Importadoras de OPME",
];


// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
const exportToCSV = (data, filename) => {
  if(!data||data.length===0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row=>
    headers.map(h=>{
      const val = row[h]||"";
      const str = typeof val==="object"?JSON.stringify(val):String(val);
      return '"'+str.replace(/"/g,'""')+'"';
    }).join(",")
  );
  const csv = [headers.join(","),...rows].join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename+".csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportLeadsToCSV = (leads, filename="leads_pipe_tm") => {
  const data = leads.map(l=>({
    Nome: l.name||"",
    Empresa: l.company||"",
    Tipo: l.tipo||"PJ",
    Email: (l.emails&&l.emails[0])||l.email||"",
    Telefone: (l.phones&&l.phones[0])||l.phone||"",
    Cidade: l.city||"",
    Status: l.status||"",
    Score: l.score||0,
    Origem: l.origem||l.channel||"",
    Criado: l.createdAt||"",
  }));
  exportToCSV(data, filename);
};

// ─── SUPABASE AUTH ───────────────────────────────────────────────────────────
// User session stored in memory
let _currentSession = null;
let _currentTenant = null;

const sbAuth = {
  // Login via Supabase Auth
  login: async (email, password) => {
    const res = await fetch(SB_URL+"/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {"Content-Type":"application/json","apikey":SB_KEY},
      body: JSON.stringify({email, password})
    });
    const data = await res.json();
    if(data.error || !data.access_token) throw new Error(data.error_description||data.msg||"Email ou senha incorretos");
    _currentSession = data;
    return data;
  },

  // Logout
  logout: () => { _currentSession = null; _currentTenant = null; },

  // Get current access token
  token: () => _currentSession?.access_token || SB_KEY,

  // Fetch user profile from users table
  getProfile: async (userId) => {
    const res = await fetch(SB_URL+"/rest/v1/users?id=eq."+userId+"&select=*,tenants(*)", {
      headers: {"apikey":SB_KEY,"Authorization":"Bearer "+sbAuth.token()}
    });
    const data = await res.json();
    return data[0] || null;
  },

  // Fetch tenant config
  getTenant: async (tenantId) => {
    const res = await fetch(SB_URL+"/rest/v1/tenants?id=eq."+tenantId+"&select=*", {
      headers: {"apikey":SB_KEY,"Authorization":"Bearer "+sbAuth.token()}
    });
    const data = await res.json();
    _currentTenant = data[0] || null;
    if(_currentTenant) applyTenantConfig(_currentTenant);
    return _currentTenant;
  },
};

// Keep USER_DB as fallback for offline/demo mode
const USER_DB = [
  { id:"owner", name:"Owner",  email:"owner@pipetm.com.br",  password:"owner2024",  role:"owner",  status:"ativo", createdAt:"2026-01-01", lastLogin:null, perms:ALL_MODULES },
  { id:"master", name:"Master", email:"master@pipetm.com.br", password:"master2024", role:"master", status:"ativo", createdAt:"2026-01-01", lastLogin:null, perms:DEFAULT_MASTER_PERMS },
  { id:"admin1", name:"Admin",  email:"admin@pipetm.com.br",  password:"opme2024",   role:"user",   status:"ativo", createdAt:"2026-01-01", lastLogin:null, perms:DEFAULT_USER_PERMS },
];

const DB = {
  find:(id)=>USER_DB.find(u=>u.email.toLowerCase()===id.toLowerCase()||u.name.toLowerCase()===id.toLowerCase()),
  findById:(id)=>USER_DB.find(u=>u.id===id),
  add:(u)=>USER_DB.push(u),
  update:(id,patch)=>{ const i=USER_DB.findIndex(u=>u.id===id); if(i>=0) Object.assign(USER_DB[i],patch); },
  all:()=>[...USER_DB],
  setPerms:(id,perms)=>{ const u=USER_DB.find(u=>u.id===id); if(u) u.perms=perms; },
  setStatus:(id,status)=>{ const u=USER_DB.find(u=>u.id===id); if(u) u.status=status; },
};



// ─── ONBOARDING WIZARD ───────────────────────────────────────────────────────
function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1); // 1:empresa, 2:modulos, 3:usuario, 4:concluido
  const [form, setForm] = useState({
    // Empresa
    companyName: "", slug: "", segment: "", city: "", plan: "basic",
    // Módulos
    modules: ["prospeccao"],
    // Usuário
    userName: "", userEmail: "", userPassword: "", userPassword2: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [tenantId, setTenantId] = useState("");

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const PLANS = [
    {id:"basic",      label:"Basic",      desc:"Prospecção de leads", color:"#6B7280",    modules:["prospeccao"]},
    {id:"pro",        label:"Pro",        desc:"Prospecção + Receptivo", color:"#3B82F6", modules:["prospeccao","receptivo","cadencia"]},
    {id:"enterprise", label:"Enterprise", desc:"Todos os módulos",    color:"#8B5CF6",    modules:["prospeccao","receptivo","pos_venda","cadencia"]},
  ];

  const ALL_MODS = [
    {id:"prospeccao", label:"🎯 Prospecção",  desc:"Captação de novos leads"},
    {id:"receptivo",  label:"📥 Receptivo",   desc:"Leads que chegam até você"},
    {id:"pos_venda",  label:"🤝 Pós-venda",   desc:"Gestão de clientes ativos"},
    {id:"cadencia",   label:"📅 Cadências",   desc:"Sequências de acionamento"},
  ];

  const createTenant = async () => {
    setLoading(true); setError("");
    try {
      // 1. Create tenant
      const tRes = await fetch("https://rbizynwybepmlljgcveq.supabase.co/rest/v1/tenants", {
        method: "POST",
        headers: {
          "apikey": SB_KEY, "Authorization": "Bearer "+SB_KEY,
          "Content-Type": "application/json", "Prefer": "return=representation"
        },
        body: JSON.stringify({
          name: form.companyName,
          slug: form.slug||form.companyName.toLowerCase().replace(/\s+/g,"-"),
          plan: form.plan,
          status: "active",
          modules: JSON.stringify(form.modules),
          config: JSON.stringify({segment: form.segment, city: form.city})
        })
      });
      const tData = await tRes.json();
      if(!tRes.ok) throw new Error(tData.message||"Erro ao criar empresa");
      const tid = tData[0]?.id;
      if(!tid) throw new Error("Tenant ID não retornado");
      setTenantId(tid);

      // 2. Create auth user
      const aRes = await fetch("https://rbizynwybepmlljgcveq.supabase.co/auth/v1/admin/users", {
        method: "POST",
        headers: {
          "apikey": SB_KEY, "Authorization": "Bearer "+SB_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({email: form.userEmail, password: form.userPassword, email_confirm: true})
      });
      const aData = await aRes.json();
      if(!aRes.ok) throw new Error(aData.message||"Erro ao criar usuário");
      const uid = aData.id;

      // 3. Create user profile
      await fetch("https://rbizynwybepmlljgcveq.supabase.co/rest/v1/users", {
        method: "POST",
        headers: {
          "apikey": SB_KEY, "Authorization": "Bearer "+SB_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({id: uid, tenant_id: tid, name: form.userName, role: "owner", status: "active"})
      });

      // 4. Activate modules
      for(const mod of form.modules){
        await fetch("https://rbizynwybepmlljgcveq.supabase.co/rest/v1/tenant_modules", {
          method: "POST",
          headers: {"apikey": SB_KEY, "Authorization": "Bearer "+SB_KEY, "Content-Type": "application/json"},
          body: JSON.stringify({tenant_id: tid, module_id: mod, active: true})
        });
      }

      setStep(4);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    if(step===1){
      if(!form.companyName) return "Nome da empresa é obrigatório.";
      if(!form.city) return "Cidade é obrigatória.";
    }
    if(step===3){
      if(!form.userName) return "Nome do responsável é obrigatório.";
      if(!form.userEmail||!form.userEmail.includes("@")) return "E-mail inválido.";
      if(!form.userPassword||form.userPassword.length<6) return "Senha mínima de 6 caracteres.";
      if(form.userPassword!==form.userPassword2) return "Senhas não coincidem.";
    }
    return "";
  };

  const next = () => {
    const err = validateStep();
    if(err){ setError(err); return; }
    setError("");
    if(step===3) createTenant();
    else setStep(s=>s+1);
  };

  const StepDot = ({n}) => (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:step>=n?C.accent:C.border,color:step>=n?"#fff":C.faint,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,transition:"all 0.3s"}}>
        {step>n?"✓":n}
      </div>
      {n<4&&<div style={{width:32,height:2,background:step>n?C.accent:C.border,transition:"background 0.3s"}}/>}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:480}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,"+C.accent+","+C.accent2+")",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:22,fontWeight:900,color:"#fff"}}>P.TM</div>
          <div style={{fontSize:22,fontWeight:800,color:C.text}}>Bem-vindo ao Pipe.TM</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Configure sua conta em poucos minutos</div>
        </div>

        {/* Steps indicator */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:28}}>
          {[1,2,3,4].map(n=><StepDot key={n} n={n}/>)}
        </div>

        {/* Card */}
        <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:28,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>

          {/* Step 1: Empresa */}
          {step===1&&(
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>🏢 Sua Empresa</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Informações básicas da empresa</div>
              <div style={{marginBottom:14}}>
                <div style={lbl}>Nome da Empresa *</div>
                <input value={form.companyName} onChange={e=>f("companyName",e.target.value)}
                  placeholder="Ex: TM Soluções Comerciais" style={inp}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={lbl}>Segmento de atuação</div>
                <input value={form.segment} onChange={e=>f("segment",e.target.value)}
                  placeholder="Ex: Distribuição de OPME, Joalherias..." style={inp}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={lbl}>Cidade principal *</div>
                <input value={form.city} onChange={e=>f("city",e.target.value)}
                  placeholder="Ex: São Paulo - SP" style={inp}/>
              </div>
              <div style={{marginBottom:4}}>
                <div style={lbl}>Plano</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {PLANS.map(p=>(
                    <div key={p.id} onClick={()=>{f("plan",p.id);f("modules",p.modules);}}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,cursor:"pointer",border:"2px solid "+(form.plan===p.id?p.color:C.border),background:form.plan===p.id?(p.color+"10"):"transparent",transition:"all 0.15s"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:form.plan===p.id?p.color:C.border,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:form.plan===p.id?p.color:C.text}}>{p.label}</div>
                        <div style={{fontSize:11,color:C.faint}}>{p.desc}</div>
                      </div>
                      {form.plan===p.id&&<span style={{fontSize:12,color:p.color,fontWeight:700}}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Módulos */}
          {step===2&&(
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>📦 Módulos</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Selecione os módulos que deseja ativar</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {ALL_MODS.map(mod=>{
                  const active = form.modules.includes(mod.id);
                  return (
                    <div key={mod.id} onClick={()=>f("modules",active?form.modules.filter(m=>m!==mod.id):[...form.modules,mod.id])}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:10,cursor:"pointer",border:"2px solid "+(active?C.accent:C.border),background:active?(C.accent+"08"):"transparent",transition:"all 0.15s"}}>
                      <div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(active?C.accent:C.border),background:active?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {active&&<span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:active?C.accent:C.text}}>{mod.label}</div>
                        <div style={{fontSize:11,color:C.faint}}>{mod.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Usuário Owner */}
          {step===3&&(
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>👤 Conta do Responsável</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Crie a conta de acesso do Owner</div>
              <div style={{marginBottom:14}}>
                <div style={lbl}>Nome completo *</div>
                <input value={form.userName} onChange={e=>f("userName",e.target.value)}
                  placeholder="Seu nome" style={inp}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={lbl}>E-mail *</div>
                <input type="email" value={form.userEmail} onChange={e=>f("userEmail",e.target.value)}
                  placeholder="email@empresa.com" style={inp}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={lbl}>Senha *</div>
                <input type="password" value={form.userPassword} onChange={e=>f("userPassword",e.target.value)}
                  placeholder="Mínimo 6 caracteres" style={inp}/>
              </div>
              <div style={{marginBottom:4}}>
                <div style={lbl}>Confirmar senha *</div>
                <input type="password" value={form.userPassword2} onChange={e=>f("userPassword2",e.target.value)}
                  placeholder="Repita a senha" style={inp}/>
              </div>
            </div>
          )}

          {/* Step 4: Concluído */}
          {step===4&&(
            <div style={{textAlign:"center",padding:"10px 0"}}>
              <div style={{fontSize:48,marginBottom:16}}>🎉</div>
              <div style={{fontSize:20,fontWeight:800,color:"#4ADE80",marginBottom:8}}>Tudo pronto!</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:6}}>{form.companyName} foi configurada com sucesso.</div>
              <div style={{fontSize:11,color:C.faint,marginBottom:24,padding:"10px 14px",background:C.sidebar,borderRadius:8,wordBreak:"break-all"}}>
                Tenant ID: {tenantId}
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:24}}>
                Módulos ativos: {form.modules.map(m=>({prospeccao:"Prospecção",receptivo:"Receptivo",pos_venda:"Pós-venda",cadencia:"Cadências"})[m]).join(", ")}
              </div>
              <button onClick={()=>onComplete(form.userEmail,form.userPassword)}
                style={{...btnP,width:"100%",padding:"14px",fontSize:14,fontWeight:700}}>
                🚀 Acessar o Pipe.TM
              </button>
            </div>
          )}

          {/* Error */}
          {error&&<div style={{marginTop:14,padding:"8px 12px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,fontSize:12,color:"#F87171"}}>{error}</div>}

          {/* Navigation */}
          {step<4&&(
            <div style={{display:"flex",gap:10,marginTop:20}}>
              {step>1&&(
                <button onClick={()=>{setStep(s=>s-1);setError("");}} style={{...btnG,flex:1,padding:"11px"}}>← Voltar</button>
              )}
              <button onClick={next} disabled={loading}
                style={{...btnP,flex:2,padding:"11px",fontSize:13,fontWeight:700,opacity:loading?0.7:1}}>
                {loading?"⟳ Criando...":(step===3?"🚀 Criar Conta":"Próximo →")}
              </button>
            </div>
          )}
        </div>

        {/* Back to login */}
        {step<4&&(
          <div style={{textAlign:"center",marginTop:16,fontSize:12,color:C.faint}}>
            Já tem conta? <span onClick={()=>onComplete(null,null)} style={{color:C.accent,cursor:"pointer",fontWeight:700}}>Fazer login</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, onShowOnboarding }) {
  const [view, setView]   = useState("login");
  const [form, setForm]   = useState({ name:"", email:"", password:"", confirm:"" });
  const [err,  setErr]    = useState("");
  const [ok,   setOk]     = useState("");
  const [busy, setBusy]   = useState(false);
  const [show, setShow]   = useState(false);
  const f = (k,v) => { setForm(p=>({...p,[k]:v})); setErr(""); setOk(""); };

  const go = (fn) => { setBusy(true); setTimeout(()=>{ fn(); setBusy(false); }, 800); };

  const login = async () => {
    if(!form.email||!form.password){setErr("Preencha todos os campos.");return;}
    setBusy(true); setErr("");
    try {
      // Try Supabase Auth first
      const session = await sbAuth.login(form.email, form.password);
      const userId = session.user?.id;
      if(userId){
        // Get user profile and tenant from DB
        const profile = await sbAuth.getProfile(userId);
        if(profile){
          const tenant = await sbAuth.getTenant(profile.tenant_id);
          const userObj = {
            id: userId,
            name: profile.name,
            email: form.email,
            role: profile.role,
            status: profile.status,
            perms: profile.perms || ALL_MODULES,
            tenant_id: profile.tenant_id,
            tenantName: tenant?.name || "",
          };
          onLogin(userObj);
          return;
        }
      }
    } catch(e) {
      // Supabase failed — try local DB fallback
      const u = DB.find(form.email);
      if(u && u.password === form.password){
        if(u.status==="cancelado"){setErr("Acesso cancelado. Contate o administrador.");setBusy(false);return;}
        DB.update(u.id,{lastLogin:new Date().toISOString()});
        onLogin(u);
        return;
      }
      setErr(e.message||"Email ou senha incorretos.");
    } finally {
      setBusy(false);
    }
  };
  const register = () => go(()=>{
    if(!form.name||!form.email||!form.password||!form.confirm){setErr("Preencha todos os campos.");return;}
    if(!/\S+@\S+\.\S+/.test(form.email)){setErr("E-mail inválido.");return;}
    if(form.password.length<6){setErr("Senha mínima: 6 caracteres.");return;}
    if(form.password!==form.confirm){setErr("Senhas não coincidem.");return;}
    if(DB.find(form.email)){setErr("E-mail já cadastrado.");return;}
    const nu={id:"u_"+Date.now(),name:form.name,email:form.email,password:form.password,role:"user",status:"ativo",createdAt:new Date().toLocaleDateString("pt-BR"),lastLogin:null};
    DB.add(nu);
    setOk("Conta criada! Entrando...");
    setTimeout(()=>onLogin(nu),1000);
  });
  const recover = () => go(()=>{
    if(!form.email){setErr("Informe o e-mail.");return;}
    const u=DB.find(form.email);
    if(!u){setErr("Nenhuma conta com este e-mail.");return;}
    setOk(`Instruções enviadas para ${form.email}. (Demo: senha é "${u.password}")`);
  });

  const is = (k,v) => ({ ...inp, borderColor: form[k]&&form[k]!==v?"#F87171":C.border });
  const sfx = (k) => (
    <div style={{position:"relative"}}>
      <input style={{...inp,paddingRight:42}} type={show?"text":"password"} value={form[k]} onChange={e=>f(k,e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&login()} />
      <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex"}}>
        <Icon d={show?IC.eyeOff:IC.eye} size={15}/>
      </button>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,180,216,0.07),transparent 70%)",top:-200,right:-100,pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,119,182,0.09),transparent 70%)",bottom:-150,left:-100,pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:420,padding:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:17,color:"#fff",boxShadow:`0 4px 20px ${C.accent}44`}}>P.TM</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:22,fontWeight:900,color:C.text,letterSpacing:2}}>Pipe.TM</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:3,textTransform:"uppercase"}}>Prospecção Inteligente</div>
            </div>
          </div>
        </div>

        <div style={{background:C.panel,border:("1px solid "+C.border),borderRadius:18,padding:32,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
          {view!=="recover" && (
            <div style={{textAlign:"center",color:C.muted,fontSize:12,letterSpacing:"0.08em",marginBottom:20,padding:"6px 0",borderBottom:"1px solid "+C.border}}>🔒 ACESSO RESTRITO</div>
          )}
          {view==="recover" && <div style={{marginBottom:22}}><div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:3}}>🔑 Recuperar Senha</div><div style={{fontSize:12,color:C.muted}}>Informe o e-mail da sua conta.</div></div>}

          {view==="login" && <>
            <div style={{marginBottom:14}}><label style={lbl}>E-mail ou nome de usuário</label><input style={inp} value={form.email} onChange={e=>f("email",e.target.value)} placeholder="seu@email.com.br" onKeyDown={e=>e.key==="Enter"&&login()} autoFocus/></div>
            <div style={{marginBottom:8}}><label style={lbl}>Senha</label>{sfx("password")}</div>
            <div style={{textAlign:"right",marginBottom:20}}><button onClick={()=>{setView("recover");setErr("");setOk("");}} style={{background:"none",border:"none",color:C.accent,fontSize:12,cursor:"pointer",fontWeight:600}}>Esqueci minha senha</button></div>
          </>}
          {view==="recover" && <>
            <div style={{marginBottom:20}}><label style={lbl}>E-mail Cadastrado</label><input style={inp} value={form.email} onChange={e=>f("email",e.target.value)} placeholder="seu@email.com.br" autoFocus onKeyDown={e=>e.key==="Enter"&&recover()}/></div>
          </>}

          {err&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #F8717133",borderRadius:8,padding:"9px 12px",color:"#F87171",fontSize:12,marginBottom:14}}>⚠️ {err}</div>}
          {ok &&<div style={{background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE8033",borderRadius:8,padding:"9px 12px",color:"#4ADE80",fontSize:12,marginBottom:14}}>✅ {ok}</div>}

          <button onClick={view==="login"?login:recover} disabled={busy} style={{width:"100%",padding:"13px",background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),color:"#fff",border:"none",borderRadius:10,fontWeight:800,fontSize:14,cursor:busy?"wait":"pointer",boxShadow:`0 4px 16px ${C.accent}33`}}>
            {busy?"Aguarde...":{login:"Entrar →",recover:"Enviar Instruções"}[view]}
          </button>
          {view==="recover"&&<button onClick={()=>setView("login")} style={{width:"100%",marginTop:10,padding:"10px",background:"transparent",color:C.muted,border:("1px solid "+C.border),borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer"}}>← Voltar para Login</button>}

        </div>
        {view==="login"&&onShowOnboarding&&<div style={{textAlign:"center",marginTop:14,fontSize:12,color:C.faint}}>Empresa nova? <span onClick={onShowOnboarding} style={{color:C.accent,cursor:"pointer",fontWeight:700}}>Criar conta gratuita →</span></div>}
        <div style={{textAlign:"center",marginTop:8,fontSize:11,color:C.faint}}>© 2026 Pipe.TM · Plataforma de Prospecção Inteligente</div>
      </div>
    </div>
  );
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_LEADS = [
  {id:1,name:"Dra. Ana Beatriz Souza",company:"Medihosp Distribuidora",role:"Diretora Comercial",city:"São Paulo, SP",channel:"LinkedIn",email:"ana.souza@medihosp.com.br",phone:"(11) 98201-3344",score:92,status:"Novo cliente",priority:"Alta",notes:"Especialista em OPME.",cadence:[],createdAt:"2026-07-18",bestTime:{slots:["07:30-09:00","20:00-21:30"],days:["Seg","Ter","Qui"],bestChannel:"LinkedIn",confidence:"Alta",reason:"Diretoras C-level do setor de saúde costumam verificar LinkedIn antes das reuniões matinais e após o jantar"}},
  {id:2,name:"Carlos Eduardo Melo",company:"Cirúrgica Ultramed",role:"Gerente de Compras",city:"São Paulo, SP",channel:"Google",email:"cemelo@ultramed.com.br",phone:"(11) 97744-2211",score:78,status:"Conversando",priority:"Alta",notes:"Responsável por licitações OPME.",cadence:[{day:1,type:"WhatsApp",sent:true,resultado:"Respondeu - interesse",obs:"",dataHora:"18/07/2026 10:30"}],createdAt:"2026-07-15",bestTime:{slots:["10:00-11:30","14:00-15:30"],days:["Ter","Qua","Sex"],bestChannel:"WhatsApp",confidence:"Média",reason:"Gerentes de compras geralmente respondem mensagens durante pausas entre reuniões no período comercial"}},
  {id:3,name:"Fernanda Lima Costa",company:"Grupo Suprimed",role:"CEO",city:"São José dos Campos, SP",channel:"LinkedIn",email:"flima@suprimed.com.br",phone:"(11) 96633-1100",score:88,status:"Montar orçamento",priority:"Alta",notes:"Dirige grupo com 7 unidades.",cadence:[{day:1,type:"WhatsApp",sent:true,resultado:"Agendou reunião",obs:"",dataHora:"12/07/2026 09:15"}],createdAt:"2026-07-12",bestTime:{slots:["06:30-08:00","21:00-22:00"],days:["Seg","Qua"],bestChannel:"E-mail",confidence:"Alta",reason:"CEOs de grupos empresariais tendem a verificar e-mail estratégico muito cedo ou tarde da noite"}},
  {id:4,name:"Roberto Alves Neto",company:"MEM Cirúrgica",role:"Diretor de Importação",city:"São Paulo, SP",channel:"Instagram",email:"roberto@memcirurgica.com.br",phone:"(11) 95500-8877",score:65,status:"Novo cliente",priority:"Média",notes:"+20 anos no setor.",cadence:[],createdAt:"2026-07-19",bestTime:{slots:["12:00-13:30","18:00-19:30"],days:["Ter","Qui","Sex"],bestChannel:"WhatsApp",confidence:"Média",reason:"Diretores de importação costumam ter horários mais flexíveis no almoço e fim de expediente para contatos comerciais"}},
  {id:5,name:"Juliana Ferreira",company:"Sinete Cirúrgica",role:"Gerente de Operações",city:"São Paulo, SP",channel:"LinkedIn",email:"jferreira@sinete.com.br",phone:"(11) 92692-4000",score:71,status:"Contratou",priority:"Alta",notes:"Converteu em parceria mensal.",cadence:[{day:1,type:"WhatsApp",sent:true,resultado:"Pediu proposta",obs:"",dataHora:"05/07/2026 14:00"}],createdAt:"2026-07-05",bestTime:{slots:["08:00-09:30","17:30-18:30"],days:["Seg","Qua","Sex"],bestChannel:"WhatsApp",confidence:"Alta",reason:"Gerentes operacionais do setor cirúrgico são mais acessíveis no início do turno e ao final do expediente"}},
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// ─── CONTACT PICKER - seletor de telefone/email ──────────────────────────────
function ContactPicker({ lead, type, onSelect, children }) {
  const [open, setOpen] = useState(false);
  const items = type === "phone"
    ? (lead&&lead.phones&&lead.phones.length>0 ? lead.phones : lead&&lead.phone ? [lead.phone] : [])
    : (lead&&lead.emails&&lead.emails.length>0 ? lead.emails : lead&&lead.email ? [lead.email] : []);

  const handleClick = (e) => {
    e.stopPropagation();
    if(items.length===0) return;
    if(items.length===1){ onSelect(items[0]); return; }
    setOpen(o=>!o);
  };

  if(items.length === 0) return (
    <div style={{fontSize:11,color:"#F87171",padding:"5px 8px",background:"rgba(248,113,113,0.08)",borderRadius:6,border:"1px solid rgba(248,113,113,0.2)"}}>
      {type==="phone"?"⚠️ Sem telefone":"⚠️ Sem email"}
    </div>
  );

  return (
    <div style={{position:"relative",display:"inline-block"}} onClick={handleClick}>
      <div>{children}</div>
      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>
          <div style={{position:"absolute",top:"100%",left:0,zIndex:300,marginTop:4,background:C.panel,border:"1px solid "+C.border,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",minWidth:200,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",fontSize:10,color:C.faint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid "+C.border}}>
              {type==="phone"?"Selecione o telefone":"Selecione o email"}
            </div>
            {items.map((item,i)=>(
              <div key={i} onClick={()=>{onSelect(item);setOpen(false);}}
                style={{padding:"10px 14px",cursor:"pointer",fontSize:12,color:C.text,borderBottom:i<items.length-1?"1px solid "+C.border:"none",display:"flex",alignItems:"center",gap:8}}
                onMouseEnter={e=>e.currentTarget.style.background=C.accent+"18"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:14}}>{type==="phone"?"📞":"✉️"}</span>
                <span>{item}</span>
                {i===0&&<span style={{fontSize:9,color:C.accent,background:C.accent+"18",padding:"1px 6px",borderRadius:20,marginLeft:"auto"}}>principal</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// ─── BUSINESS HOURS PARSER ───────────────────────────────────────────────────
const DAY_MAP = {
  "Seg":1,"Ter":2,"Qua":3,"Qui":4,"Sex":5,"Sab":6,"Dom":0,
  "seg":1,"ter":2,"qua":3,"qui":4,"sex":5,"sab":6,"dom":0,
};

const parseBusinessHours = (bh) => {
  if(!bh) return null;
  // Format: "Seg-Sex 08:00-18:00" or "Seg-Sab 08:00-17:00,Sab 09:00-13:00"
  const segments = bh.split(",").map(s=>s.trim());
  const parsed = segments.map(seg=>{
    const [dayPart, timePart] = seg.split(" ");
    if(!dayPart||!timePart) return null;
    const [open, close] = timePart.split("-");
    let days = [];
    if(dayPart.includes("-")){
      const [from, to] = dayPart.split("-");
      const start = DAY_MAP[from], end = DAY_MAP[to];
      if(start!==undefined && end!==undefined){
        // Handle week wrap (e.g. Seg=1 to Sex=5)
        let d = start;
        while(true){
          days.push(d);
          if(d===end) break;
          d = d===6?0:d+1;
          if(days.length>7) break;
        }
      }
    } else {
      if(DAY_MAP[dayPart]!==undefined) days = [DAY_MAP[dayPart]];
    }
    return { days, open, close };
  }).filter(Boolean);
  return parsed.length > 0 ? parsed : null;
};

const isOpenNow = (bh) => {
  if(!bh) return null; // unknown
  const parsed = parseBusinessHours(bh);
  if(!parsed) return null;
  const now = new Date();
  const dow = now.getDay(); // 0=Sun,1=Mon...
  const timeStr = now.getHours().toString().padStart(2,"0")+":"+now.getMinutes().toString().padStart(2,"0");
  for(const seg of parsed){
    if(seg.days.includes(dow) && timeStr>=seg.open && timeStr<seg.close) return true;
  }
  return false;
};

const formatBusinessHours = (bh) => {
  if(!bh) return null;
  return bh; // Display as-is from the sheet
};

const getNextOpenTime = (bh) => {
  if(!bh) return null;
  const parsed = parseBusinessHours(bh);
  if(!parsed) return null;
  const now = new Date();
  const dow = now.getDay();
  const timeStr = now.getHours().toString().padStart(2,"0")+":"+now.getMinutes().toString().padStart(2,"0");
  const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
  // Check today first, then next 7 days
  for(let offset=0; offset<7; offset++){
    const checkDay = (dow+offset)%7;
    for(const seg of parsed){
      if(seg.days.includes(checkDay)){
        if(offset===0 && timeStr<seg.open) return "Abre hoje às "+seg.open;
        if(offset===0 && timeStr>=seg.open && timeStr<seg.close) return "Aberta agora até "+seg.close;
        if(offset===1) return "Abre amanhã às "+seg.open;
        if(offset>1) return "Abre "+dayNames[checkDay]+" às "+seg.open;
      }
    }
  }
  return null;
};

function CopyBtn({text}) {
  const [ok,setOk]=useState(false);
  return <button style={{...btnG,padding:"5px 10px"}} onClick={()=>{navigator.clipboard.writeText(text);setOk(true);setTimeout(()=>setOk(false),1800);}}><Icon d={ok?IC.check:IC.copy} size={13} color={ok?"#4ADE80":C.dim}/><span style={{fontSize:10}}>{ok?"Copiado":"Copiar"}</span></button>;
}

function KpiCard({value,label,delta,pos=true,accent=C.accent}) {
  return <div style={card()}><div style={{fontSize:28,fontWeight:800,color:accent,lineHeight:1}}>{value}</div><div style={{fontSize:11,color:C.muted,letterSpacing:1.2,textTransform:"uppercase",marginTop:4}}>{label}</div>{delta&&<div style={{fontSize:11,color:pos?"#4ADE80":"#F87171",fontWeight:600,marginTop:6}}>{delta}</div>}</div>;
}

// ─── STATUS DROPDOWN ─────────────────────────────────────────────────────────
function StatusDropdown({lead, onUpdate}) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const statusList = getStatusList();
  const color = getStatusColor(lead.status)||C.dim;

  const handleChange = (newStatus) => {
    // Sync funil stage when status changes
    const stage = FUNIL_STAGES.find(s=>s.name===newStatus);
    if(stage) setLeadStage(lead.id, stage.id);
    onUpdate({...lead, status:newStatus, funilStage:stage?.id||lead.funilStage});
    setOpen(false);
  };

  return (
    <div ref={ref} style={{position:"relative"}} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,border:("1px solid "+color+"44"),background:(color+"14"),cursor:"pointer",fontSize:11,fontWeight:700,color,whiteSpace:"nowrap"}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0}}/>
        {lead.status}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:50,background:C.panel,border:("1px solid "+C.border),borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",minWidth:180,overflow:"hidden"}}>
          {statusList.map(s=>{
            const sc=getStatusColor(s);
            const active=s===lead.status;
            return (
              <div key={s} onClick={()=>handleChange(s)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",cursor:"pointer",background:active?(sc+"14"):"transparent",borderLeft:active?("3px solid "+sc):"3px solid transparent",transition:"background 0.1s"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:sc,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:active?700:400,color:active?sc:C.dim}}>{s}</span>
                {active&&<span style={{marginLeft:"auto",fontSize:10,color:sc}}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function LeadDetailModal({lead, onClose, onUpdate, onAcionar, onSetPage=()=>{}}) {
  const sc = lead.score>=70?"#4ADE80":lead.score>=40?"#FBBF24":"#F87171";
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,14,28,0.9)",backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div style={{background:C.panel,border:("1px solid "+C.border),borderRadius:18,width:620,maxWidth:"96vw",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 28px 80px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"22px 24px 18px",borderBottom:("1px solid "+C.border),display:"flex",alignItems:"flex-start",gap:16}}>
          <div style={{width:48,height:48,borderRadius:12,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:"#fff",flexShrink:0}}>{lead.name[0]}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:3}}>{lead.name}</div>
            <div style={{fontSize:12,color:C.muted}}>{lead.role} · {lead.company} · 📍 {lead.city}</div>
            <div style={{marginTop:6}}><LeadFunnelTag lead={lead}/></div>
            <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={pill(lead.status)}>{lead.status}</span>
              <span style={{fontSize:10,fontWeight:700,color:C.accent,background:(C.accent+"14"),border:("1px solid "+C.accent+"33"),padding:"3px 9px",borderRadius:20}}>{lead.channel}</span>
              <span style={{fontSize:11,fontWeight:800,color:sc,background:(sc+"14"),border:("1px solid "+sc+"33"),padding:"3px 9px",borderRadius:20}}>Score {lead.score}</span>
            </div>
          </div>
          <button style={btnG} onClick={onClose}><Icon d={IC.x} size={14}/></button>
        </div>
        {/* Score bar */}
        <div style={{padding:"14px 24px",borderBottom:("1px solid "+C.border)}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.muted,fontWeight:600}}>Score de Qualificação</span><span style={{fontSize:12,fontWeight:800,color:sc}}>{lead.score}/100</span></div>
          <div style={{height:8,background:C.sidebar,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:(lead.score+"%"),background:("linear-gradient(90deg,"+sc+","+sc+"aa)"),borderRadius:4,transition:"width 0.6s ease"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:10,color:C.faint}}>Baixo</span><span style={{fontSize:10,color:C.faint}}>Médio</span><span style={{fontSize:10,color:C.faint}}>Alto</span></div>
        </div>
        {/* Contatos */}
        <div style={{padding:"16px 24px",borderBottom:("1px solid "+C.border),display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["📧","E-mail",lead.email],["📱","WhatsApp",lead.phone]].map(([ic,lb,val])=>(
            <div key={lb} style={{background:C.sidebar,borderRadius:10,padding:"10px 14px"}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{ic} {lb}</div>
              <div style={{fontSize:13,color:C.text,fontWeight:600}}>{val}</div>
            </div>
          ))}
        </div>
        {/* Melhor horário */}
        {(lead.business_hours||lead.bestTime)&&(
          <div style={{padding:"16px 24px",borderBottom:("1px solid "+C.border)}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>🕐 Horário de Funcionamento</div>
            {lead.business_hours?(
              <div style={{background:C.sidebar,borderRadius:12,padding:14}}>
                {(()=>{
                  const open=isOpenNow(lead.business_hours);
                  const next=getNextOpenTime(lead.business_hours);
                  return (
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:open===true?"#4ADE80":open===false?"#EF4444":"#6B7280"}}/>
                        <span style={{fontSize:14,fontWeight:800,color:open===true?"#4ADE80":open===false?"#F87171":"#6B7280"}}>
                          {open===true?"Aberta agora":open===false?"Fechada no momento":"Horário desconhecido"}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:6}}>📅 {lead.business_hours}</div>
                      {next&&<div style={{fontSize:11,color:C.accent,fontWeight:600}}>⏰ {next}</div>}
                    </div>
                  );
                })()}
              </div>
            ):lead.bestTime&&(
              <div style={{background:C.sidebar,borderRadius:12,padding:14}}>
                <div style={{fontSize:12,color:C.muted}}>⏰ {lead.bestTime.slots?.join(", ")} · {lead.bestTime.days?.join(", ")}</div>
                {lead.bestTime.reason&&<div style={{fontSize:11,color:C.faint,marginTop:4}}>{lead.bestTime.reason}</div>}
              </div>
            )}
          </div>
          )}
        </div>

            {/* Cadência — progresso e etapas pendentes */}
      {lead.cadence&&lead.cadence.length>0&&(()=>{
        const progress = getCadenceProgress(lead);
        const pending  = getCadencePending(lead);
        const colorMap = {"WhatsApp":"#25D366","Email":"#3B82F6","Ligacao":"#F59E0B","LinkedIn":"#0A66C2"};
        const iconMap  = {"WhatsApp":"📱","Email":"✉️","Ligacao":"📞","LinkedIn":"💼"};
        return (
          <div style={{padding:"16px 24px",borderBottom:("1px solid "+C.border)}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>
              📅 Cadência de Acionamento
            </div>

            {/* Progress bar */}
            {progress&&(
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
                  <span>{progress.done} de {progress.total} etapas concluídas</span>
                  <span style={{fontWeight:700,color:C.accent}}>{progress.pct}%</span>
                </div>
                <div style={{height:6,background:C.border,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:(progress.pct+"%"),background:progress.pct===100?"#4ADE80":C.accent,borderRadius:4,transition:"width 0.5s"}}/>
                </div>
              </div>
            )}

            {/* Pending steps */}
            {pending.length>0&&(
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#F59E0B",fontWeight:700,marginBottom:8}}>⚠️ {pending.length} etapa{pending.length>1?"s":""} pendente{pending.length>1?"s":""}</div>
                {pending.map((step,i)=>{
                  const color = colorMap[step.canal]||C.accent;
                  const icon  = iconMap[step.canal]||"📌";
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:("1px solid "+(step.overdue?"#F87171":color)+"44"),background:(step.overdue?"rgba(248,113,113,0.05)":"transparent"),marginBottom:6}}>
                      <span style={{fontSize:18}}>{icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:step.overdue?"#F87171":C.text}}>{step.tema||step.canal}</div>
                        <div style={{fontSize:10,color:C.faint}}>{step.canal} · {step.overdue?"Atrasado":"Hoje"} · {step.scheduledFor}</div>
                        {step.descricao&&<div style={{fontSize:10,color:C.dim,marginTop:2,fontStyle:"italic"}}>{step.descricao}</div>}
                      </div>
                      <button onClick={()=>{
                        const idx = lead.cadence.findIndex(s=>s.scheduledFor===step.scheduledFor&&s.canal===step.canal&&s.tema===step.tema);
                        markCadenceStepDone(lead,idx,onUpdate);
                      }} style={{background:"transparent",border:("1px solid "+color),borderRadius:6,padding:"4px 10px",cursor:"pointer",color,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>
                        ✓ Feito
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* All steps timeline */}
            <details>
              <summary style={{fontSize:11,color:C.faint,cursor:"pointer",marginBottom:8}}>Ver todas as etapas ({lead.cadence.length})</summary>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
                {lead.cadence.map((step,i)=>{
                  const done = step.status==="concluido";
                  const color = done?"#4ADE80":(colorMap[step.canal]||C.accent);
                  const icon  = iconMap[step.canal]||"📌";
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:6,opacity:done?0.6:1}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:(done?"#4ADE80":color)+"22",border:("1px solid "+(done?"#4ADE80":color)),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0}}>
                        {done?"✓":icon}
                      </div>
                      <div style={{flex:1}}>
                        <span style={{fontSize:11,color:done?C.faint:C.text,fontWeight:done?400:600,textDecoration:done?"line-through":"none"}}>{step.tema||step.canal}</span>
                        <span style={{fontSize:10,color:C.faint,marginLeft:6}}>Dia {step.day||0} · {step.scheduledFor}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        );
      })()}

{/* Footer */}
      <div style={{padding:"10px 16px",borderTop:("1px solid "+C.border),display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={()=>onSetPage("funil")} style={{...btnG,padding:"5px 12px",fontSize:11}}>Ver Funil →</button>
        <button onClick={()=>onSetPage("crm")} style={{...btnP,padding:"5px 12px",fontSize:11}}>Ver CRM →</button>
      </div>
    </div>
  );
}



// ─── LEAD ROW - card de lead na Central de Decisão ───────────────────────────
function LeadRow({lead, extra, onSetPage}) {
  const sc = (lead.score||0)>=80?"#4ADE80":(lead.score||0)>=60?"#F59E0B":"#F87171";
  const stageColor = getStatusColor(lead.status)||C.accent;
  const pending = getPendingActions(lead);
  const overdue = pending.filter(a=>a.daysOverdue>0);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid "+C.border,cursor:"pointer",transition:"background 0.1s"}}
      onMouseEnter={e=>{e.currentTarget.style.background=C.accent+"08";}}
      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
      onClick={()=>onSetPage("crm")}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:700,color:C.text}}>{lead.name}</span>
          <span style={{fontSize:9,color:stageColor,background:stageColor+"18",border:"1px solid "+stageColor+"33",padding:"1px 7px",borderRadius:20,fontWeight:700,whiteSpace:"nowrap"}}>{lead.status}</span>
          {overdue.length>0&&<span style={{fontSize:9,color:"#F87171",background:"rgba(248,113,113,0.1)",padding:"1px 6px",borderRadius:20}}>⚠️ {overdue.length} atrasado(s)</span>}
        </div>
        <div style={{fontSize:11,color:C.muted}}>{lead.role||lead.company}</div>
        {extra&&<div style={{fontSize:10,color:C.faint,marginTop:3}}>{extra}</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0,marginLeft:12}}>
        <span style={{fontSize:14,fontWeight:900,color:sc}}>{lead.score||0}</span>
        <FunnelBell lead={lead} onAction={()=>{}}/>
      </div>
    </div>
  );
}

// ─── CENTRAL DE DECISÃO ───────────────────────────────────────────────────────
function CentralDecisao({ leads, onSetPage, onAcionar }) {
  const [tab, setTab] = useState("acao");
  const now = Date.now();
  const dayMs = 1000*60*60*24;
  const diasSemContato = (lead) => {
    const ls = getLeadStage(lead.id);
    if(!ls) return 0;
    const last = lead.cadence&&lead.cadence.length>0
      ? Math.max(...lead.cadence.map(c=>new Date(c.date||c.createdAt||0).getTime()))
      : new Date(ls.enteredAt).getTime();
    return Math.floor((now-last)/dayMs);
  };
  const acaoHoje = leads.filter(l=>{
    const overdueActions = getPendingActions(l).filter(a=>a.daysOverdue>0).length>0;
    const pendingCadence = getCadencePending(l).length>0;
    return overdueActions||pendingCadence;
  }).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,10);
  const STAGE_ORDER = ["Novo cliente","Conversando","Relacionamento","Reunião agendada","Montar orçamento","Não compareceu","Proposta enviada","Contratou"];
  const stageIdx = (l) => STAGE_ORDER.indexOf(l.status);
  const quentes = leads.filter(l=>(l.score||0)>=70&&stageIdx(l)>=1).sort((a,b)=>(stageIdx(b)-stageIdx(a))||((b.score||0)-(a.score||0))).slice(0,10);
  const emRisco = leads.filter(l=>diasSemContato(l)>=5&&stageIdx(l)<=2&&l.status!=="Contratou").sort((a,b)=>diasSemContato(b)-diasSemContato(a)).slice(0,10);
  const pipelineStages = ["Conversando","Relacionamento","Reunião agendada","Proposta enviada"];
  const pipeline = pipelineStages.map(stage=>{
    const sl=leads.filter(l=>l.status===stage);
    const rate=stage==="Proposta enviada"?0.4:stage==="Reunião agendada"?0.25:stage==="Relacionamento"?0.15:0.08;
    return {stage,count:sl.length,rate,avg:sl.length>0?Math.round(sl.reduce((s,l)=>s+(l.score||0),0)/sl.length):0};
  });
  const tabs=[
    {id:"acao",label:"🔥 Ação Hoje",badge:acaoHoje.length,bc:"#EF4444"},
    {id:"quentes",label:"📈 Quentes",badge:quentes.length,bc:C.accent},
    {id:"risco",label:"⏰ Em Risco",badge:emRisco.length,bc:"#F59E0B"},
    {id:"pipeline",label:"💰 Pipeline",badge:pipelineStages.length,bc:"#8B5CF6"},
  ];
  return (
    <div style={card({padding:0,overflow:"hidden"})}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:800,color:C.text}}>⚡ Central de Decisão</span>
        <span style={{fontSize:11,color:C.muted}}>{leads.length} leads</span>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid "+C.border,overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",border:"none",background:"transparent",color:tab===t.id?C.accent:C.muted,fontWeight:tab===t.id?700:400,fontSize:12,cursor:"pointer",borderBottom:tab===t.id?"2px solid "+C.accent:"2px solid transparent",whiteSpace:"nowrap"}}>
            {t.label}
            <span style={{fontSize:10,fontWeight:700,color:"#fff",background:t.bc,padding:"1px 6px",borderRadius:20,minWidth:18,textAlign:"center"}}>{t.badge}</span>
          </button>
        ))}
      </div>
      {tab==="acao"&&(
        <div>
          {acaoHoje.length===0
            ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>🎉 Nenhum acionamento vencido!</div>
            :acaoHoje.map(l=>{
              const ov=getPendingActions(l).filter(a=>a.daysOverdue>0);
              const cadPending = getCadencePending(l);
              const extraInfo = ov.length>0 ? ov.length+" acionamento(s) atrasado(s)" : cadPending.length+" etapa(s) de cadência pendente(s)";
              return <LeadRow key={l.id} lead={l} onSetPage={onSetPage} extra={extraInfo+" - Score "+(l.score||0)}/>;
            })
          }
        </div>
      )}
      {tab==="quentes"&&(
        <div>
          {quentes.length===0
            ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Nenhum lead quente ainda.</div>
            :quentes.map(l=>{
              const dias=getLeadStage(l.id)?Math.floor((now-new Date(getLeadStage(l.id).enteredAt).getTime())/dayMs):0;
              return <LeadRow key={l.id} lead={l} onSetPage={onSetPage} extra={dias+" dias na etapa - Score "+(l.score||0)}/>;
            })
          }
        </div>
      )}
      {tab==="risco"&&(
        <div>
          {emRisco.length===0
            ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>✅ Nenhum lead em risco.</div>
            :emRisco.map(l=>{
              const dias=diasSemContato(l);
              return <LeadRow key={l.id} lead={l} onSetPage={onSetPage} extra={"⏰ "+dias+" dias sem contato"}/>;
            })
          }
        </div>
      )}
      {tab==="pipeline"&&(
        <div style={{padding:16}}>
          {pipeline.map(p=>{
            const sc=getStatusColor(p.stage)||C.accent;
            return (
              <div key={p.stage} style={{...card({padding:14}),marginBottom:12,borderLeft:"4px solid "+sc}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{p.stage}</div>
                    <div style={{fontSize:10,color:C.faint}}>Score médio: {p.avg} · {p.count} lead(s)</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:900,color:sc}}>{p.count}</div>
                </div>
                <div style={{fontSize:11,color:sc,fontWeight:700}}>~{Math.round(p.count*p.rate)} fechamento(s) provável(is)</div>
              </div>
            );
          })}
          {pipeline.every(p=>p.count===0)&&<div style={{textAlign:"center",color:C.muted,fontSize:13,padding:24}}>Mova leads para as etapas do funil.</div>}
        </div>
      )}
      <div style={{padding:"10px 16px",borderTop:"1px solid "+C.border,display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={()=>onSetPage("funil")} style={{...btnG,padding:"5px 12px",fontSize:11}}>Ver Funil →</button>
        <button onClick={()=>onSetPage("crm")} style={{...btnP,padding:"5px 12px",fontSize:11}}>Ver CRM →</button>
      </div>
    </div>
  );
}

function Dashboard({leads, onSetPage, onAcionar, users=[], currentUser=null, isMaster=false}) {
  const [modTab, setModTab] = useState("todos"); // todos | prospeccao | receptivo | pos_venda

  // Filter leads by module tab
  // Filtros por módulo
  const proLeads  = leads.filter(l=>!l.module||l.module==="prospeccao");
  const recLeads  = leads.filter(l=>l.module==="receptivo");
  const posLeads  = leads.filter(l=>l.module==="pos_venda");

  const filteredLeads = modTab==="todos"      ? leads
    : modTab==="prospeccao"                   ? proLeads
    : modTab==="receptivo"                    ? recLeads
    : modTab==="pos_venda"                    ? posLeads
    : leads;

  const fl = filteredLeads;
  const total=fl.length;
  const conv=fl.filter(l=>l.status==="Contratou"||l.status==="Fechado").length;
  const neg=fl.filter(l=>["Montar orçamento","Proposta enviada","Proposta","Negociando"].includes(l.status)).length;
  const novos=fl.filter(l=>["Novo cliente","Novo contato"].includes(l.status)).length;
  const taxa=total?Math.round((conv/total)*100):0;

  // Funil adaptado por módulo
  const POS_VENDA_STAGES = [
    {label:"Aguardando",    c:"#6B7280"},
    {label:"Enviado",       c:"#3B82F6"},
    {label:"Respondeu",     c:"#8B5CF6"},
    {label:"Em conversa",   c:"#F59E0B"},
    {label:"Agendou reunião",c:"#4ADE80"},
    {label:"Sem resposta",  c:"#F87171"},
  ];
  const STAGE_ORDER=["Novo cliente","Conversando","Relacionamento","Reunião agendada","Montar orçamento","Não compareceu","Proposta enviada","Contratou"];
  const stageIdx=(name)=>STAGE_ORDER.indexOf(name);
  const reachedStage=(name)=>fl.filter(l=>stageIdx(l.status)>=stageIdx(name)).length;
  const FUNIL_VISIBLE = modTab==="pos_venda"
    ? POS_VENDA_STAGES.map(s=>({label:s.label,v:fl.filter(l=>l.status===s.label).length,c:s.c}))
    : [
        {label:"Novo cliente",v:reachedStage("Novo cliente"),c:"#3B82F6"},
        {label:"Conversando",v:reachedStage("Conversando"),c:"#8B5CF6"},
        {label:"Relacionamento",v:reachedStage("Relacionamento"),c:"#10B981"},
        {label:"Reunião agendada",v:reachedStage("Reunião agendada"),c:"#F59E0B"},
        {label:"Proposta enviada",v:reachedStage("Proposta enviada"),c:"#6366F1"},
        {label:"Contratou",v:reachedStage("Contratou"),c:"#4ADE80"},
      ];
  const maxF=Math.max(...FUNIL_VISIBLE.map(f=>f.v),1);

  const todayLeads=filterLeadsByPeriod(fl,"dia");
  const weekLeads=filterLeadsByPeriod(fl,"semana");
  const monthLeads=filterLeadsByPeriod(fl,"mes");
  const scopeId=currentUser?.id||"company";
  const [detailLead,setDetailLead]=useState(null);

  // Module tabs config
  const modTabs = [
    {id:"todos",      label:"🔢 Todos",        count:leads.length,      color:C.accent},
    {id:"prospeccao", label:"🎯 Prospecção",   count:proLeads.length,   color:"#3B82F6"},
    {id:"receptivo",  label:"📥 Receptivo",    count:recLeads.length,   color:"#8B5CF6"},
    {id:"pos_venda",  label:"🤝 Pós-venda",    count:posLeads.length,   color:"#4ADE80"},
  ];

  return (
    <div>
      {detailLead&&<LeadDetailModal lead={detailLead} onClose={()=>setDetailLead(null)} onUpdate={()=>{}} onAcionar={(id)=>{setDetailLead(null);onAcionar(id);}}/>}

      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:3}}>Visão Geral</div>
        <div style={{fontSize:12,color:C.muted}}>Painel executivo · atualizado agora</div>
      </div>

      {/* Module Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden"}}>
        {modTabs.map(t=>(
          <button key={t.id} onClick={()=>setModTab(t.id)}
            style={{flex:1,padding:"10px 8px",border:"none",background:modTab===t.id?(t.color+"18"):"transparent",color:modTab===t.id?t.color:C.muted,fontWeight:modTab===t.id?700:400,fontSize:11,cursor:"pointer",borderBottom:"2px solid "+(modTab===t.id?t.color:"transparent"),transition:"all 0.15s",whiteSpace:"nowrap"}}>
            {t.label}
            <div style={{fontSize:13,fontWeight:900,color:modTab===t.id?t.color:C.faint,marginTop:2}}>{t.count}</div>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:22}}>
        <KpiCard value={total} label="Total"/>
        <KpiCard value={novos} label="Novos" accent="#60A5FA"/>
        <KpiCard value={neg} label="Em Negociação" accent="#FBBF24"/>
        <KpiCard value={taxa+"%"} label="Conversão" accent="#4ADE80"/>
        <KpiCard value={fl.filter(l=>l.priority==="Alta").length} label="Alta Prior." accent="#F87171" pos={false}/>
      </div>

      {/* Visão total — resumo de módulos */}
      {modTab==="todos"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}} className="mob-grid-1">
          {[
            {label:"🎯 Prospecção", leads:proLeads, color:"#3B82F6", page:"crm"},
            {label:"📥 Receptivo",  leads:recLeads, color:"#8B5CF6", page:"receptivo"},
            {label:"🤝 Pós-venda",  leads:posLeads, color:"#4ADE80", page:"pos_venda"},
          ].map(mod=>{
            const fechados = mod.leads.filter(l=>["Contratou","Fechado"].includes(l.status)).length;
            const taxa2 = mod.leads.length?Math.round((fechados/mod.leads.length)*100):0;
            return (
              <div key={mod.label} onClick={()=>onSetPage(mod.page)}
                style={{...card({padding:16}),cursor:"pointer",borderLeft:"4px solid "+mod.color,transition:"all 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=mod.color+"08"}
                onMouseLeave={e=>e.currentTarget.style.background=C.panel}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>{mod.label}</div>
                <div style={{fontSize:26,fontWeight:900,color:mod.color,marginBottom:4}}>{mod.leads.length}</div>
                <div style={{fontSize:10,color:C.faint}}>Conversão: {taxa2}%</div>
                <div style={{height:3,background:C.border,borderRadius:2,marginTop:8,overflow:"hidden"}}>
                  <div style={{height:"100%",width:taxa2+"%",background:mod.color,borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metas */}
      <div style={{...card({padding:18}),marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>🎯 Metas</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}} className="mob-grid-1">
          {[["dia","Hoje",todayLeads],["semana","Semana",weekLeads],["mes","Mês",monthLeads]].map(([period,plabel,pl])=>(
            <div key={period} style={{background:C.sidebar,borderRadius:10,padding:12,border:"1px solid "+C.border}}>
              <div style={{fontSize:10,fontWeight:800,color:C.accent,letterSpacing:1,textTransform:"uppercase",marginBottom:10,textAlign:"center"}}>{plabel}</div>
              {GOAL_INDICATORS.map(ind=>{
                const meta=getGoalValue("company",period,ind.id)||getGoalValue(scopeId,period,ind.id);
                const atual=computeProgress(fl,ind.id,pl);
                const faltam=Math.max(0,meta-atual);
                const pct=meta>0?Math.min(100,Math.round((atual/meta)*100)):0;
                const cor=pct>=100?"#4ADE80":pct>=70?ind.color:pct>=40?"#F59E0B":"#EF4444";
                return (
                  <div key={ind.id} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:10,color:C.muted}}>{ind.icon} {ind.label}</span>
                      <span style={{fontSize:10,fontWeight:800,color:cor}}>{meta>0?(pct+"%"):"—"}</span>
                    </div>
                    <div style={{height:5,background:C.border,borderRadius:4,overflow:"hidden",marginBottom:3}}>
                      <div style={{height:"100%",width:(pct+"%"),background:cor,borderRadius:4,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.faint}}>
                      <span style={{color:cor,fontWeight:700}}>{atual} realizado</span>
                      {meta>0&&<span>{faltam>0?("faltam "+faltam):<span style={{color:"#4ADE80",fontWeight:700}}>✅ Meta!</span>}</span>}
                      {meta===0&&<span style={{color:C.faint}}>sem meta</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        {/* Funil */}
        <div style={card({marginTop:4})}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>
            {modTab==="todos"?"Funil Geral":modTab==="receptivo"?"Funil Receptivo":modTab==="pos_venda"?"Pós-venda por Status":"Funil Prospecção"}
          </div>
          {FUNIL_VISIBLE.map((f,i)=>{
            const pct=maxF>0?Math.round((f.v/maxF)*100):0;
            const convRate=i>0&&FUNIL_VISIBLE[i-1].v>0?Math.round((f.v/FUNIL_VISIBLE[i-1].v)*100):null;
            return (
              <div key={f.label} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:f.c,flexShrink:0}}/>
                    <span style={{fontSize:12,color:C.text,fontWeight:600}}>{f.label}</span>
                    {convRate!==null&&<span style={{fontSize:9,color:C.faint,background:C.border,padding:"1px 5px",borderRadius:10}}>{convRate}% do ant.</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:C.faint}}>{total?Math.round((f.v/total)*100):0}%</span>
                    <span style={{fontSize:14,fontWeight:800,color:f.c}}>{f.v}</span>
                  </div>
                </div>
                <div style={{height:6,background:C.border,borderRadius:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:(pct+"%"),background:f.c,borderRadius:6,transition:"width 0.5s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status resumo */}
        <div style={card()}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>Status Resumo</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {getStatusList().map(s=>{
              const sc=getStatusColor(s)||C.dim;
              const n=fl.filter(l=>l.status===s).length;
              if(n===0) return null;
              return <div key={s} style={{flex:1,minWidth:60,background:(sc+"10"),border:"1px solid "+(sc+"33"),borderRadius:8,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:sc}}>{n}</div><div style={{fontSize:9,color:C.faint,fontWeight:600,marginTop:2}}>{s}</div></div>;
            })}
          </div>
        </div>
      </div>

      {/* Central de Decisão */}
      <CentralDecisao leads={fl} onSetPage={onSetPage} onAcionar={onAcionar}/>
    </div>
  );
}

function CompanyProfile({profile, onSave}) {
  const [form,setForm]=useState(profile);
  const [saved,setSaved]=useState(false);
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const save=()=>{onSave(form);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const fieldStyle={...inp,minHeight:undefined};
  const taStyle={...inp,resize:"vertical",fontFamily:"inherit"};
  return (
    <div style={{maxWidth:820}}>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:3}}>Perfil da Empresa</div>
        <div style={{fontSize:12,color:C.muted}}>Estas informações são usadas pela IA para personalizar buscas e mensagens</div>
      </div>
      <div style={{...card({marginBottom:16}),borderLeft:("3px solid "+C.accent)}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{color:C.accent,fontSize:22,lineHeight:1}}>💡</div>
          <div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>Como isso funciona?</div><div style={{fontSize:12,color:C.dim,lineHeight:1.7}}>Quanto mais detalhado o perfil, mais precisa será a busca de leads. A IA combina essas informações com cidade, raio, cargo-alvo e canais para encontrar os prospects ideais - e usa o contexto da empresa para personalizar automaticamente cada mensagem de abordagem.</div></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={card()}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>🏢 Identificação</div>
          <div style={{marginBottom:14}}><label style={lbl}>Nome da Empresa</label><input style={fieldStyle} value={form.companyName} onChange={e=>f("companyName",e.target.value)} placeholder="Ex: OPME Distribuidora Ltda"/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Segmento / Ramo</label><input style={fieldStyle} value={form.segment} onChange={e=>f("segment",e.target.value)} placeholder="Ex: Distribuição de peças cirúrgicas OPME"/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Cidade Sede</label><input style={fieldStyle} value={form.city} onChange={e=>f("city",e.target.value)} placeholder="Ex: São Paulo, SP"/></div>
          <div style={{marginBottom:0}}><label style={lbl}>Ano de Fundação</label><input style={fieldStyle} value={form.founded} onChange={e=>f("founded",e.target.value)} placeholder="Ex: 2015"/></div>
        </div>
        <div style={card()}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>🎯 Produto & Público</div>
          <div style={{marginBottom:14}}><label style={lbl}>Produto / Serviço Principal</label><input style={fieldStyle} value={form.product} onChange={e=>f("product",e.target.value)} placeholder="Ex: Distribuição de implantes e instrumental cirúrgico"/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Público-Alvo</label><input style={fieldStyle} value={form.audience} onChange={e=>f("audience",e.target.value)} placeholder="Ex: Hospitais, clínicas ortopédicas, cirurgiões"/></div>
          <div style={{marginBottom:0}}><label style={lbl}>Área de Atuação Geográfica</label><input style={fieldStyle} value={form.coverage} onChange={e=>f("coverage",e.target.value)} placeholder="Ex: Estado de SP, Grande SP, Nacional"/></div>
        </div>
      </div>
      <div style={card({marginBottom:16})}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>📖 História da Empresa</div>
        <textarea style={{...taStyle,minHeight:110}} value={form.history} onChange={e=>f("history",e.target.value)} placeholder="Conte a história da empresa: quando foi fundada, como surgiu, principais marcos, missão e visão..."/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={card()}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>⭐ Diferenciais Competitivos</div>
          <textarea style={{...taStyle,minHeight:100}} value={form.differentials} onChange={e=>f("differentials",e.target.value)} placeholder="O que diferencia sua empresa? Ex: Entrega em 24h, suporte técnico especializado, maior portfólio da região..."/>
        </div>
        <div style={card()}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>💬 Proposta de Valor</div>
          <textarea style={{...taStyle,minHeight:100}} value={form.valueProposition} onChange={e=>f("valueProposition",e.target.value)} placeholder="Em uma frase: qual o principal benefício que você entrega ao cliente? Ex: Reduzimos o custo com OPME em até 30% sem comprometer a qualidade..."/>
        </div>
      </div>
      <div style={card({marginBottom:20})}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>🏆 Cases de Sucesso / Referências</div>
        <textarea style={{...taStyle,minHeight:80}} value={form.cases} onChange={e=>f("cases",e.target.value)} placeholder="Mencione clientes atendidos, resultados obtidos, certificações. Isso será usado para construir credibilidade nas mensagens de abordagem..."/>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <button style={btnP} onClick={save}><Icon d={IC.save} size={15} color="#fff"/>{saved?"✅ Salvo com sucesso!":"Salvar Perfil"}</button>
        {saved&&<span style={{fontSize:12,color:"#4ADE80"}}>Perfil atualizado - a próxima busca usará estas informações.</span>}
      </div>
    </div>
  );
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
function SearchLeads({onLeadsFound, existingLeads=[], profile={}, currentUser=null, ownerWebhook=""}) {
  const [segmento, setSegmento] = useState("");
  const [city,     setCity]     = useState(profile.city||"São Paulo");
  const [qty,      setQty]      = useState("10");
  const [loading,  setLoading]  = useState(false);
  const [progress, setProg]     = useState(0);
  const [progMsg,  setProgMsg]  = useState("");
  const [results,  setResults]  = useState([]);
  const [error,    setError]    = useState("");
  const [mode,     setMode]     = useState("n8n"); // n8n | ia

  // Detect if webhook is configured
  const webhookUrl = ownerWebhook && ownerWebhook !== "https://seu-n8n.app.n8n.cloud/webhook/pipe-tm"
    ? ownerWebhook : "";

  const search = async () => {
    if(!segmento||!city){ setError("Preencha o segmento e a cidade."); return; }
    setError(""); setLoading(true); setResults([]); setProg(10); setProgMsg("Enviando para o N8N...");

    const payload = {
      segmento,
      cidade: city,
      quantidade: parseInt(qty)||10,
      tenant_id: currentUser?.tenant_id||"",
      user_id: currentUser?.id||"",
    };

    try {
      if(mode==="n8n" && webhookUrl) {
        // ── Modo N8N ──────────────────────────────────────────
        setProg(30); setProgMsg("Buscando no Google Places via N8N...");
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload),
          mode: "no-cors"
        });
        setProg(80); setProgMsg("Aguardando retorno do N8N...");
        // no-cors: resposta opaca, sucesso presumido
        setProg(100); setProgMsg("✅ Solicitação enviada ao N8N!");
        setError("");
        setTimeout(()=>{setProg(0);setProgMsg("");setLoading(false);},3000);
        return;
      } else {
        // ── Modo IA (fallback) ────────────────────────────────
        setProg(20); setProgMsg("Consultando IA...");
        const existingCos = existingLeads.map(l=>(l.company||"").toLowerCase());
        const prompt = "Voce e especialista em prospeccao B2B de PESSOAS JURIDICAS no Brasil. Retorne SOMENTE empresas, nunca pessoas fisicas. Gere "+qty+" leads B2B realistas. Segmento: "+segmento+". Cidade: "+city+". Retorne SOMENTE um JSON array valido, sem markdown: [{nome,company,tipo,city,email,phone,score,status,notes}]";
        setProg(50); setProgMsg("Processando leads...");
        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:Math.max(4000,parseInt(qty)*400),messages:[{role:"user",content:prompt}]})
        });
        const data = await res.json();
        if(data.error){setError("Erro API: "+data.error.message);clearInterval(0);setProg(0);setLoading(false);return;}
        const raw=(data.content||[]).map(b=>b.text||"").join("").trim().replace(/```json|```/g,"").trim();
        let parsed; try{parsed=JSON.parse(raw);}catch(e){setError("Resposta inválida. Tente novamente.");setProg(0);setLoading(false);return;}
        if(!Array.isArray(parsed)||parsed.length===0){setError("Nenhum lead retornado. Tente outros parâmetros.");setProg(0);setLoading(false);return;}
        const filtered=parsed.filter(l=>!existingCos.includes((l.company||"").toLowerCase()));
        setResults(filtered.map((l,i)=>({...l,id:Date.now()+i,cadence:[],createdAt:new Date().toISOString().split("T")[0]})));
        setProg(100); setProgMsg("✅ Busca concluída!");
        setTimeout(()=>{setProg(0);setProgMsg("");},2000);
      }
    } catch(e) {
      setError("Erro: "+e.message);
      setProg(0); setProgMsg("");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>🔍 Gerar Leads</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Preencha o segmento e a cidade — o N8N busca no Google Places.</div>

      {/* Modo selector */}
      {webhookUrl&&(
        <div style={{display:"flex",gap:0,marginBottom:16,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden",width:"fit-content"}}>
          {[["n8n","🔗 N8N (Google Places)"],["ia","🤖 IA (simulado)"]].map(([v,l])=>(
            <button key={v} onClick={()=>setMode(v)}
              style={{padding:"7px 16px",border:"none",background:mode===v?C.accent:"transparent",color:mode===v?"#fff":C.muted,fontSize:11,fontWeight:mode===v?700:400,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      <div style={{...card({padding:20}),marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}} className="mob-grid-1">

          {/* Segmento — campo livre */}
          <div style={{gridColumn:"1/-1"}}>
            <div style={lbl}>Segmento *</div>
            <input value={segmento} onChange={e=>setSegmento(e.target.value)}
              placeholder="Ex: Distribuidoras de joias, Clínicas odontológicas, Autopeças..."
              style={inp}/>
            <div style={{fontSize:10,color:C.faint,marginTop:4}}>Digite qualquer segmento — sem limitações</div>
          </div>

          {/* Cidade */}
          <div>
            <div style={lbl}>Cidade *</div>
            <input value={city} onChange={e=>setCity(e.target.value)}
              placeholder="Ex: São Paulo-SP, Curitiba-PR"
              style={inp}/>
          </div>

          {/* Quantidade */}
          <div>
            <div style={lbl}>Quantidade</div>
            <select value={qty} onChange={e=>setQty(e.target.value)} style={inp}>
              {["5","10","20","50"].map(n=><option key={n} value={n}>{n} empresas</option>)}
            </select>
          </div>
        </div>

        {/* Error */}
        {error&&<div style={{color:"#F87171",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(248,113,113,0.08)",borderRadius:6}}>{error}</div>}

        {/* Progress */}
        {loading&&(
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
              <span>{progMsg}</span><span>{progress}%</span>
            </div>
            <div style={{height:4,background:C.border,borderRadius:4}}>
              <div style={{height:"100%",width:progress+"%",background:C.accent,borderRadius:4,transition:"width 0.5s"}}/>
            </div>
          </div>
        )}

        <button onClick={search} disabled={loading}
          style={{...btnP,width:"100%",padding:"12px",fontSize:14,fontWeight:700,opacity:loading?0.6:1}}>
          {loading?"⏳ Buscando...":"🔍 Buscar Leads"}
        </button>

        {/* N8N info */}
        {mode==="n8n"&&webhookUrl&&!loading&&(
          <div style={{marginTop:12,padding:"8px 12px",background:C.accent+"08",border:"1px solid "+C.accent+"22",borderRadius:6,fontSize:11,color:C.muted}}>
            🔗 Payload enviado ao N8N: <code style={{color:C.accent}}>segmento, cidade, quantidade, tenant_id, user_id</code>
          </div>
        )}
        {mode==="n8n"&&!webhookUrl&&(
          <div style={{marginTop:12,padding:"8px 12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:6,fontSize:11,color:"#F59E0B"}}>
            ⚠️ Webhook de busca não configurado. O administrador deve configurá-lo em Super Admin → Webhooks N8N.
          </div>
        )}
      </div>

      {/* Results */}
      {results.length>0&&(
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>
            {results.length} empresa{results.length>1?"s":""} encontrada{results.length>1?"s":""}
          </div>
          {results.map(l=>(
            <div key={l.id} style={{...card({marginBottom:10}),borderLeft:"3px solid "+C.accent}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{l.name||l.company}</div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:4}}>
                    {l.tipo==="PF"&&l.role?l.role+" · ":""}{l.company}
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:10,color:C.faint,background:C.border,padding:"2px 8px",borderRadius:20}}>{l.city}</span>
                    <span style={{fontSize:11,fontWeight:800,color:(l.score||0)>=75?"#4ADE80":"#F59E0B"}}>Score {l.score||0}</span>
                    {l.phone&&<span style={{fontSize:10,color:C.faint}}>📞 {l.phone}</span>}
                    {l.email&&<span style={{fontSize:10,color:C.faint}}>✉️ {l.email}</span>}
                  </div>
                  {l.notes&&<div style={{fontSize:11,color:C.dim,marginTop:6,fontStyle:"italic"}}>{l.notes}</div>}
                </div>
                <button onClick={()=>onLeadsFound([l])}
                  style={{...btnP,padding:"6px 14px",fontSize:11,flexShrink:0,marginLeft:12}}>
                  + Adicionar ao CRM
                </button>
              </div>
            </div>
          ))}
          <button onClick={()=>results.forEach(l=>onLeadsFound([l]))}
            style={{...btnP,width:"100%",padding:"10px",fontSize:12,marginTop:4,background:"linear-gradient(135deg,#059669,#047857)"}}>
            ✅ Adicionar Todos ao CRM ({results.length})
          </button>
        </div>
      )}
    </div>
  );
}


function Messages({leads,profile}) {
  const [sel,setSel]       = useState(leads[0]||null);
  const [tab,setTab]       = useState("whatsapp");
  const [selStage,setSelStage] = useState("Novo cliente");
  const [aiModal,setAiModal] = useState(false);
  const [selMsg,setSelMsg] = useState(null); // selected AI message id
  const [aiContext,setAiContext] = useState({abordagem:"",acao:"",canal:"whatsapp"});
  const [editId,setEditId] = useState(null);
  const [editTxt,setEditTxt] = useState("");
  // AI personalization state
  const [aiMsgs,setAiMsgs]   = useState({});   // keyed by leadId
  const [aiLoading,setAiLoading] = useState({});
  const [aiError,setAiError] = useState({});

  useEffect(()=>{ if(leads.length&&!sel) setSel(leads[0]); },[leads]);
  useEffect(()=>{
    if(sel?.status && FUNIL_STAGES_MSGS.includes(sel.status)) setSelStage(sel.status);
  },[sel]);

  // Infer tone/persona from lead profile
  const inferPersona = (l) => {
    const role = (l.role||"").toLowerCase();
    const ch   = (l.channel||"").toLowerCase();
    const notes= (l.notes||"").toLowerCase();
    if(role.includes("ceo")||role.includes("diretor")||role.includes("presidente"))
      return { tom:"executivo", linguagem:"formal e direta", foco:"resultado estratégico e ROI", estilo:"autoritativo e conciso" };
    if(role.includes("gerente")||role.includes("gestor"))
      return { tom:"consultivo", linguagem:"profissional mas acessível", foco:"eficiência operacional e time", estilo:"colaborativo" };
    if(role.includes("compra")||role.includes("suprimento"))
      return { tom:"técnico-comercial", linguagem:"objetiva com dados", foco:"custo, prazo e confiabilidade", estilo:"analítico" };
    if(ch.includes("instagram"))
      return { tom:"dinâmico", linguagem:"descontraída e visual", foco:"tendências e inovação", estilo:"storytelling curto" };
    if(ch.includes("linkedin"))
      return { tom:"profissional", linguagem:"networking e valor de mercado", foco:"crescimento e reputação", estilo:"inspiracional" };
    return { tom:"amigável", linguagem:"cordial e clara", foco:"benefício direto", estilo:"empático" };
  };

  const generateAI = async (lead) => {
    const key = lead.id;
    setAiLoading(s=>({...s,[key]:true}));
    setAiError(s=>({...s,[key]:""}));
    const persona = inferPersona(lead);
    const bt = lead.bestTime||{};
    const p  = profile||{};
    const companyCtx = p.name ? `Empresa vendedora: ${p.name}. Segmento: ${p.segment||"saúde"}.` : "";
    const quantity = 3;
    const channels = ["whatsapp","email","linkedin"];

    const prompt = `Você é especialista em copywriting B2B para saúde e logística cirúrgica no Brasil. ${companyCtx} Gere ${quantity} mensagens personalizadas de prospecção para: Nome: ${lead.name}, Cargo: ${lead.role}, Empresa: ${lead.company}, Cidade: ${lead.city}. Canais solicitados: ${channels.join(", ")}. Para cada canal retorne objeto JSON com: {channel, subject(se email), message, tone, bestTime}. Retorne APENAS array JSON válido sem markdown.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      const raw  = data.content?.map(i=>i.text||"").join("").trim().replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      setAiMsgs(s=>({...s,[key]:parsed}));
    } catch(e) {
      setAiError(s=>({...s,[key]:"Erro ao gerar mensagens. Verifique sua conexão."}));
    }
    setAiLoading(s=>({...s,[key]:false}));
  };

  if(!leads.length) return (
    <div style={{textAlign:"center",padding:60,color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>👥</div>
      <div style={{fontSize:16,fontWeight:600}}>Nenhum lead disponível</div>
      <div style={{fontSize:13}}>Adicione leads na aba Busca</div>
    </div>
  );

  const aiData  = sel ? aiMsgs[sel.id]   : null;
  const isLoading = sel ? !!aiLoading[sel.id] : false;
  const errMsg  = sel ? aiError[sel.id]  : "";
  const persona = sel ? inferPersona(sel) : null;

  // Which templates to show: AI-generated or static fallback
  // Build lists from new template system based on selected stage
  // effectiveStage: user selection (selStage) takes priority
  const effectiveStage = FUNIL_STAGES_MSGS.includes(selStage) ? selStage : (sel?.status||"Novo cliente");
  const waList  = aiData?.whatsapp || getTemplates("whatsapp", effectiveStage);
  const liList  = getTemplates("ligacao", effectiveStage);
  const emList  = aiData?.email    || getTemplates("email", effectiveStage);


  // ── AI Modal handler ────────────────────────────────────────────
  const handleGenerateWithContext = async () => {
    if(!sel) return;
    setAiModal(false);
    const key = sel.id;
    setAiLoading(s=>({...s,[key]:true}));
    setAiError(s=>({...s,[key]:""}));
    const p = profile||{};
    const canal = aiContext.canal;
    const prompt = "Você é especialista em copywriting B2B para o setor de saude e logistica cirurgica no Brasil. Gere mensagens de prospecção personalizadas para: Empresa: "+(sel.company||sel.name)+", Cidade: "+(sel.city||"")+", Etapa do funil: "+selStage+". Canal solicitado: "+canal+". Abordagem desejada: "+(aiContext.abordagem||"profissional e direto")+". Acao esperada do cliente: "+(aiContext.acao||"agendar uma reuniao")+". Gere 3 variações de mensagem para o canal "+canal+" considerando o contexto acima. Retorne APENAS JSON array: [{id:'ai1',label:'Variacao 1',text:'...'},{id:'ai2',label:'Variacao 2',text:'...'},{id:'ai3',label:'Variacao 3',text:'...'}]";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1500,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      if(data.error){setAiError(s=>({...s,[key]:data.error.message}));setAiLoading(s=>({...s,[key]:false}));return;}
      const raw=(data.content||[]).map(b=>b.text||"").join("").trim().replace(/```json|```/g,"").trim();
      let parsed; try{parsed=JSON.parse(raw);}catch(e){parsed=[];}
      const result = {};
      if(canal==="whatsapp") result.whatsapp=Array.isArray(parsed)?parsed:[];
      else if(canal==="email") result.email=Array.isArray(parsed)?parsed.map(t=>({...t,subject:t.subject||"Contato - OPEN Log",body:t.text})):[];
      else if(canal==="ligacao") result.ligacao=Array.isArray(parsed)?parsed:[];
      setAiMsgs(s=>({...s,[key]:{...s[key],...result}}));
      if(canal!==tab) setTab(canal);
    } catch(e){
      setAiError(s=>({...s,[key]:"Erro: "+e.message}));
    } finally {
      setAiLoading(s=>({...s,[key]:false}));
    }
  };

  return (
    <div>
      {/* ── AI Generation Modal ── */}
      {aiModal&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setAiModal(false)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:480,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>✨ Gerar Mensagem com IA</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>Descreva o contexto e a IA cria a abordagem ideal</div>
              </div>
              <button onClick={()=>setAiModal(false)} style={{background:"transparent",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>

            {/* Lead info */}
            <div style={{background:C.sidebar,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.muted}}>
              <span style={{color:C.text,fontWeight:700}}>{sel?.company||sel?.name}</span> · {selStage}
            </div>

            {/* Canal */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Canal de envio</div>
              <div style={{display:"flex",gap:8}}>
                {[["whatsapp","📱 WhatsApp"],["ligacao","📞 Ligacao"],["email","✉️ E-mail"]].map(([v,l])=>(
                  <div key={v} onClick={()=>setAiContext(a=>({...a,canal:v}))}
                    style={{flex:1,padding:"8px 0",textAlign:"center",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:aiContext.canal===v?700:400,border:"1px solid "+(aiContext.canal===v?C.accent:C.border),background:aiContext.canal===v?(C.accent+"18"):"transparent",color:aiContext.canal===v?C.accent:C.muted,transition:"all 0.15s"}}>
                    {l}
                  </div>
                ))}
              </div>
            </div>

            {/* Abordagem */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Como voce quer abordar?</div>
              <textarea value={aiContext.abordagem}
                onChange={e=>setAiContext(a=>({...a,abordagem:e.target.value}))}
                placeholder="Ex: Abordagem consultiva destacando reducao de custos, tom profissional mas acessivel..."
                style={{...inp,height:80,resize:"vertical",fontSize:12}}/>
            </div>

            {/* Acao esperada */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>O que voce espera que o cliente faca?</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                {["Agendar reuniao","Responder mensagem","Ligar de volta","Aceitar proposta","Visitar o site"].map(ac=>(
                  <div key={ac} onClick={()=>setAiContext(a=>({...a,acao:ac}))}
                    style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:11,border:"1px solid "+(aiContext.acao===ac?C.accent:C.border),background:aiContext.acao===ac?(C.accent+"18"):"transparent",color:aiContext.acao===ac?C.accent:C.muted}}>
                    {ac}
                  </div>
                ))}
              </div>
              <input value={aiContext.acao} onChange={e=>setAiContext(a=>({...a,acao:e.target.value}))}
                placeholder="Ou descreva a acao esperada..." style={{...inp,fontSize:12}}/>
            </div>

            {/* Buttons */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setAiModal(false)} style={{...btnG,flex:1,padding:"10px"}}>Cancelar</button>
              <button onClick={handleGenerateWithContext}
                disabled={!aiContext.canal}
                style={{...btnP,flex:2,padding:"10px",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",fontSize:13,fontWeight:700}}>
                ✨ Gerar Mensagens
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Personalizar Mensagens</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:22}}>Mensagens geradas por IA com base no perfil comportamental de cada lead</div>

      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:20}}>
        {/* Lead selector */}
        <div style={card({padding:0,overflow:"hidden"})}>
          <div style={{padding:"10px 14px",borderBottom:("1px solid "+C.border),fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>Selecionar Lead</div>
          <div style={{maxHeight:500,overflowY:"auto"}}>
            {leads.map(l=>(
              <div key={l.id} onClick={()=>setSel(l)} style={{padding:"11px 14px",borderBottom:("1px solid "+C.panel),cursor:"pointer",background:sel?.id===l.id?"rgba(0,180,216,0.08)":"transparent",borderLeft:sel?.id===l.id?"3px solid #00B4D8":"3px solid transparent"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>{l.name}</div>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{l.company}</div>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:C.accent,background:(C.accent+"14"),border:("1px solid "+C.accent+"33"),padding:"1px 6px",borderRadius:20}}>{l.channel}</span>
                  {aiMsgs[l.id]&&<span style={{fontSize:9,color:"#4ADE80",fontWeight:700}}>✨ IA</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages panel */}
        {sel&&(
          <div>
            {/* Lead info + persona card */}
            <div style={{...card({padding:"14px 16px",marginBottom:14}),display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:10,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:16,flexShrink:0}}>{sel.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{sel.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{sel.role} · {sel.company}</div>
                {persona&&<div style={{marginTop:5,display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,color:"#C8DFF0",background:C.sidebar,border:("1px solid "+C.border),padding:"2px 8px",borderRadius:20}}>🎭 {persona.tom}</span>
                  <span style={{fontSize:10,color:"#C8DFF0",background:C.sidebar,border:("1px solid "+C.border),padding:"2px 8px",borderRadius:20}}>🗣 {persona.linguagem}</span>
                  <span style={{fontSize:10,color:"#C8DFF0",background:C.sidebar,border:("1px solid "+C.border),padding:"2px 8px",borderRadius:20}}>🎯 {persona.foco}</span>
                </div>}
              </div>
              {/* AI Generate button */}
              <button
                onClick={()=>setAiModal(true)}
                disabled={isLoading}
                style={{...btnP,background:aiData?"linear-gradient(135deg,#7C3AED,#5B21B6)":("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),whiteSpace:"nowrap",padding:"9px 16px",fontSize:12}}
              >
                {isLoading
                  ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Gerando...</>
                  : aiData
                    ? <>✨ Regenerar com IA</>
                    : <>✨ Gerar com IA</>
                }
              </button>
            </div>

            {/* AI persona summary */}
            {aiData?.persona_summary&&(
              <div style={{...card({padding:"10px 14px",marginBottom:14}),background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.25)",borderLeft:"3px solid #7C3AED"}}>
                <span style={{fontSize:11,color:"#A78BFA",fontWeight:700}}>✨ Análise de Perfil: </span>
                <span style={{fontSize:11,color:"#C8DFF0"}}>{aiData.persona_summary}</span>
              </div>
            )}

            {errMsg&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #F8717133",borderRadius:8,padding:"9px 12px",color:"#F87171",fontSize:12,marginBottom:12}}>⚠️ {errMsg}</div>}

            {/* Seletor de Etapa */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:C.faint,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Etapa do Funil</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {FUNIL_STAGES_MSGS.map(stage=>{
                  const active = selStage===stage;
                  const sc = getStatusColor(stage)||C.accent;
                  return (
                    <div key={stage} onClick={()=>setSelStage(stage)}
                      style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:400,border:"1px solid "+(active?sc:C.border),background:active?(sc+"18"):"transparent",color:active?sc:C.muted,transition:"all 0.15s"}}>
                      {stage}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              {[["whatsapp","📱 WhatsApp (5)"],["ligacao","📞 Ligação Ativa (5)"],["email","✉️ E-mail (5)"]].map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:8,border:("1px solid "+tab===t?C.accent:C.border),background:tab===t?(C.accent+"14"):"transparent",color:tab===t?C.accent:C.dim,fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>
              ))}
              {!aiData&&<div style={{display:"flex",alignItems:"center",fontSize:11,color:C.faint,marginLeft:8}}>← Clique em "Gerar com IA" para mensagens personalizadas por perfil</div>}
            </div>

            {/* AI Result Banner */}
            {aiData&&tab===aiContext.canal&&(
              <div style={{padding:"10px 14px",background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:10,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>✨</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#A78BFA"}}>Mensagens geradas pela IA</div>
                  <div style={{fontSize:10,color:"#7C3AED"}}>Selecione a que melhor se encaixa e clique em Enviar</div>
                </div>
                <button onClick={()=>setAiMsgs(s=>({...s,[sel.id]:null}))}
                  style={{background:"transparent",border:"1px solid rgba(124,58,237,0.3)",borderRadius:6,padding:"3px 10px",cursor:"pointer",color:"#A78BFA",fontSize:10}}>
                  Limpar IA
                </button>
              </div>
            )}

            {/* WhatsApp templates */}
            {tab==="whatsapp"&&waList.map((t,idx)=>{
              const txt = typeof t.text==="function" ? t.text(sel,profile||{}) : t.text;
              const isEdit = editId===`wa-${t.id}`;
              return (
                <div key={t.id} onClick={()=>setSelMsg(s=>s===t.id?null:t.id)} style={{...card({marginBottom:10}),borderLeft:selMsg===t.id?"3px solid #7C3AED":(aiData?"3px solid #7C3AED33":"3px solid #25D36633"),background:selMsg===t.id?"rgba(124,58,237,0.08)":undefined,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isEdit?10:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14}}>{t.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.text}}>{t.label}</span>
                      {aiData&&<span style={{fontSize:9,color:"#A78BFA",fontWeight:700,background:"rgba(124,58,237,0.15)",padding:"1px 6px",borderRadius:20}}>✨ IA</span>}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <CopyBtn text={isEdit?editTxt:txt}/>
                      <button style={{...btnG,padding:"5px 10px",fontSize:10}} onClick={()=>{setEditId(isEdit?null:`wa-${t.id}`);setEditTxt(txt);}}>
                        <Icon d={IC.edit} size={12}/>{isEdit?"Fechar":"Editar"}
                      </button>
                    </div>
                  </div>
                  {isEdit
                    ? <textarea style={{...inp,minHeight:110,fontSize:12,resize:"vertical"}} value={editTxt} onChange={e=>setEditTxt(e.target.value)}/>
                    : <div style={{background:C.sidebar,borderRadius:8,padding:"10px 12px",fontSize:12,color:"#C8DFF0",lineHeight:1.7,whiteSpace:"pre-wrap",marginTop:8}}>{txt}</div>
                  }
                </div>
              );
            })}

            {/* Email templates */}
                        {/* Ligação Ativa templates */}
            {tab==="ligacao"&&(
              <div>
                {liList.length===0
                  ?<div style={{...card({padding:24}),textAlign:"center",color:C.muted}}>Nenhum script para esta etapa.</div>
                  :liList.map((t,idx)=>{
                    const txt = typeof t.text==="function" ? t.text(sel,profile||{}) : t.text;
                    return (
                      <div key={t.id} style={{...card({marginBottom:10}),borderLeft:"3px solid #F59E0B"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:18}}>📞</span>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{fontSize:12,fontWeight:700,color:selMsg===t.id?"#A78BFA":C.text}}>{t.label}</div>
                              {selMsg===t.id&&<span style={{fontSize:9,color:"#fff",background:"#7C3AED",padding:"1px 7px",borderRadius:20,fontWeight:700}}>✓ Selecionada</span>}
                              {aiData&&<span style={{fontSize:9,color:"#A78BFA",background:"rgba(124,58,237,0.1)",padding:"1px 6px",borderRadius:20}}>✨ IA</span>}
                            </div>
                              <div style={{fontSize:10,color:C.faint}}>Script {idx+1} de {liList.length}</div>
                            </div>
                          </div>
                          <CopyBtn text={txt}/>
                        </div>
                        <div style={{background:C.sidebar,borderRadius:8,padding:12,fontSize:12,color:C.dim,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{txt}</div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {tab==="email"&&(!sel.email&&(!sel.emails||sel.emails.length===0)?(
              <div style={{...card({padding:24}),textAlign:"center",borderLeft:"3px solid #F8717166"}}>
                <div style={{fontSize:28,marginBottom:10}}>📭</div>
                <div style={{fontSize:14,fontWeight:700,color:"#F87171",marginBottom:6}}>E-mail não disponível</div>
                <div style={{fontSize:12,color:C.muted}}>Este lead não possui e-mail cadastrado.<br/>Adicione o e-mail no CRM para habilitar esta opção.</div>
              </div>
            ):emList.map((t,idx)=>{
              const subj = typeof t.subject==="function" ? t.subject(sel,profile||{}) : (t.subject||"");
              const body_ = typeof t.body==="function" ? t.body(sel,profile||{}) : (t.body||"");
              return (
                <div key={t.id} style={{...card({marginBottom:10}),borderLeft:aiData?"3px solid #7C3AED33":"3px solid #60A5FA33"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.text}}>✉️ {t.label}</span>
                      {aiData&&<span style={{fontSize:9,color:"#A78BFA",fontWeight:700,background:"rgba(124,58,237,0.15)",padding:"1px 6px",borderRadius:20}}>✨ IA</span>}
                    </div>
                    <CopyBtn text={"Assunto: "+subj+"\n\n"+body_}/>
                    <ContactPicker lead={sel} type="email" onSelect={(emailAddr)=>{
                      const mailto = "mailto:"+emailAddr+"?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(body_);
                      const a = document.createElement("a"); a.href = mailto;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }}>
                    <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#2563EB,#1D4ED8)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      ✉️ Abrir E-mail
                    </button>
                    </ContactPicker>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8,background:C.sidebar,padding:"6px 10px",borderRadius:6}}>📌 {subj}</div>
                  <div style={{background:C.sidebar,borderRadius:8,padding:"10px 12px",fontSize:12,color:"#C8DFF0",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{body_}</div>
                </div>
              );
            }))}
          </div>
        )}
      </div>
    </div>
  );
}



// ─── WHATSAPP SENDER ──────────────────────────────────────────────────────────
function WhatsappSender({leads,profile,webhook}) {
  // webhook is now managed by Owner panel - received as prop
  const [sel,setSel]=useState(leads[0]||null);
  const [ti,setTi]=useState(0);
  const [selStageWA,setSelStageWA]=useState("Novo cliente");
  const [sending,setSending]=useState({});
  const [sent,setSent]=useState({});
  const [testResult,setTestResult]=useState(null);
  useEffect(()=>{if(leads.length&&!sel)setSel(leads[0]);},[leads]);
  useEffect(()=>{if(sel?.status&&FUNIL_STAGES_MSGS.includes(sel.status))setSelStageWA(sel.status);},[sel]);
  const waTemplates=getTemplates("whatsapp",selStageWA);
  const t=waTemplates[ti]||waTemplates[0];
  const payload=(l)=>({lead_id:l.id,lead_name:l.name,company:l.company,phone:l.phone,channel:"whatsapp",template:t.label,message:t.text(l,profile),timestamp:new Date().toISOString(),source:profile.companyName||"Pipe.TM"});
  const openWA=(l,tmpl,phoneOverride)=>{
    const msg = tmpl.text(l,profile);
    const rawPhone = ((phoneOverride||l.phones?.[0]||l.phone||"")).replace(/\D/g,"");
    const phone = rawPhone.startsWith("55") ? rawPhone : rawPhone.length>=10 ? "55"+rawPhone : "";
    const waUrl = phone
      ? "https://api.whatsapp.com/send?phone="+phone+"&text="+encodeURIComponent(msg)
      : "https://api.whatsapp.com/send?text="+encodeURIComponent(msg);
    const a = document.createElement("a");
    a.href = waUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    const k=l.id+"-"+tmpl.id;
    setSent(s=>({...s,[k]:true}));
    setTimeout(()=>setSent(s=>({...s,[k]:false})),4000);
  };
  const test=async()=>{setTestResult("testing");try{await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({test:true,source:profile.companyName||"Pipe.TM"}),mode:"no-cors"});setTestResult("ok");}catch{setTestResult("error");}setTimeout(()=>setTestResult(null),3000);};
  if(!leads.length) return <div style={{textAlign:"center",padding:60,color:C.muted}}><div style={{fontSize:36,marginBottom:10}}>📱</div><div style={{fontSize:16,fontWeight:600}}>Nenhum lead disponível</div></div>;
  return (
    <div>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Envio via WhatsApp</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:22}}>Configure o webhook e dispare mensagens automaticamente</div>
      <div style={{...card({marginBottom:20,padding:"12px 16px"}),borderLeft:("3px solid "+C.accent),display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:11,color:C.muted}}>🔗 Webhook configurado pelo Owner.</span>
        <span style={{fontSize:11,color:webhook&&webhook.includes("http")?"#4ADE80":"#FBBF24",fontWeight:600}}>{webhook&&webhook.includes("http")?"● Conectado":"⚠️ Não configurado"}</span>
        {sel&&<div style={{marginLeft:"auto",fontSize:10,color:C.faint}}>{sel.name} · {sel.phone}</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"240px 1fr",gap:20}}>
        <div style={card({padding:0,overflow:"hidden"})}>
          <div style={{padding:"10px 14px",borderBottom:("1px solid "+C.border),fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>Leads</div>
          <div style={{maxHeight:420,overflowY:"auto"}}>
            {leads.map(l=><div key={l.id} onClick={()=>setSel(l)} style={{padding:"10px 14px",borderBottom:("1px solid "+C.panel),cursor:"pointer",background:sel?.id===l.id?"rgba(37,211,102,0.08)":"transparent",borderLeft:sel?.id===l.id?"3px solid #25D366":"3px solid transparent"}}><div style={{fontSize:12,fontWeight:600,color:C.text}}>{l.name}</div><div style={{fontSize:10,color:C.muted}}>{l.phone}</div><span style={pill(l.status)}>{l.status}</span></div>)}
          </div>
        </div>
        {sel&&(
          <div>
            <div style={{...card({padding:"12px 16px",marginBottom:14}),display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#25D366,#128C7E)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📱</div>
              <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{sel.name}</div><div style={{fontSize:11,color:C.muted}}>{sel.phone} · {sel.company}</div></div>
            </div>
            {waTemplates.map((tmpl,i)=>{const k=sel.id+"-"+tmpl.id;const isSent=sent[k];const isSending=sending[k];return(
              <div key={tmpl.id} onClick={()=>setTi(i)} style={{...card({padding:14,cursor:"pointer",marginBottom:10}),border:ti===i?"1px solid #25D366":undefined,background:ti===i?"rgba(37,211,102,0.06)":C.panel}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:ti===i?10:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text}}>{tmpl.icon} {tmpl.label}</div>
                  <div style={{display:"flex",gap:8}}>
                    <CopyBtn text={(typeof tmpl.text==="function"?tmpl.text(sel,profile||{}):tmpl.text||"")}/>
                    <ContactPicker lead={sel} type="phone" onSelect={(ph)=>{openWA(sel,tmpl,ph);}}><button onClick={e=>{e.preventDefault();}} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:"none",background:isSent===true?"rgba(74,222,128,0.15)":"linear-gradient(135deg,#25D366,#128C7E)",color:isSent===true?"#4ADE80":"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      <Icon d={isSent===true?IC.check:IC.send} size={12} color="currentColor"/>{isSent===true?"✅ Aberto!":"📲 Enviar"}
                    </button></ContactPicker>
                  </div>
                </div>
                {ti===i&&<div style={{background:C.sidebar,borderRadius:8,padding:"8px 10px",fontSize:11,color:"#C8DFF0",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{typeof tmpl.text==="function"?tmpl.text(sel,profile||{}):tmpl.text||""}</div>}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ACIONAMENTO MODAL ────────────────────────────────────────────────────────
function AcionamentoModal({lead,onUpdate,onClose,currentUser=null}) {
  const [tipo,setTipo]=useState("WhatsApp");
  const [res,setRes]=useState("Sem resposta");
  const [novoStatus,setNovoStatus]=useState(lead.status);
  const [obs,setObs]=useState("");
  const [done,setDone]=useState(false);
  const save=()=>{
    const now=new Date();
    const dh=now.toLocaleDateString("pt-BR")+" "+now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    const entry=`[${dh}] ${tipo} → ${res}${obs?" | "+obs:""}`;
    onUpdate({...lead,status:novoStatus,cadence:[...lead.cadence,{day:lead.cadence.length+1,type:tipo,sent:true,resultado:res,obs,dataHora:dh,user_id:currentUser?.id||"local",user_name:currentUser?.name||"Usuário"}],notes:lead.notes?lead.notes+"\n"+entry:entry});
    setDone(true);setTimeout(()=>{setDone(false);onClose();},1200);
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,14,28,0.88)",backdropFilter:"blur(5px)"}} onClick={onClose}>
      <div style={{background:C.panel,border:("1px solid "+C.border),borderRadius:16,padding:28,width:520,maxWidth:"95vw",boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
          <div><div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:3}}>⚡ Registrar Acionamento</div><div style={{fontSize:12,color:C.muted}}>{lead.name} · {lead.company}</div></div>
          <button style={btnG} onClick={onClose}><Icon d={IC.x} size={14}/></button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          <div style={{flex:1,background:C.sidebar,borderRadius:8,padding:"7px 11px",fontSize:11,color:C.dim}}>📧 {lead.email}</div>
          <div style={{flex:1,background:C.sidebar,borderRadius:8,padding:"7px 11px",fontSize:11,color:C.dim}}>📱 {lead.phone}</div>
        </div>
        <div style={{marginBottom:16}}><div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:9}}>Canal</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ACION_TIPOS.map(t=><button key={t} onClick={()=>setTipo(t)} style={{padding:"5px 12px",borderRadius:20,border:("1px solid "+tipo===t?C.accent:C.border),background:tipo===t?(C.accent+"18"):"transparent",color:tipo===t?C.accent:C.dim,fontSize:11,fontWeight:600,cursor:"pointer"}}>{{WhatsApp:"📱","E-mail":"✉️","Ligação":"📞",LinkedIn:"💼","Visita Presencial":"🏢","Indicação":"⭐"}[t]} {t}</button>)}</div></div>
        <div style={{marginBottom:16}}><div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:9}}>Resultado</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ACION_RES.map(r=>{const isOk=r.includes("interesse")&&!r.includes("sem")||r.includes("reunião")||r.includes("proposta");const isNeg=r.includes("sem interesse")||r.includes("errado")||r.includes("postal");const cor=res===r?(isOk?"#4ADE80":isNeg?"#F87171":"#FBBF24"):C.dim;return <button key={r} onClick={()=>setRes(r)} style={{padding:"5px 10px",borderRadius:20,border:("1px solid "+res===r?cor:C.border),background:res===r?(isOk?"rgba(74,222,128,0.12)":isNeg?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)"):"transparent",color:cor,fontSize:11,fontWeight:600,cursor:"pointer"}}>{r.includes("interesse")&&!r.includes("sem")?"✅":r.includes("sem interesse")?"❌":r.includes("reunião")?"📅":r.includes("proposta")?"📄":"🔔"} {r}</button>;})}          </div></div>
        <div style={{marginBottom:16,background:C.sidebar,borderRadius:12,padding:14,border:("1px solid "+C.border)}}>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>🔄 Atualizar Status <span style={{color:C.faint,textTransform:"none",letterSpacing:0,fontWeight:400,fontSize:10}}>· atual: <span style={{color:getStatusColor(lead.status)}}>{lead.status}</span></span></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{getStatusList().map(s=>{const c=getStatusColor(s);const a=novoStatus===s;return <button key={s} onClick={()=>setNovoStatus(s)} style={{padding:"7px 14px",borderRadius:20,border:("2px solid "+a?c:C.border),background:a?(c+"22"):"transparent",color:a?c:C.dim,fontSize:12,fontWeight:a?800:500,cursor:"pointer",boxShadow:a?`0 0 8px ${c}33`:"none"}}>{a?"● ":""}{s}</button>;})}</div>
        </div>
        <div style={{marginBottom:20}}><label style={lbl}>Observação (opcional)</label><textarea style={{...inp,minHeight:56,resize:"vertical"}} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex: Cliente pediu retorno na próxima semana..."/></div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={btnG} onClick={onClose}>Cancelar</button>
          <button style={{...btnP,minWidth:160,justifyContent:"center"}} onClick={save}>{done?"✅ Registrado!":<><Icon d={IC.check} size={14} color="#fff"/>Salvar Acionamento</>}</button>
        </div>
      </div>
    </div>
  );
}

// ─── CRM ─────────────────────────────────────────────────────────────────────
function CRM({leads,onUpdateLead,onDeleteLead,currentUser=null}) {
  const [filter,setFilter]=useState("Todos");
  const [cadenceLead,setCadenceLead] = useState(null);
  const [search,setSearch]=useState("");
  const [sortBy,setSortBy]=useState("score");
  const [prioFilter,setPrioFilter]=useState("Todas");
  const [expanded,setExpanded]=useState(null);
  const [acionando,setAcionando]=useState(null);
  const [detailId,setDetailId]=useState(null);
    const [newNote,setNewNote]=useState("");

  const filtered=leads
    .filter(l=>filter==="Todos"||l.status===filter)
    .filter(l=>prioFilter==="Todas"||l.priority===prioFilter)
    .filter(l=>!search||l.name.toLowerCase().includes(search.toLowerCase())||l.company.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>sortBy==="score"?b.score-a.score:sortBy==="name"?a.name.localeCompare(b.name):new Date(b.createdAt)-new Date(a.createdAt));

  const handleNote=(lead)=>{if(!newNote.trim())return;onUpdateLead({...lead,notes:lead.notes?lead.notes+"\n→ "+newNote:"→ "+newNote});setNewNote("");};

  const exportCSV=()=>{
    exportLeadsToCSV(leads,"crm_pipe_tm_"+new Date().toISOString().split("T")[0]);
  };

  const leadAcionando=leads.find(l=>l.id===acionando);
  const th={textAlign:"left",padding:"9px 14px",fontSize:10,color:C.muted,letterSpacing:1.2,textTransform:"uppercase",borderBottom:("1px solid "+C.border),fontWeight:700};
  const td={padding:"11px 14px",fontSize:12,color:"#C8DFF0",borderBottom:("1px solid "+C.panel),verticalAlign:"middle"};

  return (
    <div>
      {acionando&&leadAcionando&&<AcionamentoModal lead={leadAcionando} onUpdate={l=>{onUpdateLead(l);}} onClose={()=>setAcionando(null)}/>}
      {detailId&&leads.find(l=>l.id===detailId)&&<LeadDetailModal lead={leads.find(l=>l.id===detailId)} onClose={()=>setDetailId(null)} onUpdate={onUpdateLead} onAcionar={(id)=>{setDetailId(null);setAcionando(id);}}/>}
      
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div><div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:2}}>Acompanhamento de Leads</div><div style={{fontSize:12,color:C.muted}}>{leads.length} leads · {filtered.length} exibidos · clique no status para alterar · clique na linha para expandir</div></div>
        <button style={btnG} onClick={exportCSV}><Icon d={IC.export} size={14}/>Exportar CSV</button>
      </div>
      <div style={{...card({marginBottom:14,padding:12}),display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <input style={{...inp,flex:1,minWidth:180}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar por nome ou empresa..."/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["Todos",...getStatusList()].map(s=>{const c=getStatusColor(s);const a=filter===s;return <button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 11px",borderRadius:20,border:("1px solid "+a?(c||C.accent):C.border),background:a?(c||C.accent+"18"):"transparent",color:a?(c||C.accent):C.dim,fontSize:11,fontWeight:a?700:500,cursor:"pointer"}}>{s}{s!=="Todos"&&<span style={{marginLeft:5,opacity:0.7}}>{leads.filter(l=>l.status===s).length}</span>}</button>;})}
        </div>
        <div style={{display:"flex",gap:5}}>
          {["Todas","Alta","Média","Baixa"].map(p=>{const c=p==="Alta"?"#F87171":p==="Média"?"#FBBF24":p==="Baixa"?"#4ADE80":C.dim;const a=prioFilter===p;return <button key={p} onClick={()=>setPrioFilter(p)} style={{padding:"4px 10px",borderRadius:20,border:("1px solid "+a?c:C.border),background:a?(c+"18"):"transparent",color:a?c:C.dim,fontSize:10,fontWeight:a?700:500,cursor:"pointer"}}>{p==="Todas"?"★ Todas":p}</button>;})}
        </div>
        <select style={{...inp,width:"auto",fontSize:11}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="score">Score ↓</option><option value="name">Nome A-Z</option><option value="date">Mais Recentes</option>
        </select>
      </div>
      <div style={card({padding:0,overflow:"hidden"})}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:C.sidebar}}>{["Lead","Empresa","Canal","Score","Melhor Horário","Status","Acionamentos","Ações"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={7} style={{...td,textAlign:"center",padding:32,color:C.muted}}>Nenhum lead encontrado</td></tr>}
            {filtered.map(l=>(
              <>
                <tr key={l.id} onClick={()=>setExpanded(expanded===l.id?null:l.id)} style={{background:expanded===l.id?"rgba(0,180,216,0.06)":"transparent",cursor:"pointer",transition:"background 0.12s"}} onMouseEnter={e=>{if(expanded!==l.id)e.currentTarget.style.background="rgba(255,255,255,0.02)";}} onMouseLeave={e=>{if(expanded!==l.id)e.currentTarget.style.background="transparent";}}>
                  <td style={td}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:8,background:("linear-gradient(135deg,#1E3A5F,#0F2548)"),border:("1px solid "+C.border),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.accent,flexShrink:0}}>{l.name[0]}</div><div><div style={{fontWeight:600,color:C.text,fontSize:12}}>{l.name}</div><div style={{fontSize:10,color:C.muted}}>{l.role}</div></div></div></td>
                  <td style={td}><div style={{fontSize:12}}>{l.company}</div><div style={{fontSize:10,color:C.muted}}>📍 {l.city}</div>{l.business_hours&&(()=>{const open=isOpenNow(l.business_hours);return <div style={{fontSize:9,fontWeight:700,color:open===true?"#4ADE80":open===false?"#F87171":"#6B7280",marginTop:2}}>{open===true?"🟢 Aberta agora":open===false?"🔴 Fechada":""}</div>;})()}<div style={{marginTop:4}}><LeadFunnelTag lead={l} compact={true}/></div></td>
                  <td style={td}><span style={{fontSize:10,fontWeight:700,color:C.accent,background:(C.accent+"14"),border:("1px solid "+C.accent+"33"),padding:"2px 8px",borderRadius:20}}>{l.channel}</span></td>
                  <td style={td}><span style={{fontSize:11,fontWeight:800,color:l.score>=70?"#4ADE80":l.score>=40?"#FBBF24":"#F87171",background:l.score>=70?"rgba(74,222,128,0.12)":"rgba(251,191,36,0.12)",padding:"3px 9px",borderRadius:20,border:("1px solid "+l.score>=70?"#4ADE8044":"#FBBF2444")}}>{l.score}</span></td>
                  <td style={{...td,maxWidth:160}}>
                    {l.bestTime?(
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {(l.bestTime.slots||[]).map((s,i)=>(
                            <span key={i} style={{fontSize:10,fontWeight:700,color:C.accent,background:(C.accent+"14"),border:("1px solid "+C.accent+"33"),padding:"2px 7px",borderRadius:12,whiteSpace:"nowrap"}}>⏰ {s}</span>
                          ))}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          {(l.bestTime.days||[]).map((d,i)=>(
                            <span key={i} style={{fontSize:9,color:C.dim,background:C.panel,border:("1px solid "+C.border),padding:"1px 5px",borderRadius:4}}>{d}</span>
                          ))}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontSize:9,color:C.faint}}>via</span>
                          <span style={{fontSize:9,fontWeight:700,color:{WhatsApp:"#25D366","E-mail":"#60A5FA",LinkedIn:"#0A66C2",Ligação:"#FBBF24"}[l.bestTime.bestChannel]||C.accent}}>{l.bestTime.bestChannel}</span>
                          <span style={{fontSize:9,color:l.bestTime.confidence==="Alta"?"#4ADE80":l.bestTime.confidence==="Média"?"#FBBF24":"#F87171",marginLeft:3}}>● {l.bestTime.confidence}</span>
                        </div>
                      </div>
                    ):(
                      <span style={{fontSize:11,color:C.faint}}>-</span>
                    )}
                  </td>
                  <td style={{...td}} onClick={e=>e.stopPropagation()}>
                    {/* STATUS DROPDOWN SUSPENSO */}
                    <StatusDropdown lead={l} onUpdate={onUpdateLead}/>
                  </td>
                  <td style={td}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{display:"flex",gap:3}}>{l.cadence.slice(-5).map((c,i)=><div key={i} title={`${c.type}: ${c.resultado||""}`} style={{width:8,height:8,borderRadius:"50%",background:c.resultado?.includes("interesse")&&!c.resultado?.includes("sem")?"#4ADE80":c.resultado?.includes("reunião")||c.resultado?.includes("proposta")?C.accent:c.resultado?.includes("sem interesse")||c.resultado?.includes("errado")?"#F87171":"#FBBF24"}}/>)}</div><span style={{fontSize:11,color:C.muted}}>{l.cadence.length}x</span></div></td>
                  <td style={td} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setDetailId(l.id)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:8,border:("1px solid "+C.border),background:"transparent",color:C.dim,fontSize:11,fontWeight:600,cursor:"pointer"}}><Icon d={IC.eye} size={12} color={C.dim}/>Ver</button>
                    <button onClick={()=>setAcionando(l.id)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:("1px solid "+C.accent+"33"),background:(C.accent+"10"),color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer"}}><Icon d={IC.zap} size={12} color={C.accent}/>Acionar</button>
                    <button onClick={()=>setCadenceLead(l)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:8,border:"1px solid #FBBF2433",background:"rgba(251,191,36,0.08)",color:"#FBBF24",fontSize:11,fontWeight:600,cursor:"pointer"}}>📅</button>
                    <button style={btnD} onClick={()=>onDeleteLead(l.id)}><Icon d={IC.trash} size={12}/></button>
                  </div></td>
                </tr>
                {expanded===l.id&&(
                  <tr key={l.id+"-exp"}>
                    <td colSpan={7} style={{padding:0,borderBottom:("2px solid "+C.accent+"22")}}>
                      <div style={{background:"rgba(0,180,216,0.04)",padding:"18px 20px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr 1.4fr",gap:18}}>
                          <div>
                            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>📇 Contato</div>
                            <div style={{background:C.sidebar,borderRadius:10,padding:12}}>
                              <div style={{fontSize:12,color:"#C8DFF0",marginBottom:6}}>📧 {l.email}</div>
                              <div style={{fontSize:12,color:"#C8DFF0",marginBottom:6}}>📱 {l.phone}</div>
                              <div style={{fontSize:12,color:"#C8DFF0",marginBottom:10}}>🏙️ {l.city}</div>
                              <div style={{borderTop:("1px solid "+C.border),paddingTop:10}}>
                                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Alterar Status</div>
                                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                  {getStatusList().map(s=>{const c=getStatusColor(s);const a=l.status===s;return <button key={s} onClick={e=>{e.stopPropagation();onUpdateLead({...l,status:s});}} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,border:("1px solid "+a?c:C.border),background:a?(c+"18"):"transparent",color:a?c:C.dim,fontSize:11,fontWeight:a?700:400,cursor:"pointer"}}><div style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>{s}{a&&<span style={{marginLeft:"auto",fontSize:10}}>✓ atual</span>}</button>;})}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>⚡ Histórico ({l.cadence.length})</div>
                            <div style={{background:C.sidebar,borderRadius:10,padding:12,maxHeight:200,overflowY:"auto"}}>
                              {l.cadence.length===0?<div style={{fontSize:11,color:C.faint,textAlign:"center",padding:"16px 0"}}>Nenhum acionamento</div>:[...l.cadence].reverse().map((c,i)=>{const isOk=c.resultado?.includes("interesse")&&!c.resultado?.includes("sem")||c.resultado?.includes("reunião")||c.resultado?.includes("proposta");const isNeg=c.resultado?.includes("sem interesse")||c.resultado?.includes("errado")||c.resultado?.includes("postal");return <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-start"}}><div style={{width:6,height:6,borderRadius:"50%",background:isOk?"#4ADE80":isNeg?"#F87171":"#FBBF24",marginTop:4,flexShrink:0}}/><div><div style={{fontSize:11,color:C.text,fontWeight:600}}>{c.type}</div><div style={{fontSize:10,color:C.muted}}>{c.resultado}</div>{c.obs&&<div style={{fontSize:10,color:C.dim,fontStyle:"italic"}}>{c.obs}</div>}{c.dataHora&&<div style={{fontSize:9,color:C.faint}}>🕐 {c.dataHora}{c.user_name?" · "+c.user_name:""}</div>}</div></div>;})}
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>📝 Notas</div>
                            <div style={{background:C.sidebar,borderRadius:10,padding:12,marginBottom:10,minHeight:90,maxHeight:130,overflowY:"auto"}}>
                              {l.notes?l.notes.split("\n").map((line,i)=><div key={i} style={{fontSize:11,color:"#C8DFF0",marginBottom:3,lineHeight:1.5}}>{line}</div>):<div style={{fontSize:11,color:C.faint}}>Sem notas.</div>}
                            </div>
                            <div style={{display:"flex",gap:8}} onClick={e=>e.stopPropagation()}>
                              <input style={{...inp,fontSize:11,padding:"6px 10px"}} placeholder="Adicionar nota..." value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleNote(l)}/>
                              <button style={{...btnP,padding:"6px 12px",fontSize:12}} onClick={()=>handleNote(l)}>+</button>
                            </div>
                          </div>
                        </div>
                        <div style={{marginTop:14,paddingTop:12,borderTop:("1px solid "+C.border),display:"flex",justifyContent:"flex-end"}}>
                          <button style={btnP} onClick={e=>{e.stopPropagation();setAcionando(l.id);}}><Icon d={IC.zap} size={14} color="#fff"/>Registrar Acionamento</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



// ─── OWNER PANEL ─────────────────────────────────────────────────────────────
const MODULE_META = {
  // ── Principal ────────────────────────────────────
  dashboard: { label:"Dashboard",           icon:"📊", group:"Principal",    desc:"Visão geral, KPIs e metas" },
  profile:   { label:"Perfil da Empresa",   icon:"🏢", group:"Principal",    desc:"Dados da empresa para IA" },
  search:    { label:"Gerar Leads",   icon:"🔍", group:"Principal",    desc:"Geração de leads por IA" },
  addlead:   { label:"Cadastrar Empresa",   icon:"➕", group:"Principal",    desc:"Cadastro manual de leads" },
  // ── Comunicação ──────────────────────────────────
  messages:  { label:"Mensagens",           icon:"💬", group:"Comunicação",  desc:"Templates de email e WhatsApp" },
  whatsapp:  { label:"Envio WhatsApp",      icon:"📱", group:"Comunicação",  desc:"Disparo via WhatsApp" },
  // ── Gestão ───────────────────────────────────────
  crm:       { label:"CRM / Acompanhamento",icon:"📋", group:"Gestão",       desc:"Gestão de leads e pipeline" },
  funil:     { label:"Funil de Vendas",     icon:"🏆", group:"Gestão",       desc:"Kanban e acionamentos" },
  metas:     { label:"Metas",               icon:"🎯", group:"Gestão",       desc:"Metas por dia, semana e mês" },
  settings:  { label:"Configurações",       icon:"⚙️", group:"Gestão",       desc:"Preferências do usuário" },
  // ── Administração ────────────────────────────────
  reativacao: { label:"Reativacao",         icon:"🔄", group:"Módulos",       desc:"Leads que pararam de responder" },
  suporte:    { label:"Suporte",             icon:"🎧", group:"Módulos",       desc:"Atendimento e suporte ao cliente" },
  cadencia:   { label:"Cadencias",          icon:"📅", group:"Gestão",       desc:"Sequencias automatizadas de acionamento" },
  receptivo:  { label:"Receptivo",           icon:"📥", group:"Módulos",       desc:"Leads que chegam até você" },
  pos_venda:  { label:"Pos-venda",            icon:"🤝", group:"Módulos",       desc:"Gestão de clientes ativos" },
  master:    { label:"Controle de Acesso",  icon:"🛡️", group:"Administração",desc:"Gestão de usuários e permissões" },
  owner:     { label:"Painel Owner",        icon:"⚡", group:"Administração",desc:"Configurações avançadas e limites" },
};



// ─── GOALS CONFIG - cadastro de metas (Master/Owner) ─────────────────────────
function GoalsConfig({ users }) {
  const safeUsers = users||[];
  const [scope, setScope] = useState("company");
  const [selUser, setSelUser] = useState(safeUsers.filter(u=>u.role!=="owner"&&u.status!=="cancelado")[0]?.id||"");
  const [saved, setSaved] = useState(false);
  const scopeId = scope==="company" ? "company" : selUser;

  // form: { dia:{leads,conversa,reuniao,fechamento}, semana:{...}, mes:{...} }
  const [form, setForm] = useState(()=>{
    const g = getGoals2(scope==="company"?"company":selUser);
    return JSON.parse(JSON.stringify(g));
  });

  const loadForm = (sid) => {
    const g = getGoals2(sid);
    setForm(JSON.parse(JSON.stringify(g)));
  };

  const setVal = (period, ind, val) => {
    setForm(f=>({...f,[period]:{...f[period],[ind]:val}}));
  };

  const handleSave = () => {
    PERIODS.forEach(period=>{
      GOAL_INDICATORS.forEach(ind=>{
        setGoal2(scopeId, period, ind.id, form[period][ind.id]);
      });
    });
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  const activeUsers = safeUsers.filter(u=>u.status!=="cancelado");

  return (
    <div>
      <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>🎯 Cadastro de Metas</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Defina metas por período - cada período tem seu próprio valor independente.</div>

      {/* Scope selector */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div>
          <div style={lbl}>Âmbito</div>
          <div style={{display:"flex",border:("1px solid "+C.border),borderRadius:8,overflow:"hidden"}}>
            {[["company","🏢 Empresa"],["user","👤 Usuário"]].map(([v,l])=>(
              <button key={v} onClick={()=>{
                setScope(v);
                const sid = v==="company"?"company":selUser;
                loadForm(sid);
              }} style={{padding:"7px 16px",border:"none",background:scope===v?C.accent:"transparent",color:scope===v?"#fff":C.muted,fontSize:12,fontWeight:scope===v?700:400,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
        </div>
        {scope==="user"&&(
          <div>
            <div style={lbl}>Usuário</div>
            <select value={selUser} onChange={e=>{setSelUser(e.target.value);loadForm(e.target.value);}}
              style={{...inp,width:"auto",minWidth:160}}>
              {activeUsers.map(u=><option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Period columns */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}} className="mob-grid-1">
        {PERIODS.map(period=>(
          <div key={period} style={{...card({padding:16}),border:("1px solid "+C.accent+"33")}}>
            <div style={{fontSize:13,fontWeight:800,color:C.accent,marginBottom:14,textAlign:"center",letterSpacing:1,textTransform:"uppercase"}}>{PERIOD_LABELS[period]}</div>
            {GOAL_INDICATORS.map(ind=>{
              const val = form[period]?.[ind.id]||"";
              const empty = !val||val==="0"||val==="";
              return (
                <div key={ind.id} style={{marginBottom:14,paddingBottom:14,borderBottom:("1px solid "+C.border)}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <span style={{fontSize:16}}>{ind.icon}</span>
                    <span style={{fontSize:11,fontWeight:700,color:C.text}}>{ind.label}</span>
                  </div>
                  <input type="number" min="0" value={val}
                    onChange={e=>setVal(period,ind.id,e.target.value)}
                    placeholder="0"
                    style={{...inp,fontSize:22,fontWeight:900,color:empty?"#6B7280":ind.color,textAlign:"center",padding:"8px"}}/>
                  {empty&&<div style={{fontSize:9,color:C.faint,marginTop:3,textAlign:"center"}}>não definido</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Example */}
      <div style={{padding:"10px 14px",background:(C.accent+"08"),border:("1px solid "+C.accent+"22"),borderRadius:8,marginBottom:20,fontSize:11,color:C.muted}}>
        💡 <strong style={{color:C.text}}>Exemplo:</strong> Dia = 5 leads · Semana = 25 leads · Mês = 100 leads - cada período tem sua própria meta independente.
      </div>

      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <button onClick={handleSave} style={{...btnP,padding:"11px 28px",fontSize:13}}>
          {saved?"✅ Metas salvas!":"💾 Salvar Metas"}
        </button>
        <button onClick={()=>{
          const empty={leads:"",conversa:"",reuniao:"",fechamento:""};
          setForm({dia:{...empty},semana:{...empty},mes:{...empty}});
        }} style={{...btnG,padding:"11px 18px",fontSize:12}}>🗑 Limpar</button>
        {saved&&<span style={{fontSize:12,color:"#4ADE80",fontWeight:700}}>✅ Salvo!</span>}
      </div>
    </div>
  );
}


// ─── GOAL BAR - barra de progresso reutilizável ─────────────────────────────
function GoalBar({ indicator, actual, goal, showMode }) {
  const pct = goal>0 ? Math.min(100, Math.round((actual/goal)*100)) : 0;
  const color = pct>=100?"#4ADE80":pct>=70?indicator.color:pct>=40?"#F59E0B":"#EF4444";
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:13}}>{indicator.icon}</span>
          <span style={{fontSize:11,fontWeight:600,color:C.text}}>{indicator.label}</span>
        </div>
        <span style={{fontSize:12,fontWeight:800,color}}>
          {showMode==="pct" ? (pct+"%") : (actual+(goal>0?(" / "+goal):""))}
        </span>
      </div>
      <div style={{height:6,background:C.border,borderRadius:8,overflow:"hidden"}}>
        <div style={{height:"100%",width:(pct+"%"),background:pct>=100?("linear-gradient(90deg,"+indicator.color+",#4ADE80)"):("linear-gradient(90deg,"+color+","+color+"88)"),borderRadius:8,transition:"width 0.6s ease"}}/>
      </div>
      {goal===0&&<div style={{fontSize:9,color:C.faint,marginTop:2}}>Meta não configurada</div>}
    </div>
  );
}

// ─── GOALS DASHBOARD - bloco de metas no Dashboard ───────────────────────────
function GoalsDashboard({ leads, users, currentUser }) {
  const [showMode, setShowMode] = useState("abs");
  const [view, setView] = useState("company");
  const safeUsers = users||[];

  const getActual = (period, indicator) => {
    const pl = filterLeadsByPeriod(leads, period);
    return computeProgress(leads, indicator, pl);
  };

  const periodCard = (period) => {
    const scopeId = view==="company"?"company":(currentUser?.id||"company");
    return (
      <div key={period} style={{...card({padding:16}),flex:1,minWidth:200}}>
        <div style={{fontSize:11,fontWeight:800,color:C.accent,letterSpacing:1,textTransform:"uppercase",marginBottom:12,textAlign:"center"}}>{PERIOD_LABELS[period]}</div>
        {GOAL_INDICATORS.map(ind=>(
          <GoalBar key={ind.id} indicator={ind}
            actual={getActual(period, ind.id)}
            goal={getGoalValue(scopeId, period, ind.id)}
            showMode={showMode}/>
        ))}
      </div>
    );
  };

  return (
    <div style={{...card({padding:20}),marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:14,fontWeight:800,color:C.text}}>🎯 Metas</div>
        <div style={{display:"flex",gap:6}}>
          <div style={{display:"flex",border:("1px solid "+C.border),borderRadius:6,overflow:"hidden"}}>
            {[["company","🏢"],["user","👤"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)}
                style={{padding:"4px 10px",border:"none",background:view===v?C.accent:"transparent",color:view===v?"#fff":C.muted,fontSize:11,cursor:"pointer",fontWeight:view===v?700:400}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",border:("1px solid "+C.border),borderRadius:6,overflow:"hidden"}}>
            {[["abs","123"],["pct","%"]].map(([v,l])=>(
              <button key={v} onClick={()=>setShowMode(v)}
                style={{padding:"4px 10px",border:"none",background:showMode===v?C.accent:"transparent",color:showMode===v?"#fff":C.muted,fontSize:11,cursor:"pointer",fontWeight:showMode===v?700:400}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 períodos abertos lado a lado */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {PERIODS.map(p=>periodCard(p))}
      </div>

      {/* Visão por usuário */}
      {view==="user"&&(
        <div style={{marginTop:16,paddingTop:16,borderTop:("1px solid "+C.border)}}>
          <div style={{fontSize:10,color:C.faint,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>👤 Por Usuário</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
            {safeUsers.filter(u=>u.status!=="cancelado").map(u=>{
              const roleColor=u.role==="owner"?"#A855F7":u.role==="master"?"#F59E0B":C.accent;
              return (
                <div key={u.id} style={{...card({padding:12}),borderTop:("3px solid "+roleColor)}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:(roleColor+"22"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:roleColor}}>{u.name[0]}</div>
                    <div style={{fontSize:11,fontWeight:700,color:C.text}}>{u.name.split(" ")[0]}</div>
                  </div>
                  {PERIODS.map(period=>(
                    <div key={period} style={{marginBottom:8}}>
                      <div style={{fontSize:9,color:C.faint,marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{PERIOD_LABELS[period]}</div>
                      {GOAL_INDICATORS.map(ind=>(
                        <GoalBar key={ind.id} indicator={ind}
                          actual={getActual(period,ind.id)}
                          goal={getGoalValue(u.id,period,ind.id)}
                          showMode={showMode}/>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
// ─── LEAD FUNIL TAG - aparece em qualquer tela com o lead ────────────────────
function LeadFunnelTag({ lead, onAction, compact=false }) {
  const ls = getLeadStage(lead.id);
  if(!ls) return null;
  const stage = FUNIL_STAGES.find(s=>s.id===ls.stageId);
  if(!stage) return null;
  const daysIn = Math.floor((Date.now()-new Date(ls.enteredAt))/(1000*60*60*24));
  const pending = getPendingActions(lead);
  const overdue = pending.filter(a=>a.daysOverdue>0);
  return (
    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
      <span style={{fontSize:9,fontWeight:700,color:stage.color,background:(stage.color+"18"),border:("1px solid "+stage.color+"33"),padding:"2px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
        ● {stage.name}{!compact&&(" · "+daysIn+"d")}
      </span>
      <FunnelBell lead={lead} onAction={onAction}/>
      {overdue.length>0&&<span style={{fontSize:9,color:"#F87171",fontWeight:700}}>⚠️</span>}
    </div>
  );
}

// ─── FUNIL CONFIG COMPONENT ──────────────────────────────────────────────────
function FunnelConfig() {
  const [stages, setStages] = useState(()=>JSON.parse(JSON.stringify(FUNIL_STAGES)));
  const [selStage, setSelStage] = useState(stages[0]?.id||null);
  const [editingStage, setEditingStage] = useState(null); // {id,name,color,maxDays}
  const [editingAction, setEditingAction] = useState(null); // {stageId, action}
  const [newActionType, setNewActionType] = useState(ACTION_TYPES[0].id);
  const [customTypes, setCustomTypes] = useState([]);
  const [saved, setSaved] = useState(false);
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#3B82F6");

  const allTypes = [...ACTION_TYPES, ...customTypes];
  const stage = stages.find(s=>s.id===selStage);

  const save = () => {
    FUNIL_STAGES.length = 0;
    stages.forEach(s=>FUNIL_STAGES.push(s));
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const addStage = () => {
    if(!newStageName.trim()) return;
    const ns = {id:"s"+Date.now(),name:newStageName.trim(),color:newStageColor,maxDays:7,order:stages.length,actions:[]};
    setStages(ss=>[...ss,ns]);
    setSelStage(ns.id);
    setShowNewStage(false);
    setNewStageName("");
  };

  const deleteStage = (sid) => {
    setStages(ss=>ss.filter(s=>s.id!==sid));
    setSelStage(stages.find(s=>s.id!==sid)?.id||null);
  };

  const updateStage = (sid, patch) => setStages(ss=>ss.map(s=>s.id===sid?{...s,...patch}:s));

  const moveStage = (sid, dir) => {
    const idx = stages.findIndex(s=>s.id===sid);
    const newIdx = idx+dir;
    if(newIdx<0||newIdx>=stages.length) return;
    const arr=[...stages];
    [arr[idx],arr[newIdx]]=[arr[newIdx],arr[idx]];
    setStages(arr.map((s,i)=>({...s,order:i})));
  };

  const addAction = (sid) => {
    const at = allTypes.find(t=>t.id===newActionType)||allTypes[0];
    const na = {id:"a"+Date.now(), day:1, type:at.id, label:at.label, msg:""};
    setStages(ss=>ss.map(s=>s.id===sid?{...s,actions:[...s.actions,na]}:s));
    setEditingAction({stageId:sid, actionId:na.id});
  };

  const updateAction = (sid, aid, patch) => {
    setStages(ss=>ss.map(s=>s.id===sid?{...s,actions:s.actions.map(a=>a.id===aid?{...a,...patch}:a)}:s));
  };

  const deleteAction = (sid, aid) => {
    setStages(ss=>ss.map(s=>s.id===sid?{...s,actions:s.actions.filter(a=>a.id!==aid)}:s));
    if(editingAction?.actionId===aid) setEditingAction(null);
  };

  const addCustomType = () => {
    const name = prompt("Nome do novo tipo de acionamento:");
    if(!name?.trim()) return;
    setCustomTypes(ct=>[...ct,{id:"c"+Date.now(),label:name.trim(),icon:"⚡",color:"#6B7280"}]);
  };

  const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EC4899","#EF4444","#6366F1","#14B8A6","#F97316","#06B6D4"];

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>🏆 Funil de Vendas</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Configure etapas, prazos e sequências de acionamento</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowNewStage(true)} style={{...btnG,padding:"7px 14px",fontSize:12}}>+ Etapa</button>
          <button onClick={save} style={{...btnP,padding:"7px 14px",fontSize:12}}>{saved?"✅ Salvo!":"💾 Salvar Funil"}</button>
        </div>
      </div>

      {/* New stage form */}
      {showNewStage&&(
        <div style={{...card({padding:16}),marginBottom:16,border:("1px solid "+C.accent),display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <input value={newStageName} onChange={e=>setNewStageName(e.target.value)} placeholder="Nome da etapa..." style={{...inp,flex:1,minWidth:160}} onKeyDown={e=>e.key==="Enter"&&addStage()}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {COLORS.map(col=>(
              <div key={col} onClick={()=>setNewStageColor(col)} style={{width:22,height:22,borderRadius:"50%",background:col,cursor:"pointer",border:newStageColor===col?"3px solid #fff":"2px solid transparent",boxSizing:"border-box"}}/>
            ))}
          </div>
          <button onClick={addStage} style={{...btnP,padding:"6px 12px",fontSize:12}}>Criar</button>
          <button onClick={()=>setShowNewStage(false)} style={{...btnG,padding:"6px 12px",fontSize:12}}>Cancelar</button>
        </div>
      )}

      {/* Pipeline visual */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:20}}>
        {stages.map((s,idx)=>(
          <div key={s.id} onClick={()=>setSelStage(s.id)}
            style={{minWidth:130,padding:"10px 12px",borderRadius:10,cursor:"pointer",background:selStage===s.id?(s.color+"22"):C.panel,border:("2px solid "+selStage===s.id?s.color:C.border),transition:"all 0.2s",position:"relative"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:s.color,marginBottom:6}}/>
            <div style={{fontSize:12,fontWeight:700,color:selStage===s.id?s.color:C.text,marginBottom:4,lineHeight:1.3}}>{s.name}</div>
            <div style={{fontSize:10,color:C.faint}}>⏱ {s.maxDays}d máx</div>
            <div style={{fontSize:10,color:C.faint}}>⚡ {s.actions.length} ação(ões)</div>
            <div style={{display:"flex",gap:3,marginTop:6}}>
              <button onClick={e=>{e.stopPropagation();moveStage(s.id,-1);}} disabled={idx===0} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:"1px 3px",fontSize:11,opacity:idx===0?0.3:1}}>◀</button>
              <button onClick={e=>{e.stopPropagation();moveStage(s.id,1);}} disabled={idx===stages.length-1} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:"1px 3px",fontSize:11,opacity:idx===stages.length-1?0.3:1}}>▶</button>
            </div>
          </div>
        ))}
      </div>

      {/* Stage detail editor */}
      {stage&&(
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:16}}>
          {/* Left: stage settings */}
          <div style={card({padding:16})}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:stage.color}}/>
              Configurar Etapa
            </div>
            <div style={{marginBottom:12}}>
              <div style={{...lbl}}>Nome</div>
              {editingStage===stage.id
                ? <input defaultValue={stage.name} onBlur={e=>updateStage(stage.id,{name:e.target.value})} style={{...inp,fontSize:13}} autoFocus/>
                : <div onClick={()=>setEditingStage(stage.id)} style={{fontSize:13,color:C.text,padding:"6px 10px",background:C.border+"44",borderRadius:6,cursor:"pointer"}}>{stage.name} ✏️</div>
              }
            </div>
            <div style={{marginBottom:12}}>
              <div style={{...lbl}}>Tempo máximo na etapa</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" min="1" max="90" value={stage.maxDays}
                  onChange={e=>updateStage(stage.id,{maxDays:parseInt(e.target.value)||1})}
                  style={{...inp,width:70,fontSize:13}}/>
                <span style={{fontSize:12,color:C.muted}}>dias</span>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{...lbl}}>Cor da etapa</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {COLORS.map(col=>(
                  <div key={col} onClick={()=>updateStage(stage.id,{color:col})}
                    style={{width:22,height:22,borderRadius:"50%",background:col,cursor:"pointer",border:stage.color===col?"3px solid #fff":"2px solid transparent",boxSizing:"border-box"}}/>
                ))}
              </div>
            </div>
            <button onClick={()=>deleteStage(stage.id)} style={{...btnD,width:"100%",fontSize:12,padding:"7px"}}>🗑 Excluir Etapa</button>
          </div>

          {/* Right: actions timeline */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>⚡ Sequência de Acionamentos</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <select value={newActionType} onChange={e=>setNewActionType(e.target.value)} style={{...inp,padding:"5px 8px",fontSize:11,width:"auto"}}>
                  {allTypes.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
                <button onClick={()=>addCustomType()} style={{...btnG,padding:"5px 10px",fontSize:11}}>+ Tipo</button>
                <button onClick={()=>addAction(stage.id)} style={{...btnP,padding:"5px 12px",fontSize:11}}>+ Ação</button>
              </div>
            </div>

            {stage.actions.length===0&&(
              <div style={{...card({padding:24}),textAlign:"center",color:C.muted,fontSize:13}}>
                Nenhuma ação configurada. Clique em <strong>+ Ação</strong> para começar.
              </div>
            )}

            {/* Timeline */}
            <div style={{position:"relative"}}>
              {stage.actions.slice().sort((a,b)=>a.day-b.day).map((action,idx)=>{
                const at = allTypes.find(t=>t.id===action.type)||allTypes[allTypes.length-1];
                const isEditing = editingAction?.stageId===stage.id && editingAction?.actionId===action.id;
                return (
                  <div key={action.id} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
                    {/* Day marker */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:52}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:(at.color+"22"),border:("2px solid "+at.color),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{at.icon}</div>
                      {idx<stage.actions.length-1&&<div style={{width:2,height:20,background:C.border,margin:"4px 0"}}/>}
                    </div>
                    {/* Action card */}
                    <div style={{...card({padding:12}),flex:1,border:isEditing?("1px solid "+at.color):undefined}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isEditing?10:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:at.color,background:(at.color+"18"),padding:"2px 8px",borderRadius:20}}>{at.icon} {at.label}</span>
                          <span style={{fontSize:10,color:C.faint}}>Dia {action.day}</span>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>setEditingAction(isEditing?null:{stageId:stage.id,actionId:action.id})} style={{background:"transparent",border:("1px solid "+C.border),borderRadius:5,padding:"3px 7px",cursor:"pointer",color:C.muted,fontSize:10}}>{isEditing?"✓ OK":"✏️"}</button>
                          <button onClick={()=>deleteAction(stage.id,action.id)} style={{background:"transparent",border:"1px solid rgba(248,113,113,0.3)",borderRadius:5,padding:"3px 7px",cursor:"pointer",color:"#F87171",fontSize:10}}>🗑</button>
                        </div>
                      </div>
                      {isEditing?(
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <div style={{flex:1,minWidth:120}}>
                              <div style={{...lbl}}>Dia do disparo</div>
                              <input type="number" min="0" max={stage.maxDays} value={action.day}
                                onChange={e=>updateAction(stage.id,action.id,{day:parseInt(e.target.value)||0})}
                                style={{...inp,fontSize:12}}/>
                            </div>
                            <div style={{flex:1,minWidth:120}}>
                              <div style={{...lbl}}>Tipo</div>
                              <select value={action.type} onChange={e=>updateAction(stage.id,action.id,{type:e.target.value,label:allTypes.find(t=>t.id===e.target.value)?.label||action.label})} style={{...inp,fontSize:12}}>
                                {allTypes.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                              </select>
                            </div>
                            <div style={{flex:1,minWidth:120}}>
                              <div style={{...lbl}}>Label</div>
                              <input value={action.label} onChange={e=>updateAction(stage.id,action.id,{label:e.target.value})} style={{...inp,fontSize:12}}/>
                            </div>
                          </div>
                          <div>
                            <div style={{...lbl}}>Mensagem / Roteiro</div>
                            <textarea value={action.msg} onChange={e=>updateAction(stage.id,action.id,{msg:e.target.value})}
                              rows={3} style={{...inp,fontSize:12,resize:"vertical",lineHeight:1.5}}
                              placeholder="Use {nome}, {empresa}, {telefone} como variáveis..."/>
                            <div style={{fontSize:10,color:C.faint,marginTop:3}}>Variáveis: {"{nome}"} {"{empresa}"} {"{telefone}"} {"{email}"}</div>
                          </div>
                        </div>
                      ):(
                        <div style={{fontSize:12,color:C.muted,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{action.msg||<span style={{color:C.faint,fontStyle:"italic"}}>Sem mensagem configurada</span>}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── FUNIL BELL - sino de acionamentos por lead ───────────────────────────────
function FunnelBell({ lead, onAction }) {
  const [open, setOpen] = useState(false);
  const pending = getPendingActions(lead);
  const overdue = pending.filter(a=>a.daysOverdue>0);
  const count = pending.length;
  if(count===0) return null;

  const ls = getLeadStage(lead.id);
  const stage = FUNIL_STAGES.find(s=>s.id===ls?.stageId);

  const doAction = (action) => {
    const at = ACTION_TYPES.find(t=>t.id===action.type)||ACTION_TYPES[ACTION_TYPES.length-1];
    const msg = (action.msg||"")
      .replace(/{nome}/g, lead.name||"")
      .replace(/{empresa}/g, lead.company||"")
      .replace(/{telefone}/g, lead.phone||"")
      .replace(/{email}/g, lead.email||"");

    if(action.type==="whatsapp"||action.type==="audio"){
      const raw=((lead.phones&&lead.phones[0])||lead.phone||"").replace(/\D/g,"");
      const phone=raw.startsWith("55")?raw:raw.length>=10?"55"+raw:"";
      const url=phone?`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`:`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener noreferrer";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else if(action.type==="email"){
      const subj=`${stage?.name||""} - OPEN Log`;
      const a=document.createElement("a"); a.href="mailto:"+((lead.emails&&lead.emails[0])||lead.email||"")+"?subject="+encodeURIComponent(""+stage?.name+" - OPEN Log")+"&body="+encodeURIComponent(msg);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else if(action.type==="ligacao"){
      if(lead.phone){ const a=document.createElement("a"); a.href=`tel:${lead.phone}`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
    }
    markActionDone(lead.id, action.id);
    onAction && onAction();
    setOpen(false);
  };

  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{background:"transparent",border:"none",cursor:"pointer",position:"relative",padding:"3px"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={overdue.length>0?"#EF4444":C.accent} strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{position:"absolute",top:-3,right:-3,background:overdue.length>0?"#EF4444":C.accent,color:"#fff",fontSize:9,fontWeight:700,minWidth:14,height:14,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{count}</span>
      </button>

      {open&&(
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>
          <div style={{position:"absolute",top:"100%",right:0,zIndex:300,width:320,background:C.panel,border:("1px solid "+C.border),borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:("1px solid "+C.border),background:C.sidebar}}>
              <div style={{fontSize:12,fontWeight:800,color:C.text}}>🔔 Acionamentos - {lead.name}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{stage?.name||"Sem etapa"} · {count} pendente(s)</div>
            </div>
            <div style={{maxHeight:380,overflowY:"auto"}}>
              {pending.map(action=>{
                const at=ACTION_TYPES.find(t=>t.id===action.type)||ACTION_TYPES[ACTION_TYPES.length-1];
                const canDo=canDoAction(lead,action.type);
                const isOverdue=action.daysOverdue>0;
                return (
                  <div key={action.id} style={{padding:"12px 14px",borderBottom:("1px solid "+C.border),background:isOverdue?"rgba(239,68,68,0.04)":"transparent"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:14}}>{at.icon}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:isOverdue?"#F87171":C.text}}>{action.label}</div>
                          <div style={{fontSize:10,color:C.faint}}>
                            {isOverdue?<span style={{color:"#F87171"}}>⚠️ {action.daysOverdue}d atrasado</span>:<span>Dia {action.day}</span>}
                          </div>
                        </div>
                      </div>
                      <span style={{fontSize:10,color:at.color,background:(at.color+"18"),padding:"2px 7px",borderRadius:20,fontWeight:700}}>{at.label}</span>
                    </div>
                    {action.msg&&(
                      <div style={{fontSize:11,color:C.muted,background:C.sidebar,borderRadius:6,padding:"6px 8px",marginBottom:8,lineHeight:1.5}}>
                        {(action.msg).replace(/{nome}/g,lead.name||"").replace(/{empresa}/g,lead.company||"").substring(0,120)}...
                      </div>
                    )}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {canDo?(
                        <button onClick={()=>doAction(action)} style={{...btnP,padding:"5px 12px",fontSize:11,background:at.color}}>
                          {at.icon} {action.type==="whatsapp"?"Abrir WhatsApp":action.type==="email"?"Abrir E-mail":action.type==="ligacao"?"Ligar":action.type==="audio"?"Enviar Áudio":"Executar"}
                        </button>
                      ):(
                        <div style={{fontSize:11,color:"#F87171",padding:"5px 8px",background:"rgba(248,113,113,0.08)",borderRadius:6,border:"1px solid rgba(248,113,113,0.2)"}}>
                          {action.type==="whatsapp"||action.type==="audio"?"⚠️ WhatsApp não confirmado":action.type==="email"?"⚠️ E-mail não cadastrado":"⚠️ Telefone não disponível"}
                        </div>
                      )}
                      <button onClick={()=>{markActionDone(lead.id,action.id);onAction&&onAction();setOpen(false);}} style={{...btnG,padding:"5px 10px",fontSize:11}}>✓ Marcar feito</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{padding:"8px 14px",borderTop:("1px solid "+C.border)}}>
              <button onClick={()=>{pending.forEach(a=>markActionDone(lead.id,a.id));onAction&&onAction();setOpen(false);}} style={{...btnG,width:"100%",fontSize:11,padding:"6px"}}>✓ Marcar todos como feitos</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── FUNIL PAGE - aba do usuário ─────────────────────────────────────────────
function FunnelPage({ leads, onUpdateLead, currentUser, isMaster }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t=>t+1);
  const [filter, setFilter] = useState("all"); // all | pending | overdue

  // Init stages for leads that have funilStage set
  // Always sync LEAD_STAGE from lead.status (source of truth)
  leads.forEach(l=>{
    const byStatus = FUNIL_STAGES.find(s=>s.name===l.status);
    const stageId = byStatus?.id || l.funilStage || FUNIL_STAGES[0]?.id || "s1";
    setLeadStage(l.id, stageId);
  });

  const allPending = leads.filter(l=>getPendingActions(l).length>0);
  const allOverdue = leads.filter(l=>getPendingActions(l).some(a=>a.daysOverdue>0));

  const displayed = filter==="pending" ? allPending : filter==="overdue" ? allOverdue : leads;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>🏆 Funil de Vendas</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Acompanhe seus leads e acionamentos pendentes</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}} className="mob-grid-1">
        {[
          {label:"Leads no funil",val:leads.filter(l=>getLeadStage(l.id)).length,color:C.accent,icon:"👥"},
          {label:"Acionamentos pendentes",val:allPending.length,color:"#F59E0B",icon:"🔔"},
          {label:"Atrasados",val:allOverdue.length,color:"#EF4444",icon:"⚠️"},
        ].map(k=>(
          <div key={k.label} style={{...card({padding:14}),borderLeft:("3px solid "+k.color)}}>
            <div style={{fontSize:20,marginBottom:4}}>{k.icon}</div>
            <div style={{fontSize:24,fontWeight:800,color:k.color}}>{k.val}</div>
            <div style={{fontSize:11,color:C.muted}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[["all","Todos no funil"],["pending","Com pendências"],["overdue","Atrasados"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{padding:"5px 14px",borderRadius:20,border:("1px solid "+filter===v?C.accent:C.border),background:filter===v?(C.accent+"18"):"transparent",color:filter===v?C.accent:C.muted,fontSize:11,fontWeight:filter===v?700:400,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {/* Pipeline kanban */}
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:12}}>
        {FUNIL_STAGES.map(stage=>{
          // Use status as single source of truth (same as Dashboard)
          const stageLeads = displayed.filter(l=>l.status===stage.name);
          return (
            <div key={stage.id} style={{minWidth:220,flex:"0 0 220px"}}>
              <div style={{padding:"8px 12px",borderRadius:"8px 8px 0 0",background:(stage.color+"22"),borderBottom:("2px solid "+stage.color),marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:stage.color}}/>
                    <span style={{fontSize:12,fontWeight:700,color:stage.color}}>{stage.name}</span>
                  </div>
                  <span style={{fontSize:10,color:C.faint,background:C.border,padding:"1px 6px",borderRadius:20}}>{stageLeads.length}</span>
                </div>
                <div style={{fontSize:10,color:C.faint,marginTop:2}}>⏱ Máx {stage.maxDays} dias</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {stageLeads.map(lead=>{
                  const ls=getLeadStage(lead.id);
                  const daysIn=ls?Math.floor((Date.now()-new Date(ls.enteredAt))/(1000*60*60*24)):0;
                  const pending=getPendingActions(lead);
                  const overdue=pending.filter(a=>a.daysOverdue>0);
                  const warn=daysIn>=stage.maxDays;
                  return (
                    <div key={lead.id} style={{...card({padding:10}),border:("1px solid "+warn?"#EF4444":overdue.length>0?"#F59E0B":C.border),position:"relative"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text,flex:1,marginRight:6}}>{lead.name}</div>
                        <FunnelBell lead={lead} onAction={refresh}/>
                      </div>
                      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{lead.company}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                        <span style={{fontSize:9,color:warn?"#F87171":C.faint,background:warn?"rgba(248,113,113,0.1)":C.border,padding:"1px 6px",borderRadius:20}}>{daysIn}d na etapa</span>
                        {pending.length>0&&<span style={{fontSize:9,color:overdue.length>0?"#F87171":"#F59E0B",background:overdue.length>0?"rgba(248,113,113,0.1)":"rgba(245,158,11,0.1)",padding:"1px 6px",borderRadius:20}}>🔔 {pending.length} pendente(s)</span>}
                      </div>
                      {/* Move stage */}
                      <select value={stage.id} onChange={e=>{const newStage=FUNIL_STAGES.find(s=>s.id===e.target.value);if(!newStage)return;setLeadStage(lead.id,newStage.id);onUpdateLead({...lead,funilStage:newStage.id,status:newStage.name});refresh();}}
                        style={{width:"100%",background:C.sidebar,border:("1px solid "+C.border),borderRadius:6,color:C.text,fontSize:10,padding:"3px 6px"}}>
                        {FUNIL_STAGES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  );
                })}
                {stageLeads.length===0&&<div style={{fontSize:11,color:C.faint,textAlign:"center",padding:"12px 0",fontStyle:"italic"}}>Nenhum lead</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── LIMITS PANEL ────────────────────────────────────────────────────────────

// ─── LIMITS HELPERS ──────────────────────────────────────────────────────────
const DEFAULT_LIMITS = {
  owner:  { searches:100, leads:500, messages:1000 },
  master: { searches:50,  leads:200, messages:500  },
  user:   { searches:20,  leads:100, messages:200  },
};
let USER_LIMITS = {};
let USAGE = {};

const getLimits = (user) => USER_LIMITS[user?.id] || DEFAULT_LIMITS[user?.role] || DEFAULT_LIMITS.user;
const setUserLimits = (id, limits) => { USER_LIMITS[id] = limits; };
const getToday = () => new Date().toISOString().split("T")[0];

function LimitsPanel({ users, purple, onRefresh }) {
  const [editing, setEditing] = useState(null); // userId being edited
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(null);

  const roleColor = (r) => r==="owner"?"#A855F7":r==="master"?"#F59E0B":C.accent;
  const roleName  = (r) => r==="owner"?"Owner":r==="master"?"Master":"Usuário";

  const startEdit = (u) => {
    const lim = getLimits(u);
    setEditing(u.id);
    setForm({ maxSearchesPerDay: lim.maxSearchesPerDay, maxTokensPerDay: lim.maxTokensPerDay, maxLeadsPerSearch: lim.maxLeadsPerSearch });
  };
  const saveEdit = (u) => {
    setUserLimits(u.id, {
      maxSearchesPerDay: parseInt(form.maxSearchesPerDay)||1,
      maxTokensPerDay:   parseInt(form.maxTokensPerDay)||1000,
      maxLeadsPerSearch: parseInt(form.maxLeadsPerSearch)||5,
    });
    setEditing(null);
    setSaved(u.id);
    setTimeout(()=>setSaved(null), 2000);
  };
  const resetLimits = (u) => {
    delete USER_LIMITS[u.id];
    setEditing(null);
    setSaved(u.id);
    setTimeout(()=>setSaved(null), 2000);
  };

  const today = getToday();

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>📊 Limites de Uso</div>
        <div style={{fontSize:12,color:C.muted}}>Controle buscas/dia, tokens/dia e leads por busca por usuário. Limites padrão são aplicados por perfil.</div>
      </div>

      {/* Default limits reference */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["user","Usuário",C.accent],["master","Master","#F59E0B"],["owner","Owner","#A855F7"]].map(([role,label,color])=>{
          const def = DEFAULT_LIMITS[role];
          return (
            <div key={role} style={{background:C.panel,border:("1px solid "+color+"33"),borderLeft:("3px solid "+color),borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:10,color,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{label} - Padrão</div>
              <div style={{fontSize:11,color:C.muted,marginBottom:3}}>🔍 Buscas/dia: <span style={{color:C.text,fontWeight:700}}>{def.maxSearchesPerDay===999?"Ilimitado":def.maxSearchesPerDay}</span></div>
              <div style={{fontSize:11,color:C.muted,marginBottom:3}}>⚡ Tokens/dia: <span style={{color:C.text,fontWeight:700}}>{def.maxTokensPerDay>=999999?"Ilimitado":def.maxTokensPerDay.toLocaleString()}</span></div>
              <div style={{fontSize:11,color:C.muted}}>📋 Leads/busca: <span style={{color:C.text,fontWeight:700}}>{def.maxLeadsPerSearch}</span></div>
            </div>
          );
        })}
      </div>

      {/* Per-user table */}
      <div style={{background:C.panel,border:("1px solid "+C.border),borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:("1px solid "+C.border),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Controle Individual por Usuário</div>
          <div style={{fontSize:10,color:C.faint}}>Uso zerado à meia-noite</div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:C.bg}}>
              {["Usuário","Perfil","🔍 Buscas/dia","⚡ Tokens/dia","📋 Leads/busca","Uso Hoje","Ações"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"8px 12px",fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",borderBottom:("1px solid "+C.border)}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter(u=>u.status!=="cancelado").map(u=>{
              const lim = getLimits(u);
              const usage = USAGE[u.id]&&USAGE[u.id].date===today ? USAGE[u.id] : {searches:0,tokens:0};
              const isEditing = editing===u.id;
              const hasOverride = !!USER_LIMITS[u.id];
              const searchPct = Math.min(100,(usage.searches/lim.maxSearchesPerDay)*100);
              const tokenPct  = Math.min(100,(usage.tokens/Math.max(lim.maxTokensPerDay,1))*100);
              return (
                <tr key={u.id} style={{borderBottom:("1px solid "+C.border),background:isEditing?"rgba(0,180,216,0.04)":"transparent"}}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{u.name}</div>
                    <div style={{fontSize:10,color:C.faint}}>{u.email}</div>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,color:roleColor(u.role),background:(roleColor(u.role)+"18"),border:("1px solid "+roleColor(u.role)+"33")}}>{roleName(u.role)}</span>
                    {hasOverride&&<div style={{fontSize:9,color:C.accent,marginTop:2}}>✏️ personalizado</div>}
                  </td>
                  {isEditing?(
                    <>
                      <td style={{padding:"8px 12px"}}><input type="number" min="1" max="999" value={form.maxSearchesPerDay} onChange={e=>setForm(f=>({...f,maxSearchesPerDay:e.target.value}))} style={{...inp,width:70,padding:"4px 8px",fontSize:12}}/></td>
                      <td style={{padding:"8px 12px"}}><input type="number" min="1000" max="500000" step="1000" value={form.maxTokensPerDay} onChange={e=>setForm(f=>({...f,maxTokensPerDay:e.target.value}))} style={{...inp,width:90,padding:"4px 8px",fontSize:12}}/></td>
                      <td style={{padding:"8px 12px"}}><input type="number" min="1" max="30" value={form.maxLeadsPerSearch} onChange={e=>setForm(f=>({...f,maxLeadsPerSearch:e.target.value}))} style={{...inp,width:60,padding:"4px 8px",fontSize:12}}/></td>
                    </>
                  ):(
                    <>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{lim.maxSearchesPerDay>=999?"∞":lim.maxSearchesPerDay}</div>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{lim.maxTokensPerDay>=999999?"∞":lim.maxTokensPerDay.toLocaleString()}</div>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{lim.maxLeadsPerSearch}</div>
                      </td>
                    </>
                  )}
                  <td style={{padding:"10px 12px",minWidth:140}}>
                    <div style={{fontSize:10,color:C.faint,marginBottom:4}}>
                      Buscas: {usage.searches}/{lim.maxSearchesPerDay>=999?"∞":lim.maxSearchesPerDay}
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:4,overflow:"hidden",marginBottom:4}}>
                      <div style={{height:"100%",width:(searchPct+"%"),background:searchPct>=90?"#F87171":searchPct>=60?"#FBBF24":C.accent,borderRadius:4,transition:"width 0.4s"}}/>
                    </div>
                    <div style={{fontSize:10,color:C.faint,marginBottom:4}}>
                      Tokens: {usage.tokens.toLocaleString()}/{lim.maxTokensPerDay>=999999?"∞":lim.maxTokensPerDay.toLocaleString()}
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:(tokenPct+"%"),background:tokenPct>=90?"#F87171":tokenPct>=60?"#FBBF24":"#A855F7",borderRadius:4,transition:"width 0.4s"}}/>
                    </div>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {isEditing?(
                        <>
                          <button onClick={()=>saveEdit(u)} style={{...btnP,padding:"5px 10px",fontSize:11}}>{saved===u.id?"✅ Salvo":"Salvar"}</button>
                          <button onClick={()=>setEditing(null)} style={{...btnG,padding:"5px 10px",fontSize:11}}>Cancelar</button>
                          {hasOverride&&<button onClick={()=>resetLimits(u)} style={{...btnD,padding:"5px 10px",fontSize:11}}>Resetar</button>}
                        </>
                      ):(
                        <>
                          <button onClick={()=>startEdit(u)} style={{...btnG,padding:"5px 10px",fontSize:11}}>✏️ Editar</button>
                          {saved===u.id&&<span style={{fontSize:11,color:"#4ADE80",fontWeight:700}}>✅</span>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:12,padding:"10px 14px",background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:8,fontSize:11,color:C.muted}}>
        💡 <strong style={{color:C.text}}>Dica:</strong> Deixe em branco para usar o padrão do perfil. Sobrescritas individuais ficam marcadas com <span style={{color:C.accent}}>✏️ personalizado</span>. O uso reinicia automaticamente à meia-noite.
      </div>
    </div>
  );
}


// ─── SEGMENTOS CONFIG - gerenciado pelo Owner ────────────────────────────────
function SegmentosConfig() {
  const [items, setItems] = useState([...SEGMENTS_DB]);
  useEffect(()=>{
    const cfg = TENANT_CONFIG;
    if(cfg?.segments&&Array.isArray(cfg.segments)&&cfg.segments.length>0){
      setItems(cfg.segments);
      SEGMENTS_DB.length=0; cfg.segments.forEach(s=>SEGMENTS_DB.push(s));
    }
  },[]);
  const [newItem, setNewItem] = useState("");
  const [saved, setSaved] = useState(false);

  const add = () => {
    if(!newItem.trim()) return;
    if(items.includes(newItem.trim())) return;
    setItems(s=>[...s, newItem.trim()]);
    setNewItem("");
  };

  const remove = (item) => setItems(s=>s.filter(x=>x!==item));

  const save = async () => {
    // Save locally
    SEGMENTS_DB.length = 0;
    items.forEach(s=>SEGMENTS_DB.push(s));
    // Save to Supabase if connected
    try {
      const tenantId = typeof _currentTenant!=="undefined"&&_currentTenant?.id;
      if(tenantId){
        await sbFetch("tenants?id=eq."+tenantId, "PATCH", {
          config: JSON.stringify({...TENANT_CONFIG, segments: items})
        });
      }
    } catch(e) { console.warn("Segments save error:", e.message); }
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>🏷️ Segmentos de Prospecção</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Defina os segmentos disponíveis para seleção na busca de leads. Somente o Owner pode gerenciar essa lista.</div>

      {/* Add new */}
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <input value={newItem} onChange={e=>setNewItem(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="Ex: Distribuidoras de Implantes..."
          style={{...inp,flex:1}}/>
        <button onClick={add} style={{...btnP,padding:"8px 18px",fontSize:12,flexShrink:0}}>+ Adicionar</button>
      </div>

      {/* List */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {items.map((item,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.panel,border:"1px solid "+C.border,borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:C.accent}}/>
              <span style={{fontSize:13,color:C.text}}>{item}</span>
            </div>
            <button onClick={()=>remove(item)} style={{background:"transparent",border:"1px solid rgba(248,113,113,0.3)",borderRadius:6,padding:"3px 10px",cursor:"pointer",color:"#F87171",fontSize:11}}>🗑 Remover</button>
          </div>
        ))}
        {items.length===0&&<div style={{textAlign:"center",color:C.faint,fontSize:13,padding:24}}>Nenhum segmento cadastrado.</div>}
      </div>

      <button onClick={save} style={{...btnP,padding:"10px 24px",fontSize:13}}>
        {saved?"✅ Salvo!":"💾 Salvar Segmentos"}
      </button>
    </div>
  );
}

// ─── CADÊNCIAS — Sequências de Acionamento ────────────────────────────────────

// Storage global de sequências (Owner define, todos usam)
// Sequences are per-user: owner_id identifies who created it
// If owner_id is null = shared by owner for everyone
let CADENCIAS_DB = [
  {
    id: "cad1",
    name: "Prospecção Padrão",
    owner_id: null, // shared
    description: "Sequência básica para novos leads",
    module: "prospeccao",
    active: true,
    auto: false,
    steps: [
      { id:"s1", day:0,  canal:"WhatsApp", tema:"1º Contato",        descricao:"Apresentação inicial da empresa" },
      { id:"s2", day:2,  canal:"WhatsApp", tema:"Follow-up",          descricao:"Reforço após primeiro contato" },
      { id:"s3", day:5,  canal:"Email",    tema:"Material de apoio",  descricao:"Enviar apresentação em PDF" },
      { id:"s4", day:8,  canal:"Ligação",  tema:"Qualificação",       descricao:"Ligação para entender necessidade" },
      { id:"s5", day:12, canal:"WhatsApp", tema:"Proposta",           descricao:"Enviar proposta personalizada" },
    ]
  },
  {
    id: "cad2",
    name: "Reativação",
    owner_id: null, // shared
    description: "Para leads que não responderam",
    module: "prospeccao",
    active: true,
    auto: false,
    steps: [
      { id:"s1", day:0,  canal:"WhatsApp", tema:"Reativação",        descricao:"Mensagem de reativação" },
      { id:"s2", day:3,  canal:"Email",    tema:"Novo ângulo",       descricao:"Abordagem diferente por email" },
      { id:"s3", day:7,  canal:"Ligação",  tema:"Última tentativa",  descricao:"Ligação final" },
    ]
  },
];

let nextCadId = 3;
let nextStepId = 10;

const CANAL_COLORS = {
  "WhatsApp": "#25D366",
  "Email":    "#3B82F6",
  "Ligação":  "#F59E0B",
  "LinkedIn": "#0A66C2",
};

const CANAL_ICONS = {
  "WhatsApp": "📱",
  "Email":    "✉️",
  "Ligação":  "📞",
  "LinkedIn": "💼",
};

// ─── Cadencias Component ──────────────────────────────────────────────────────
function Cadencias({ leads, currentUser, onUpdateLead }) {
  const [view, setView]         = useState("lista");   // lista | editor | aplicar
  // User sees: their own + shared sequences (owner_id null)
  const [cadencias, setCadencias] = useState(
    CADENCIAS_DB.filter(c=>c.owner_id===null||c.owner_id===currentUser?.id||(currentUser?.id||"local"))
  );
  const [editing, setEditing]   = useState(null);      // cadencia being edited
  const [selCad, setSelCad]     = useState(null);      // cadencia to apply
  const [selLeads, setSelLeads] = useState([]);         // leads to apply cadencia
  const [saved, setSaved]       = useState(false);

  const currentUserId = currentUser?.id||"local";
  // Each user manages their own sequences — Owner can manage all
  const isOwner  = currentUser?.role === "owner" || currentUser?.role === "master";
  const canEdit  = true; // all users create/edit their own sequences
  const canApply = true;

  // ── CRUD Cadencias ──────────────────────────────────────────────────────────
  const newCadencia = () => {
    const cad = {
      id: "cad" + (nextCadId++),
      name: "Nova Sequência",
      description: "",
      module: "prospeccao",
      active: true,
      steps: [
        { id:"s"+( nextStepId++), day:0, canal:"WhatsApp", tema:"1º Contato", descricao:"" }
      ]
    };
    setEditing({...cad});
    setView("editor");
  };

  const saveEditing = () => {
    if(!editing.name){return;}
    const idx = cadencias.findIndex(c=>c.id===editing.id);
    let updated;
    if(idx>=0){
      updated = cadencias.map(c=>c.id===editing.id?editing:c);
    } else {
      updated = [...cadencias, editing];
    }
    setCadencias(updated);
    CADENCIAS_DB.length=0; updated.forEach(c=>CADENCIAS_DB.push(c));
    setSaved(true); setTimeout(()=>setSaved(false),2000);
    setView("lista");
  };

  const deleteCad = (id) => {
    const updated = cadencias.filter(c=>c.id!==id);
    setCadencias(updated);
    CADENCIAS_DB.length=0; updated.forEach(c=>CADENCIAS_DB.push(c));
  };

  const addStep = () => {
    const lastDay = editing.steps[editing.steps.length-1]?.day||0;
    setEditing(e=>({...e, steps:[...e.steps,
      {id:"s"+(nextStepId++), day:lastDay+3, canal:"WhatsApp", tema:"", descricao:""}
    ]}));
  };

  const updateStep = (stepId, field, val) => {
    setEditing(e=>({...e, steps:e.steps.map(s=>s.id===stepId?{...s,[field]:val}:s)}));
  };

  const removeStep = (stepId) => {
    setEditing(e=>({...e, steps:e.steps.filter(s=>s.id!==stepId)}));
  };

  // ── Apply Cadencia to leads ─────────────────────────────────────────────────
  const applyToLeads = () => {
    if(!selCad||selLeads.length===0) return;
    selLeads.forEach(leadId=>{
      const lead = leads.find(l=>l.id===leadId);
      if(!lead) return;
      const newCadence = selCad.steps.map(step=>({
        day: step.day,
        canal: step.canal,
        tema: step.tema,
        descricao: step.descricao,
        status: "pendente",
        scheduledFor: new Date(Date.now()+step.day*86400000).toISOString().split("T")[0],
      }));
      onUpdateLead({...lead, cadence:[...(lead.cadence||[]),...newCadence]});
    });
    setSelLeads([]);
    setSelCad(null);
    setView("lista");
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>📅 Cadências</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Sequências automáticas de acionamento por canal e tempo</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {view!=="lista"&&(
            <button onClick={()=>setView("lista")} style={{...btnG,padding:"8px 16px",fontSize:12}}>← Voltar</button>
          )}
          {canEdit&&view==="lista"&&(
            <button onClick={newCadencia} style={{...btnP,padding:"9px 18px",fontSize:13}}>+ Nova Sequência</button>
          )}
        </div>
      </div>

      {saved&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE80",borderRadius:8,fontSize:12,color:"#4ADE80",fontWeight:700}}>✅ Salvo com sucesso!</div>}

      {/* ── LISTA DE CADÊNCIAS ── */}
      {view==="lista"&&(
        <div>
          {cadencias.map(cad=>(
            <div key={cad.id} style={{...card({padding:20,marginBottom:14}),border:"1px solid "+C.border}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:15,fontWeight:800,color:C.text}}>{cad.name}</span>
                    <span style={{fontSize:9,color:cad.active?"#4ADE80":"#F87171",background:cad.active?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",padding:"2px 8px",borderRadius:20,fontWeight:700}}>
                      {cad.active?"Ativa":"Inativa"}
                    </span>
                    {cad.owner_id===null&&<span style={{fontSize:9,color:C.accent,background:C.accent+"18",padding:"2px 8px",borderRadius:20,fontWeight:700}}>🔗 Compartilhada</span>}
                    {cad.auto&&<span style={{fontSize:9,color:"#F59E0B",background:"rgba(245,158,11,0.1)",padding:"2px 8px",borderRadius:20,fontWeight:700}}>🤖 Auto</span>}
                  </div>
                  {cad.description&&<div style={{fontSize:12,color:C.muted}}>{cad.description}</div>}
                  <div style={{fontSize:11,color:C.faint,marginTop:4}}>{cad.steps.length} etapas · {cad.steps[cad.steps.length-1]?.day||0} dias no total</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setSelCad(cad);setView("aplicar");}}
                    style={{...btnP,padding:"6px 14px",fontSize:11}}>▶ Aplicar</button>
                  {canEdit&&(
                    <>
                      {(isOwner||cad.owner_id===currentUserId)&&(
                      <button onClick={()=>{setEditing({...cad,steps:[...cad.steps.map(s=>({...s}))]});setView("editor");}}
                        style={{...btnG,padding:"6px 14px",fontSize:11}}>✏️ Editar</button>
                      )}
                      {(isOwner||cad.owner_id===currentUserId)&&(
                      <button onClick={()=>deleteCad(cad.id)}
                        style={{...btnG,padding:"6px 12px",fontSize:11,color:"#F87171"}}>🗑</button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Timeline visual */}
              <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:4}}>
                {cad.steps.map((step,i)=>{
                  const color = CANAL_COLORS[step.canal]||C.accent;
                  const icon = CANAL_ICONS[step.canal]||"📌";
                  return (
                    <div key={step.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                      <div style={{textAlign:"center",minWidth:90}}>
                        <div style={{width:36,height:36,borderRadius:"50%",background:color+"18",border:"2px solid "+color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",fontSize:16}}>{icon}</div>
                        <div style={{fontSize:9,fontWeight:700,color,marginBottom:2}}>Dia {step.day}</div>
                        <div style={{fontSize:9,color:C.text,fontWeight:600,lineHeight:1.3}}>{step.tema||step.canal}</div>
                        <div style={{fontSize:8,color:C.faint}}>{step.canal}</div>
                      </div>
                      {i<cad.steps.length-1&&(
                        <div style={{width:24,height:2,background:C.border,flexShrink:0,margin:"0 2px"}}/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {cadencias.length===0&&(
            <div style={{...card({padding:40}),textAlign:"center",color:C.muted}}>
              <div style={{fontSize:32,marginBottom:12}}>📅</div>
              <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Nenhuma cadência criada</div>
              {canEdit&&<button onClick={newCadencia} style={{...btnP,padding:"10px 24px"}}>+ Criar Primeira Sequência</button>}
            </div>
          )}
        </div>
      )}

      {/* ── EDITOR ── */}
      {view==="editor"&&editing&&(
        <div>
          {/* Infos básicas */}
          <div style={{...card({padding:20}),marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}} className="mob-grid-1">
              <div>
                <div style={lbl}>Nome da Sequência *</div>
                <input value={editing.name} onChange={e=>setEditing(ed=>({...ed,name:e.target.value}))}
                  placeholder="Ex: Prospecção Padrão" style={inp}/>
              </div>
              <div>
                <div style={lbl}>Módulo</div>
                <select value={editing.module} onChange={e=>setEditing(ed=>({...ed,module:e.target.value}))} style={inp}>
                  <option value="prospeccao">Prospecção</option>
                  <option value="receptivo">Receptivo</option>
                  <option value="pos_venda">Pós-venda</option>
                </select>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <div style={lbl}>Descrição</div>
                <input value={editing.description} onChange={e=>setEditing(ed=>({...ed,description:e.target.value}))}
                  placeholder="Descreva o objetivo desta sequência" style={inp}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.sidebar,borderRadius:10,border:"1px solid "+C.border}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>🤖 Execução Automática via N8N</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>Quando ativado, o N8N executa os acionamentos automaticamente nas datas programadas</div>
                  </div>
                  <div onClick={()=>setEditing(ed=>({...ed,auto:!ed.auto}))}
                    style={{width:46,height:26,borderRadius:13,background:editing.auto?C.accent:C.border,cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0,marginLeft:16}}>
                    <div style={{position:"absolute",top:3,left:editing.auto?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
                  </div>
                </div>
                {editing.auto&&(
                  <div style={{marginTop:8,padding:"10px 14px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:11,color:"#F59E0B"}}>
                    ⚠️ O N8N precisa estar configurado com o webhook do Pipe.TM para executar automaticamente. Configure em Super Admin → Webhooks N8N.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div style={{...card({padding:20}),marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:16}}>Etapas da Sequência</div>
            {editing.steps.map((step,i)=>{
              const color = CANAL_COLORS[step.canal]||C.accent;
              return (
                <div key={step.id} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14,padding:14,background:C.sidebar,borderRadius:10,border:"1px solid "+color+"33"}}>
                  {/* Step number */}
                  <div style={{width:32,height:32,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:10}} className="mob-grid-1">
                    <div>
                      <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:4}}>DIA</div>
                      <input type="number" min="0" value={step.day}
                        onChange={e=>updateStep(step.id,"day",parseInt(e.target.value)||0)}
                        style={{...inp,textAlign:"center",fontWeight:800,fontSize:16,color}}/>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:4}}>CANAL</div>
                      <select value={step.canal} onChange={e=>updateStep(step.id,"canal",e.target.value)} style={inp}>
                        {["WhatsApp","Email","Ligação","LinkedIn"].map(ch=>(
                          <option key={ch} value={ch}>{CANAL_ICONS[ch]} {ch}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:4}}>TEMA / ASSUNTO</div>
                      <input value={step.tema} onChange={e=>updateStep(step.id,"tema",e.target.value)}
                        placeholder="Ex: Follow-up" style={inp}/>
                    </div>
                    <div style={{gridColumn:"2/-1"}}>
                      <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:4}}>INSTRUÇÃO PARA O VENDEDOR</div>
                      <input value={step.descricao} onChange={e=>updateStep(step.id,"descricao",e.target.value)}
                        placeholder="O que fazer nesta etapa..." style={inp}/>
                    </div>
                  </div>
                  <button onClick={()=>removeStep(step.id)}
                    style={{background:"transparent",border:"none",color:"#F87171",cursor:"pointer",fontSize:16,padding:"4px",flexShrink:0}}>✕</button>
                </div>
              );
            })}

            <button onClick={addStep} style={{...btnG,width:"100%",padding:"10px",fontSize:12,marginTop:4}}>
              + Adicionar Etapa
            </button>
          </div>

          {/* Save */}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setView("lista")} style={{...btnG,flex:1,padding:"12px"}}>Cancelar</button>
            <button onClick={saveEditing} style={{...btnP,flex:2,padding:"12px",fontSize:14,fontWeight:700}}>
              {saved?"✅ Salvo!":"💾 Salvar Sequência"}
            </button>
          </div>
        </div>
      )}

      {/* ── APLICAR A LEADS ── */}
      {view==="aplicar"&&selCad&&(
        <div>
          <div style={{...card({padding:16}),marginBottom:16,borderLeft:"4px solid "+C.accent}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>{selCad.name}</div>
            <div style={{fontSize:12,color:C.muted}}>{selCad.steps.length} etapas · até o dia {selCad.steps[selCad.steps.length-1]?.day}</div>
          </div>

          <div style={{...card({padding:20}),marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>
              Selecione os leads para aplicar a sequência
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>setSelLeads(leads.filter(l=>l.status==="Novo cliente").map(l=>l.id))}
                style={{...btnG,padding:"6px 12px",fontSize:11}}>Todos "Novo cliente"</button>
              <button onClick={()=>setSelLeads([])}
                style={{...btnG,padding:"6px 12px",fontSize:11}}>Limpar</button>
            </div>
            <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
              {leads.filter(l=>l.module!=="receptivo"&&l.module!=="pos_venda").map(l=>{
                const sel = selLeads.includes(l.id);
                return (
                  <div key={l.id} onClick={()=>setSelLeads(s=>sel?s.filter(id=>id!==l.id):[...s,l.id])}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,cursor:"pointer",border:"1px solid "+(sel?C.accent:C.border),background:sel?(C.accent+"08"):"transparent",transition:"all 0.15s"}}>
                    <div style={{width:18,height:18,borderRadius:4,border:"2px solid "+(sel?C.accent:C.border),background:sel?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {sel&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>{l.name}</div>
                      <div style={{fontSize:10,color:C.muted}}>{l.status} · {l.city}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setView("lista")} style={{...btnG,flex:1,padding:"12px"}}>Cancelar</button>
            <button onClick={applyToLeads} disabled={selLeads.length===0}
              style={{...btnP,flex:2,padding:"12px",fontSize:14,fontWeight:700,opacity:selLeads.length===0?0.5:1}}>
              ▶ Aplicar a {selLeads.length} lead{selLeads.length!==1?"s":""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── MÓDULO RECEPTIVO ────────────────────────────────────────────────────────

// Funil do Receptivo
const RECEPTIVO_STAGES = [
  { id:"r1", name:"Novo contato",    color:"#00B4D8", maxHours:1,  icon:"📥" },
  { id:"r2", name:"Qualificando",    color:"#8B5CF6", maxHours:24, icon:"🔍" },
  { id:"r3", name:"Proposta",        color:"#F59E0B", maxHours:48, icon:"📋" },
  { id:"r4", name:"Negociando",      color:"#6366F1", maxHours:72, icon:"🤝" },
  { id:"r5", name:"Fechado",         color:"#4ADE80", maxHours:999,icon:"✅" },
  { id:"r6", name:"Perdido",         color:"#F87171", maxHours:999,icon:"❌" },
];

const RECEPTIVO_CANAIS = ["WhatsApp","Formulário","Ligação","Email","Instagram","Indicação"];

// Templates de resposta rápida por canal
const RECEPTIVO_TEMPLATES = {
  "WhatsApp": [
    { id:"rwa1", label:"Resposta Imediata", text:(l,p)=>"Olá "+l.name+"! Recebemos seu contato e já estamos analisando sua solicitação. Em breve um de nossos especialistas entrará em contato. "+(p?.companyName||"") },
    { id:"rwa2", label:"Qualificação", text:(l,p)=>"Oi "+l.name+"! Para te ajudar melhor, pode me contar um pouco mais sobre o que você precisa? Qual é o seu principal desafio hoje?" },
    { id:"rwa3", label:"Agendamento", text:(l,p)=>"Olá "+l.name+"! Que ótimo ter seu contato! Tenho disponibilidade para uma conversa rápida. Quando seria melhor para você — esta semana ou na próxima?" },
    { id:"rwa4", label:"Envio de Material", text:(l,p)=>"Oi "+l.name+"! Vou te enviar nosso material com mais detalhes. Qualquer dúvida, estou aqui!" },
    { id:"rwa5", label:"Follow-up", text:(l,p)=>"Olá "+l.name+"! Passando para ver se teve oportunidade de analisar o que conversamos. Posso te ajudar com mais alguma informação?" },
  ],
  "Formulário": [
    { id:"rfo1", label:"Confirmação de Recebimento", text:(l,p)=>"Olá "+l.name+"! Recebemos seu formulário e ficamos felizes com seu interesse. Nossa equipe analisará sua solicitação e entrará em contato em breve." },
    { id:"rfo2", label:"Qualificação por Email", text:(l,p)=>"Prezado(a) "+l.name+", recebemos seu contato através do nosso site. Para entendermos melhor sua necessidade, poderia nos contar mais sobre o contexto?" },
    { id:"rfo3", label:"Convite para Reunião", text:(l,p)=>"Olá "+l.name+"! Vi sua mensagem e acredito que posso te ajudar muito. Que tal uma conversa rápida de 20 minutos para entender melhor sua necessidade?" },
    { id:"rfo4", label:"Proposta Inicial", text:(l,p)=>"Prezado(a) "+l.name+", com base no que nos enviou, preparei algumas opções que podem atender sua necessidade. Posso enviar mais detalhes?" },
    { id:"rfo5", label:"Nurturing", text:(l,p)=>"Olá "+l.name+"! Ainda pensando na nossa solução? Temos novidades que podem ser relevantes para você. Posso compartilhar?" },
  ],
};

// ─── RECEPTIVO — Componente Principal ────────────────────────────────────────
function Receptivo({ leads, onAddLead, onUpdateLead, currentUser }) {
  const [tab, setTab] = useState("kanban");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", canal:"WhatsApp", phone:"", email:"", notes:"", origem:"" });
  const [selLead, setSelLead] = useState(null);

  // Filter only receptivo leads
  const recLeads = leads.filter(l=>l.module==="receptivo");

  // Stats
  const hoje = recLeads.filter(l=>{
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString()===now.toDateString();
  });
  const porCanal = RECEPTIVO_CANAIS.reduce((acc,ch)=>{
    acc[ch]=recLeads.filter(l=>l.canal===ch||l.channel===ch).length;
    return acc;
  },{});
  const tempoMedioResposta = "< 2h"; // TODO: calcular do cadence

  const addContato = () => {
    if(!form.name||!form.canal){return;}
    const newLead = {
      id: Date.now(),
      name: form.name,
      company: form.name,
      tipo: "PJ",
      phone: form.phone,
      email: form.email,
      canal: form.canal,
      channel: form.canal,
      notes: form.notes,
      origem: form.origem||form.canal,
      status: "Novo contato",
      funilStage: "r1",
      module: "receptivo",
      score: 50,
      priority: "Alta",
      cadence: [],
      createdAt: new Date().toISOString(),
    };
    onAddLead(newLead);
    setForm({name:"",canal:"WhatsApp",phone:"",email:"",notes:"",origem:""});
    setShowAdd(false);
  };

  const updateStage = (lead, stageId) => {
    const stage = RECEPTIVO_STAGES.find(s=>s.id===stageId);
    onUpdateLead({...lead, funilStage:stageId, status:stage?.name||lead.status});
  };

  // Hours since created
  const hoursAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff/3600000);
    if(h<1) return "agora";
    if(h<24) return h+"h atrás";
    return Math.floor(h/24)+"d atrás";
  };

  const isUrgent = (lead) => {
    const stage = RECEPTIVO_STAGES.find(s=>s.name===lead.status);
    if(!stage) return false;
    const h = (Date.now()-new Date(lead.createdAt).getTime())/3600000;
    return h > stage.maxHours;
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>📥 Receptivo</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Gerencie leads que chegam até você</div>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{...btnP,padding:"9px 18px",fontSize:13}}>
          + Novo Contato
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}} className="mob-grid-2">
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:C.accent}}>{recLeads.length}</div>
          <div style={{fontSize:11,color:C.muted}}>Total contatos</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#4ADE80"}}>{hoje.length}</div>
          <div style={{fontSize:11,color:C.muted}}>Hoje</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#F87171"}}>{recLeads.filter(isUrgent).length}</div>
          <div style={{fontSize:11,color:C.muted}}>Urgentes</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#F59E0B"}}>{recLeads.filter(l=>l.status==="Fechado").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Fechados</div>
        </div>
      </div>


      {/* Métricas de resposta */}
      {recLeads.length>0&&(
        <div style={{...card({padding:14}),marginBottom:16,display:"flex",gap:16,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:10,color:C.faint,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Canal mais usado</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>
              {(()=>{
                const counts = RECEPTIVO_CANAIS.reduce((acc,ch)=>({...acc,[ch]:recLeads.filter(l=>l.canal===ch||l.channel===ch).length}),{});
                const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
                return top&&top[1]>0 ? top[0]+" ("+top[1]+")" : "—";
              })()}
            </div>
          </div>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:10,color:C.faint,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Taxa de conversão</div>
            <div style={{fontSize:13,fontWeight:700,color:"#4ADE80"}}>
              {recLeads.length>0?Math.round(recLeads.filter(l=>l.status==="Fechado").length/recLeads.length*100):0}%
            </div>
          </div>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontSize:10,color:C.faint,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Urgentes agora</div>
            <div style={{fontSize:13,fontWeight:700,color:recLeads.filter(isUrgent).length>0?"#F87171":C.faint}}>
              {recLeads.filter(isUrgent).length} lead{recLeads.filter(isUrgent).length!==1?"s":""}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden"}}>
        {[["kanban","📋 Kanban"],["lista","📄 Lista"],["canais","📊 Por Canal"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{flex:1,padding:"10px",border:"none",background:tab===v?C.accent:"transparent",color:tab===v?"#fff":C.muted,fontWeight:tab===v?700:400,fontSize:12,cursor:"pointer",transition:"all 0.15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Kanban */}
      {tab==="kanban"&&(
        <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8}}>
          {RECEPTIVO_STAGES.filter(s=>s.id!=="r6").map(stage=>{
            const stageLeads = recLeads.filter(l=>l.status===stage.name||l.funilStage===stage.id);
            return (
              <div key={stage.id} style={{minWidth:220,flex:"0 0 220px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 12px",background:stage.color+"18",borderRadius:8,border:"1px solid "+stage.color+"33"}}>
                  <span>{stage.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:stage.color}}>{stage.name}</span>
                  <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:stage.color,background:stage.color+"22",padding:"1px 8px",borderRadius:20}}>{stageLeads.length}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {stageLeads.map(l=>(
                    <div key={l.id} onClick={()=>setSelLead(l)}
                      style={{...card({padding:12}),border:"1px solid "+(isUrgent(l)?"#F87171":C.border),cursor:"pointer",transition:"all 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=stage.color}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=isUrgent(l)?"#F87171":C.border}>
                      {isUrgent(l)&&<div style={{fontSize:9,color:"#F87171",fontWeight:700,marginBottom:4}}>⚠️ URGENTE — sem resposta</div>}
                      <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4}}>{l.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <span style={{fontSize:9,color:"#fff",background:l.canal==="WhatsApp"?"#25D366":l.canal==="Formulário"?"#6366F1":"#F59E0B",padding:"1px 7px",borderRadius:20,fontWeight:700}}>{l.canal||l.channel||"—"}</span>
                        <span style={{fontSize:9,color:C.faint}}>{hoursAgo(l.createdAt)}</span>
                      </div>
                      {l.notes&&<div style={{fontSize:10,color:C.dim,fontStyle:"italic"}}>{l.notes.substring(0,50)}{l.notes.length>50?"...":""}</div>}
                      <div style={{marginTop:8}}>
                        <select value={l.funilStage||"r1"} onClick={e=>e.stopPropagation()}
                          onChange={e=>updateStage(l,e.target.value)}
                          style={{...inp,fontSize:10,padding:"3px 6px",width:"100%"}}>
                          {RECEPTIVO_STAGES.map(s=>(
                            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length===0&&(
                    <div style={{padding:"16px 8px",textAlign:"center",color:C.faint,fontSize:11,border:"1px dashed "+C.border,borderRadius:8}}>Vazio</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista */}
      {tab==="lista"&&(
        <div style={card({padding:0,overflow:"hidden"})}>
          {recLeads.length===0
            ?<div style={{padding:24,textAlign:"center",color:C.muted}}>Nenhum contato receptivo ainda.</div>
            :recLeads.map(l=>{
              const stage = RECEPTIVO_STAGES.find(s=>s.name===l.status);
              const urgent = isUrgent(l);
              return (
                <div key={l.id} onClick={()=>setSelLead(l)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid "+C.border,cursor:"pointer",background:urgent?"rgba(248,113,113,0.04)":"transparent"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accent+"08"}
                  onMouseLeave={e=>e.currentTarget.style.background=urgent?"rgba(248,113,113,0.04)":"transparent"}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:stage?.color||C.accent,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{l.name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{l.canal||l.channel} · {hoursAgo(l.createdAt)}</div>
                  </div>
                  <div style={{fontSize:11,color:stage?.color||C.accent,fontWeight:700}}>{l.status}</div>
                  {urgent&&<span style={{fontSize:9,color:"#F87171",fontWeight:700}}>⚠️</span>}
                </div>
              );
            })
          }
        </div>
      )}

      {/* Por Canal */}
      {tab==="canais"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}} className="mob-grid-2">
            {RECEPTIVO_CANAIS.map(ch=>{
              const count = porCanal[ch]||0;
              const color = ch==="WhatsApp"?"#25D366":ch==="Formulário"?"#6366F1":ch==="Ligação"?"#F59E0B":ch==="Email"?"#3B82F6":ch==="Instagram"?"#E1306C":"#8B5CF6";
              return (
                <div key={ch} style={{...card({padding:16}),borderLeft:"4px solid "+color}}>
                  <div style={{fontSize:24,fontWeight:900,color}}>{count}</div>
                  <div style={{fontSize:12,color:C.muted}}>{ch}</div>
                  {count>0&&<div style={{fontSize:10,color:C.faint,marginTop:4}}>{Math.round(count/Math.max(recLeads.length,1)*100)}% do total</div>}
                </div>
              );
            })}
          </div>
          {/* Conversion by channel */}
          <div style={card({padding:16})}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Taxa de conversão por canal</div>
            {RECEPTIVO_CANAIS.filter(ch=>porCanal[ch]>0).map(ch=>{
              const total = porCanal[ch]||0;
              const fechados = recLeads.filter(l=>(l.canal===ch||l.channel===ch)&&l.status==="Fechado").length;
              const taxa = total>0?Math.round(fechados/total*100):0;
              const color = ch==="WhatsApp"?"#25D366":ch==="Formulário"?"#6366F1":"#F59E0B";
              return (
                <div key={ch} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:C.text}}>{ch}</span>
                    <span style={{fontSize:12,fontWeight:700,color}}>{taxa}% ({fechados}/{total})</span>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:taxa+"%",background:color,borderRadius:4,transition:"width 0.5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Novo Contato */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setShowAdd(false)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>📥 Novo Contato Receptivo</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Registre um novo lead que chegou até você</div>

            <div style={{marginBottom:14}}>
              <div style={lbl}>Nome / Empresa *</div>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome do contato ou empresa" style={inp}/>
            </div>

            <div style={{marginBottom:14}}>
              <div style={lbl}>Canal de entrada *</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RECEPTIVO_CANAIS.map(ch=>(
                  <div key={ch} onClick={()=>setForm(f=>({...f,canal:ch}))}
                    style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:form.canal===ch?700:400,border:"1px solid "+(form.canal===ch?C.accent:C.border),background:form.canal===ch?(C.accent+"18"):"transparent",color:form.canal===ch?C.accent:C.muted}}>
                    {ch}
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <div style={lbl}>Telefone</div>
                <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(11) 9xxxx-xxxx" style={inp}/>
              </div>
              <div>
                <div style={lbl}>Email</div>
                <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com" style={inp}/>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={lbl}>O que precisa / Observação</div>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                placeholder="Breve descrição do que o cliente precisa..." rows={3}
                style={{...inp,resize:"vertical"}}/>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{...btnG,flex:1,padding:"10px"}}>Cancelar</button>
              <button onClick={addContato} style={{...btnP,flex:2,padding:"10px",fontSize:13}}>
                + Registrar Contato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhe do Lead */}
      {selLead&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setSelLead(null)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:480,boxShadow:"0 24px 64px rgba(0,0,0,0.6)",maxHeight:"80vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>{selLead.name}</div>
              <button onClick={()=>setSelLead(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>

            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"#fff",background:selLead.canal==="WhatsApp"?"#25D366":"#6366F1",padding:"3px 10px",borderRadius:20,fontWeight:700}}>{selLead.canal||selLead.channel}</span>
              <span style={{fontSize:11,color:C.muted}}>{hoursAgo(selLead.createdAt)}</span>
              {isUrgent(selLead)&&<span style={{fontSize:11,color:"#F87171",fontWeight:700}}>⚠️ Urgente</span>}
            </div>

            {selLead.notes&&<div style={{...card({padding:12}),marginBottom:16,fontSize:12,color:C.dim,fontStyle:"italic"}}>{selLead.notes}</div>}

            <div style={{marginBottom:16}}>
              <div style={lbl}>Mover para etapa</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {RECEPTIVO_STAGES.map(s=>{
                  const active = selLead.status===s.name||selLead.funilStage===s.id;
                  return (
                    <div key={s.id} onClick={()=>{updateStage(selLead,s.id);setSelLead({...selLead,funilStage:s.id,status:s.name});}}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,cursor:"pointer",border:"1px solid "+(active?s.color:C.border),background:active?(s.color+"18"):"transparent",transition:"all 0.15s"}}>
                      <span>{s.icon}</span>
                      <span style={{fontSize:12,fontWeight:active?700:400,color:active?s.color:C.muted}}>{s.name}</span>
                      {active&&<span style={{marginLeft:"auto",fontSize:10,color:s.color,fontWeight:700}}>✓ Atual</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Templates de resposta */}
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Respostas Rápidas</div>
              {(RECEPTIVO_TEMPLATES[selLead.canal]||RECEPTIVO_TEMPLATES["WhatsApp"]).slice(0,3).map(t=>{
                const txt = t.text(selLead,{});
                return (
                  <div key={t.id} style={{...card({padding:10,marginBottom:8}),borderLeft:"3px solid #25D366"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.text}}>{t.label}</span>
                      <CopyBtn text={txt}/>
                    </div>
                    <div style={{fontSize:11,color:C.dim,lineHeight:1.5}}>{txt.substring(0,100)}...</div>
                  </div>
                );
              })}
            </div>

            <div style={{display:"flex",gap:8,marginTop:16}}>
              {selLead.phone&&(
                <ContactPicker lead={selLead} type="phone" onSelect={(ph)=>{
                  const raw=ph.replace(/\D/g,"");
                  const phone=raw.startsWith("55")?raw:"55"+raw;
                  window.open("https://api.whatsapp.com/send?phone="+phone,"_blank");
                }}>
                  <button style={{...btnP,flex:1,padding:"9px",fontSize:12,background:"linear-gradient(135deg,#25D366,#128C7E)"}}>
                    📱 WhatsApp
                  </button>
                </ContactPicker>
              )}
              {selLead.email&&(
                <button onClick={()=>window.open("mailto:"+selLead.email,"_blank")}
                  style={{...btnP,flex:1,padding:"9px",fontSize:12,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)"}}>
                  ✉️ Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function OwnerPanel({ webhook, onWebhookChange }) {
  const [tab, setTab]         = useState("users");   // users | perms | limits | webhook
  const [users, setUsers]     = useState(DB.all());
  const [selUser, setSelUser] = useState(null);
  const [confirmId, setConfirmId] = useState(null);  // delete confirm
  const [form, setForm]       = useState({ name:"", email:"", password:"", role:"user" });
  const [showNew, setShowNew] = useState(false);
  const [ok, setOk]           = useState("");
  const [err, setErr]         = useState("");
  const refresh = () => { setUsers(DB.all()); };

  const purple = "#A855F7";
  const gold   = "#F59E0B";

  const notify = (msg, isErr=false) => {
    if(isErr) setErr(msg); else setOk(msg);
    setTimeout(()=>{ setOk(""); setErr(""); }, 3500);
  };

  // ── User actions ─────────────────────────────────────────────────────────
  const toggleStatus = (u) => {
    if(u.role==="owner") return;
    DB.update(u.id, { status: u.status==="ativo"?"cancelado":"ativo" });
    refresh();
    notify(`${u.name} ${u.status==="ativo"?"desabilitado":"reativado"}.`);
  };

  const deleteUser = (id) => {
    const u = DB.findById(id);
    if(!u || u.role==="owner") return;
    const i = USER_DB.findIndex(x=>x.id===id);
    if(i>=0) USER_DB.splice(i,1);
    refresh(); setConfirmId(null);
    if(selUser?.id===id) setSelUser(null);
    notify(`Conta de ${u.name} excluída permanentemente.`);
  };

  const resetPwd = (id) => {
    const u = DB.findById(id);
    if(!u || u.role==="owner") return;
    DB.update(id, { password:"reset2024" });
    refresh();
    notify(`Senha de ${u.name} resetada para "reset2024".`);
  };

  const changeRole = (id, newRole) => {
    const u = DB.findById(id);
    if(!u || u.role==="owner") return;
    const perms = newRole==="master" ? [...ALL_MODULES] : DEFAULT_USER_PERMS;
    DB.update(id, { role:newRole, perms });
    refresh();
    if(selUser?.id===id) setSelUser({ ...DB.findById(id) });
    notify(`${u.name} agora é ${newRole==="master"?"Master":"Usuário Padrão"}.`);
  };

  const addUser = () => {
    setErr("");
    if(!form.name||!form.email||!form.password){ setErr("Preencha todos os campos."); return; }
    if(!/\S+@\S+\.\S+/.test(form.email)){ setErr("E-mail inválido."); return; }
    if(DB.find(form.email)){ setErr("E-mail já cadastrado."); return; }
    const perms = form.role==="master"?[...ALL_MODULES]:DEFAULT_USER_PERMS;
    DB.add({ id:"u_"+Date.now(), name:form.name, email:form.email, password:form.password, role:form.role, status:"ativo", createdAt:new Date().toLocaleDateString("pt-BR"), lastLogin:null, perms });
    refresh();
    setForm({ name:"", email:"", password:"", role:"user" });
    setShowNew(false);
    notify(`Usuário ${form.name} criado com sucesso.`);
  };

  // ── Permissions for selected user ────────────────────────────────────────
  const togglePerm = (uid, mod) => {
    const u = DB.findById(uid);
    if(!u || u.role==="owner") return;
    const cur = u.perms || DEFAULT_USER_PERMS;
    const next = cur.includes(mod) ? cur.filter(m=>m!==mod) : [...cur, mod];
    DB.setPerms(uid, next);
    refresh();
    setSelUser({ ...DB.findById(uid) });
  };

  const setAllPerms = (uid, enable) => {
    const u = DB.findById(uid);
    if(!u || u.role==="owner") return;
    DB.setPerms(uid, enable ? [...ALL_MODULES] : ["dashboard"]);
    refresh();
    setSelUser({ ...DB.findById(uid) });
    notify(enable ? "Todos os módulos habilitados." : "Acesso restrito ao Dashboard.");
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const th = { textAlign:"left", padding:"9px 14px", fontSize:10, color:C.muted, letterSpacing:1.2, textTransform:"uppercase", fontWeight:700, borderBottom:("1px solid "+C.border) };
  const td = { padding:"10px 14px", borderBottom:("1px solid "+C.panel), verticalAlign:"middle" };
  const tabBtn = (t) => ({ padding:"8px 20px", borderRadius:8, border:("1px solid "+tab===t?purple:C.border), background:tab===t?(purple+"18"):"transparent", color:tab===t?purple:C.dim, fontWeight:tab===t?700:500, fontSize:13, cursor:"pointer" });
  const roleBadge = (r) => ({ fontSize:10, fontWeight:800, color:r==="owner"?purple:r==="master"?gold:C.accent, background:r==="owner"?(purple+"18"):r==="master"?(gold+"18"):(C.accent+"14"), border:("1px solid "+r==="owner"?purple+"44":r==="master"?gold+"44":C.accent+"33"), padding:"2px 9px", borderRadius:20 });

  // Build grouped modules - filter out owner for non-master users
  const GROUP_ORDER = ["Principal","Comunicação","Gestão","Módulos","Administração"];
  const rawModules = Object.entries(MODULE_META).map(([id,m])=>({id,...m}));
  const groupedModules = GROUP_ORDER.reduce((acc,grp)=>{
    const mods = rawModules.filter(m=>m.group===grp);
    if(mods.length>0) acc[grp] = mods;
    return acc;
  },{});

  return (
    <div>
      {/* Delete confirm modal */}
      {confirmId&&(
        <div style={{position:"fixed",inset:0,zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,14,28,0.92)",backdropFilter:"blur(4px)"}} onClick={()=>setConfirmId(null)}>
          <div style={{background:C.panel,border:"1px solid #F8717166",borderRadius:16,padding:28,width:420,boxShadow:"0 24px 64px rgba(0,0,0,0.8)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#F87171",marginBottom:8}}>⚠️ Excluir Conta Permanentemente</div>
            <div style={{fontSize:13,color:C.dim,marginBottom:20}}>A conta de <strong style={{color:C.text}}>{DB.findById(confirmId)?.name}</strong> será excluída permanentemente. Esta ação não pode ser desfeita.</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={btnG} onClick={()=>setConfirmId(null)}>Cancelar</button>
              <button style={{...btnD,padding:"9px 20px",fontSize:13,fontWeight:800}} onClick={()=>deleteUser(confirmId)}>🗑️ Excluir Permanentemente</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
            <div style={{fontSize:20,fontWeight:800,color:C.text}}>Painel Owner</div>
            <span style={{fontSize:11,fontWeight:800,color:purple,background:(purple+"18"),border:("1px solid "+purple+"44"),padding:"3px 12px",borderRadius:20}}>◆ OWNER</span>
          </div>
          <div style={{fontSize:12,color:C.muted}}>Controle soberano da plataforma OPEN Log</div>
        </div>
        <button style={{...btnP,background:("linear-gradient(135deg,"+purple+",#7C3AED)")}} onClick={()=>setShowNew(v=>!v)}>
          {showNew?"← Voltar":<><Icon d={IC.plus} size={14} color="#fff"/>Novo Usuário</>}
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
        {[
          ["Total",   users.length,                                    C.accent],
          ["Ativos",  users.filter(u=>u.status==="ativo").length,      "#4ADE80"],
          ["Inativos",users.filter(u=>u.status==="cancelado").length,  "#F87171"],
          ["Masters", users.filter(u=>u.role==="master").length,       gold],
          ["Owners",  users.filter(u=>u.role==="owner").length,        purple],
        ].map(([l,v,col])=>(
          <div key={l} style={card({padding:"14px 16px"})}>
            <div style={{fontSize:24,fontWeight:800,color:col,lineHeight:1}}>{v}</div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:1.2,textTransform:"uppercase",marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {ok&&<div style={{background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE8033",borderRadius:8,padding:"9px 14px",color:"#4ADE80",fontSize:12,fontWeight:600,marginBottom:14}}>✅ {ok}</div>}
      {err&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #F8717133",borderRadius:8,padding:"9px 14px",color:"#F87171",fontSize:12,marginBottom:14}}>⚠️ {err}</div>}

      {/* New user form */}
      {showNew&&(
        <div style={{...card({marginBottom:20}),borderLeft:("3px solid "+purple)}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16}}>➕ Criar Novo Usuário</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div><label style={lbl}>Nome</label><input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo" autoFocus/></div>
            <div><label style={lbl}>E-mail</label><input style={inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com.br"/></div>
            <div><label style={lbl}>Senha Inicial</label><input style={inp} type="text" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mín. 6 caracteres"/></div>
            <div><label style={lbl}>Nível</label>
              <select style={inp} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="user">👤 Usuário</option>
                <option value="master">★ Master</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button style={{...btnP,background:("linear-gradient(135deg,"+purple+",#7C3AED)")}} onClick={addUser}><Icon d={IC.check} size={14} color="#fff"/>Criar Usuário</button>
            <button style={btnG} onClick={()=>{ setShowNew(false); setErr(""); }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {[["users","👥 Usuários"],["perms","🔐 Permissões"],["limits","📊 Limites de Uso"],["funil","🏆 Funil de Vendas"],["metas","🎯 Metas"],["segmentos","🏷️ Segmentos"],["webhook","🔗 Webhook n8n"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={tabBtn(t)}>{l}</button>
        ))}
      </div>

      {/* ── TAB: USERS ────────────────────────────────────────────────────── */}
      {tab==="users"&&(
        <div style={card({padding:0,overflow:"hidden"})}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.sidebar}}>
              {["Usuário","Nível","Status","Cadastro","Último Acesso","Ações"].map(h=><th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={u.id} style={{background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                  <td style={td}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:u.role==="owner"?("linear-gradient(135deg,"+purple+",#7C3AED)"):u.role==="master"?("linear-gradient(135deg,"+gold+",#D97706)"):("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{u.name[0]}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{u.name}</div>
                        <div style={{fontSize:10,color:C.faint}}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={td}><span style={roleBadge(u.role)}>{u.role==="owner"?"◆ Owner":u.role==="master"?"★ Master":"👤 Usuário"}</span></td>
                  <td style={td}>
                    <span style={{fontSize:11,fontWeight:700,color:u.status==="ativo"?"#4ADE80":"#F87171",background:u.status==="ativo"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)",border:("1px solid "+u.status==="ativo"?"#4ADE8033":"#F8717133"),padding:"3px 10px",borderRadius:20}}>
                      {u.status==="ativo"?"● Ativo":"✕ Cancelado"}
                    </span>
                  </td>
                  <td style={{...td,fontSize:11,color:C.faint}}>{u.createdAt}</td>
                  <td style={{...td,fontSize:11,color:C.faint}}>{u.lastLogin||"-"}</td>
                  <td style={td}>
                    {u.role==="owner"
                      ? <span style={{fontSize:11,color:purple,fontWeight:700}}>◆ Soberano</span>
                      : <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {/* Toggle habilitar/desabilitar */}
                          <button onClick={()=>toggleStatus(u)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:("1px solid "+u.status==="ativo"?"#FBBF2433":"#4ADE8033"),background:u.status==="ativo"?"rgba(251,191,36,0.1)":"rgba(74,222,128,0.1)",color:u.status==="ativo"?"#FBBF24":"#4ADE80",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                            {u.status==="ativo"?"⏸ Desabilitar":"▶ Habilitar"}
                          </button>
                          {/* Permissões */}
                          <button onClick={()=>{ setSelUser(DB.findById(u.id)); setTab("perms"); }} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:("1px solid "+purple+"44"),background:(purple+"10"),color:purple,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                            🔐 Permissões
                          </button>
                          {/* Trocar nível */}
                          <button onClick={()=>changeRole(u.id, u.role==="master"?"user":"master")} style={{...btnG,padding:"5px 10px",fontSize:11}}>
                            {u.role==="master"?"↓ Rebaixar":"↑ Promover"}
                          </button>
                          {/* Reset senha */}
                          <button onClick={()=>resetPwd(u.id)} style={{...btnG,padding:"5px 10px",fontSize:11}}>🔑</button>
                          {/* Excluir */}
                          <button onClick={()=>setConfirmId(u.id)} style={{...btnD,padding:"5px 8px"}}><Icon d={IC.trash} size={12}/></button>
                        </div>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: PERMISSIONS ──────────────────────────────────────────────── */}
      {tab==="perms"&&(
        <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:16}}>
          {/* User selector */}
          <div style={card({padding:0,overflow:"hidden"})}>
            <div style={{padding:"10px 14px",borderBottom:("1px solid "+C.border),fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>Selecionar Usuário</div>
            {users.filter(u=>u.role!=="owner").map(u=>(
              <div key={u.id} onClick={()=>setSelUser(DB.findById(u.id))} style={{padding:"11px 14px",borderBottom:("1px solid "+C.panel),cursor:"pointer",background:selUser?.id===u.id?(purple+"10"):"transparent",borderLeft:selUser?.id===u.id?("3px solid "+purple):"3px solid transparent"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>{u.name}</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={roleBadge(u.role)}>{u.role==="master"?"★ Master":"👤 Usuário"}</span>
                  <span style={{fontSize:10,color:u.status==="ativo"?"#4ADE80":"#F87171",fontWeight:600}}>{u.status==="ativo"?"● Ativo":"✕ Inativo"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Permission toggles */}
          {selUser?(
            <div>
              <div style={{...card({padding:"14px 18px",marginBottom:14}),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{selUser.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{selUser.email} · <span style={roleBadge(selUser.role)}>{selUser.role==="master"?"★ Master":"👤 Usuário"}</span></div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setAllPerms(selUser.id,true)} style={{...btnP,padding:"7px 14px",fontSize:12}}>✅ Habilitar Tudo</button>
                  <button onClick={()=>setAllPerms(selUser.id,false)} style={{...btnD,padding:"7px 14px",fontSize:12}}>❌ Revogar Tudo</button>
                </div>
              </div>

              {Object.entries(groupedModules).map(([grp,mods])=>(
                <div key={grp} style={{...card({marginBottom:14})}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>{grp}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {mods.map(mod=>{
                      // dashboard is always enabled - can't be disabled
                      const isFixed = mod.id==="dashboard";
                      // master/owner modules only for master role
                      const isMasterOnly = mod.id==="master"||mod.id==="owner";
                      const enabled = (selUser.perms||DEFAULT_USER_PERMS).includes(mod.id);
                      const canToggle = !isFixed && !(isMasterOnly && selUser.role!=="master");
                      return (
                        <div key={mod.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:10,border:("1px solid "+enabled?C.accent+"44":C.border),background:enabled?(C.accent+"06"):"transparent",transition:"all 0.15s",opacity:canToggle?1:0.5}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:20}}>{mod.icon}</span>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:enabled?C.text:C.dim}}>{mod.label}</div>
                              <div style={{fontSize:10,color:C.faint}}>{mod.desc||("/"+mod.id)}</div>
                              {isFixed&&<div style={{fontSize:9,color:C.accent,marginTop:1}}>⚙️ Sempre ativo</div>}
                              {isMasterOnly&&selUser.role!=="master"&&<div style={{fontSize:9,color:"#F59E0B",marginTop:1}}>⚠️ Só para Master</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:10,fontWeight:700,color:enabled?"#4ADE80":"#F87171"}}>{enabled?"✅ Ativo":"⛔ Inativo"}</span>
                            <div onClick={()=>canToggle&&togglePerm(selUser.id,mod.id)}
                              style={{width:46,height:26,borderRadius:13,background:enabled?C.accent:C.border,cursor:canToggle?"pointer":"not-allowed",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                              <div style={{position:"absolute",top:3,left:enabled?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ):(
            <div style={{...card({padding:48,textAlign:"center"})}}>
              <div style={{fontSize:32,marginBottom:12}}>🔐</div>
              <div style={{fontSize:14,fontWeight:600,color:C.muted}}>Selecione um usuário à esquerda</div>
              <div style={{fontSize:12,color:C.faint,marginTop:4}}>para gerenciar seus módulos de acesso</div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: LIMITS ──────────────────────────────────────────────────── */}
      {tab==="limits"&&(<LimitsPanel users={users} purple={purple} onRefresh={refresh}/>)}

      {tab==="funil"&&(<FunnelConfig/>)}

      {tab==="segmentos"&&(<SegmentosConfig/>)}

      {tab==="metas"&&(<GoalsConfig users={users}/>)}

      {/* ── TAB: WEBHOOK ──────────────────────────────────────────────────── */}
      {tab==="webhook"&&(
        <div style={{maxWidth:600}}>
          <div style={{...card({marginBottom:16}),borderLeft:("3px solid "+purple)}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>🔗 Configuração do Webhook n8n</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Esta configuração é exclusiva do Owner e invisível para outros usuários.</div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>URL do Webhook n8n</label>
              <input style={inp} value={webhook} onChange={e=>onWebhookChange(e.target.value)} placeholder="https://seu-n8n.app.n8n.cloud/webhook/pipe-tm"/>
            </div>
            <div style={{background:C.sidebar,borderRadius:8,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8}}>Payload enviado ao n8n:</div>
              <pre style={{fontSize:10,color:"#C8DFF0",margin:0,overflow:"auto",whiteSpace:"pre-wrap"}}>{"{\"lead_id\": 1,\"lead_name\": \"Nome do Lead\",\"company\": \"Empresa\"}"}</pre>
            </div>
            <div style={{padding:"10px 14px",background:(purple+"10"),border:("1px solid "+purple+"33"),borderRadius:8,fontSize:12,color:"#C8DFF0"}}>
              💡 O botão de teste na aba de Envio WhatsApp está oculto. Para testar, cole a URL acima e dispare diretamente pela aba de Envio.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── MASTER ACCESS CONTROL PANEL ─────────────────────────────────────────────
function MasterPanel() {
  const [users,setUsers]=useState(DB.all());
  const [view,setView]=useState("list");
  const [form,setForm]=useState({name:"",email:"",password:"",role:"user"});
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const [confirmId,setConfirmId]=useState(null);
  const refresh=()=>setUsers(DB.all());

  const cancelUser=(id)=>{ DB.update(id,{status:"cancelado"}); refresh(); setConfirmId(null); setOk("Acesso cancelado."); setTimeout(()=>setOk(""),3000); };
  const reactivate=(id)=>{ DB.update(id,{status:"ativo"}); refresh(); setOk("Usuário reativado."); setTimeout(()=>setOk(""),3000); };
  const resetPwd=(id)=>{ DB.update(id,{password:"reset2024"}); refresh(); setOk('Senha resetada para "reset2024". Oriente o usuário a alterar.'); setTimeout(()=>setOk(""),5000); };
  const addUser=()=>{
    setErr("");
    if(!form.name||!form.email||!form.password){setErr("Preencha todos os campos.");return;}
    if(!/\S+@\S+\.\S+/.test(form.email)){setErr("E-mail inválido.");return;}
    if(DB.find(form.email)){setErr("E-mail já cadastrado.");return;}
    const nu={id:"u_"+Date.now(),name:form.name,email:form.email,password:form.password,role:form.role,status:"ativo",createdAt:new Date().toLocaleDateString("pt-BR"),lastLogin:null};
    DB.add(nu); refresh();
    setOk(`Usuário ${form.name} cadastrado!`); setForm({name:"",email:"",password:"",role:"user"}); setView("list");
    setTimeout(()=>setOk(""),4000);
  };

  const stats={total:users.length,ativos:users.filter(u=>u.status==="ativo").length,cancelados:users.filter(u=>u.status==="cancelado").length,masters:users.filter(u=>u.role==="master").length};
  const gold="#F59E0B";
  const th={textAlign:"left",padding:"10px 16px",fontSize:10,color:C.muted,letterSpacing:1.2,textTransform:"uppercase",fontWeight:700,borderBottom:("1px solid "+C.border)};
  const td={padding:"11px 16px",borderBottom:("1px solid "+C.panel),verticalAlign:"middle"};

  return (
    <div>
      {/* Confirm cancel modal */}
      {confirmId&&(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(6,14,28,0.9)",backdropFilter:"blur(4px)"}} onClick={()=>setConfirmId(null)}>
          <div style={{background:C.panel,border:"1px solid #F8717166",borderRadius:16,padding:28,width:400,boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:"#F87171",marginBottom:8}}>⚠️ Cancelar Acesso</div>
            <div style={{fontSize:13,color:C.dim,marginBottom:20}}>Cancelar acesso de <strong style={{color:C.text}}>{DB.findById(confirmId)?.name}</strong>? O usuário não poderá mais fazer login.</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={btnG} onClick={()=>setConfirmId(null)}>Não, voltar</button>
              <button style={{...btnD,padding:"9px 18px",fontSize:13,fontWeight:700}} onClick={()=>cancelUser(confirmId)}>Sim, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
            <div style={{fontSize:20,fontWeight:800,color:C.text}}>Controle de Acesso</div>
            <span style={{fontSize:11,fontWeight:800,color:gold,background:(gold+"18"),border:("1px solid "+gold+"44"),padding:"3px 10px",borderRadius:20}}>★ MASTER</span>
          </div>
          <div style={{fontSize:12,color:C.muted}}>Gestão completa de usuários da plataforma</div>
        </div>
        <button style={{...btnP,background:("linear-gradient(135deg,"+gold+",#D97706)")}} onClick={()=>{setView(v=>v==="list"?"new":"list");setErr("");}}>
          {view==="list"?<><Icon d={IC.plus} size={14} color="#fff"/>Novo Usuário</>:"← Ver Lista"}
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {[["Total",stats.total,C.accent],["Ativos",stats.ativos,"#4ADE80"],["Cancelados",stats.cancelados,"#F87171"],["Masters",stats.masters,gold]].map(([l,v,c])=>(
          <div key={l} style={card()}><div style={{fontSize:26,fontWeight:800,color:c,lineHeight:1}}>{v}</div><div style={{fontSize:11,color:C.muted,letterSpacing:1.2,textTransform:"uppercase",marginTop:4}}>{l}</div></div>
        ))}
      </div>

      {ok&&<div style={{background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE8033",borderRadius:8,padding:"10px 14px",color:"#4ADE80",fontSize:13,marginBottom:16,fontWeight:600}}>✅ {ok}</div>}

      {/* New user form */}
      {view==="new"&&(
        <div style={{...card({marginBottom:20}),borderLeft:("3px solid "+gold)}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16}}>➕ Cadastrar Novo Usuário</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label style={lbl}>Nome Completo</label><input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome do usuário" autoFocus/></div>
            <div><label style={lbl}>E-mail</label><input style={inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com.br"/></div>
            <div><label style={lbl}>Senha Inicial</label><input style={inp} type="text" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>
            <div><label style={lbl}>Nível de Acesso</label>
              <select style={inp} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="user">👤 Usuário Padrão</option>
                <option value="master">★ Master</option>
              </select>
            </div>
          </div>
          {err&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #F8717133",borderRadius:8,padding:"8px 12px",color:"#F87171",fontSize:12,marginBottom:12}}>⚠️ {err}</div>}
          <div style={{display:"flex",gap:10}}>
            <button style={{...btnP,background:("linear-gradient(135deg,"+gold+",#D97706)")}} onClick={addUser}><Icon d={IC.check} size={14} color="#fff"/>Cadastrar</button>
            <button style={btnG} onClick={()=>{setView("list");setErr("");}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* User table */}
      {view==="list"&&(
        <div style={card({padding:0,overflow:"hidden"})}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.sidebar}}>{["Usuário","E-mail","Nível","Status","Cadastro","Último Acesso","Ações"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={u.id} style={{background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                  <td style={td}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:u.role==="master"?("linear-gradient(135deg,"+gold+",#D97706)"):("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{u.name[0]}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{u.name}</div>
                        {u.role==="master"&&<div style={{fontSize:10,color:gold,fontWeight:700}}>★ Master</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{...td,fontSize:12,color:C.dim}}>{u.email}</td>
                  <td style={td}>
                    <span style={{fontSize:11,fontWeight:700,color:u.role==="master"?gold:C.accent,background:u.role==="master"?(gold+"18"):(C.accent+"14"),border:("1px solid "+u.role==="master"?gold+"44":C.accent+"33"),padding:"3px 10px",borderRadius:20}}>
                      {u.role==="master"?"★ Master":"👤 Padrão"}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{fontSize:11,fontWeight:700,color:u.status==="ativo"?"#4ADE80":"#F87171",background:u.status==="ativo"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)",border:("1px solid "+u.status==="ativo"?"#4ADE8033":"#F8717133"),padding:"3px 10px",borderRadius:20}}>
                      {u.status==="ativo"?"● Ativo":"✕ Cancelado"}
                    </span>
                  </td>
                  <td style={{...td,fontSize:11,color:C.faint}}>{u.createdAt}</td>
                  <td style={{...td,fontSize:11,color:C.faint}}>{u.lastLogin||"-"}</td>
                  <td style={td}>
                    {u.role==="master"
                      ? <span style={{fontSize:11,color:C.faint,fontStyle:"italic"}}>Protegido</span>
                      : <div style={{display:"flex",gap:6}}>
                          {u.status==="ativo"
                            ? <>
                                <button onClick={()=>resetPwd(u.id)} style={{...btnG,padding:"5px 10px",fontSize:11}}>🔑 Reset</button>
                                <button onClick={()=>setConfirmId(u.id)} style={{...btnD,padding:"5px 10px",fontSize:11}}>✕ Cancelar</button>
                              </>
                            : <button onClick={()=>reactivate(u.id)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:8,border:"1px solid #4ADE8033",background:"rgba(74,222,128,0.1)",color:"#4ADE80",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓ Reativar</button>
                          }
                        </div>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── ADD LEAD MANUALLY / AI ──────────────────────────────────────────────────
function AddLead({ onLeadsFound, existingLeads, profile }) {
  const [mode, setMode]     = useState("manual"); // manual | ai
  const [saved, setSaved]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [aiError, setAiError]     = useState("");
  const [aiQuery, setAiQuery]     = useState({ name:"", segment:"", city:"São Paulo" });

  const EMPTY = { name:"", company:"", role:"", email:"", phone:"", city:"São Paulo", channel:"Manual", priority:"Média", segment:"", cnpj:"", notes:"" };
  const [form, setForm] = useState(EMPTY);
  const [err,  setErr]  = useState("");

  const f = (k,v) => { setForm(p=>({...p,[k]:v})); setErr(""); };
  const channels = ["Manual","LinkedIn","Instagram","Google","Indicação","WhatsApp","Feira / Evento","Outro"];
  const priorities = ["Alta","Média","Baixa"];

  // ── Manual save ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    if(!form.name||!form.company){ setErr("Nome e empresa são obrigatórios."); return; }
    const existing = existingLeads.find(l=>
      l.name.toLowerCase()===form.name.toLowerCase() ||
      l.company.toLowerCase()===form.company.toLowerCase()
    );
    if(existing){ setErr(`"${existing.company}" já existe no CRM.`); return; }
    const lead = {
      ...form,
      id: Date.now(),
      score: form.priority==="Alta"?75:form.priority==="Média"?55:35,
      status: "Novo",
      cadence: [],
      createdAt: new Date().toISOString().split("T")[0],
      bestTime: null,
    };
    onLeadsFound(lead);
    setSaved(true);
    setForm(EMPTY);
    setTimeout(()=>setSaved(false), 2500);
  };

  // ── AI lookup ────────────────────────────────────────────────────────────────
  const handleAISearch = async () => {
    if(!aiQuery.name){ setAiError("Informe ao menos o nome da empresa."); return; }
    setAiLoading(true); setAiResult(null); setAiError("");
    const existingCompanies = existingLeads.map(l=>l.company.toLowerCase());
    const prompt = `Você é especialista em pesquisa de empresas B2B no Brasil. Encontre dados de contato para: Nome: ${aiQuery.name}, Cidade: ${aiQuery.city}, Segmento: ${aiQuery.segment}. Retorne APENAS JSON: {"name":"${aiQuery.name}","company":"${aiQuery.name}","role":"Diretor Comercial","city":"${aiQuery.city}","email":"contato@empresa.com.br","phone":"(11) 91234-5678","score":70,"notes":"Empresa do setor ${aiQuery.segment}"}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      const raw  = data.content?.map(i=>i.text||"").join("").trim().replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      setAiResult({ ...parsed, id:Date.now(), status:"Novo cliente", cadence:[], createdAt:new Date().toISOString().split("T")[0] });
    } catch(e) {
      setAiError("Não foi possível localizar os dados. Tente com mais detalhes ou cadastre manualmente.");
    }
    setAiLoading(false);
  };

  const handleConfirmAI = () => {
    if(!aiResult) return;
    const existing = existingLeads.find(l=>
      l.name.toLowerCase()===aiResult.name.toLowerCase() ||
      l.company.toLowerCase()===aiResult.company.toLowerCase()
    );
    if(existing){ setAiError(`"${existing.company}" já existe no CRM.`); return; }
    onLeadsFound(aiResult);
    setAiResult(null);
    setAiQuery({name:"",segment:"",city:"São Paulo"});
  };

  const sc = aiResult ? (aiResult.score>=70?"#4ADE80":aiResult.score>=40?"#FBBF24":"#F87171") : C.accent;

  return (
    <div style={{maxWidth:780}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Cadastrar Empresa</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:22}}>Adicione um lead manualmente ou deixe a IA localizar os dados automaticamente</div>

      {/* Mode switcher */}
      <div style={{display:"flex",background:C.sidebar,borderRadius:12,padding:4,marginBottom:22,width:"fit-content",gap:2}}>
        {[["manual","✏️ Cadastro Manual"],["ai","✨ Buscar com IA"]].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);setErr("");setAiError("");setAiResult(null);}} style={{padding:"9px 22px",borderRadius:9,border:"none",background:mode===m?C.panel:"transparent",color:mode===m?C.text:C.dim,fontWeight:mode===m?700:500,fontSize:13,cursor:"pointer",boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.3)":"none",transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>

      {/* ── MANUAL MODE ─────────────────────────────────────────────────────── */}
      {mode==="manual"&&(
        <div style={card()}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:18}}>📋 Dados do Lead</div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div>
              <label style={lbl}>Nome do Responsável *</label>
              <input style={inp} value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Ex: Carlos Mendes"/>
            </div>
            <div>
              <label style={lbl}>Empresa *</label>
              <input style={inp} value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ex: MedSupply Brasil"/>
            </div>
            <div>
              <label style={lbl}>Cargo / Função</label>
              <input style={inp} value={form.role} onChange={e=>f("role",e.target.value)} placeholder="Ex: Gerente Comercial"/>
            </div>
            <div>
              <label style={lbl}>Segmento</label>
              <input style={inp} value={form.segment} onChange={e=>f("segment",e.target.value)} placeholder="Ex: Distribuição de OPME"/>
            </div>
            <div>
              <label style={lbl}>CNPJ</label>
              <input style={inp} value={form.cnpj} onChange={e=>f("cnpj",e.target.value)} placeholder="00.000.000/0001-00"/>
            </div>
            <div>
              <label style={lbl}>Cidade</label>
              <input style={inp} value={form.city} onChange={e=>f("city",e.target.value)} placeholder="São Paulo, SP"/>
            </div>
            <div>
              <label style={lbl}>Telefone</label>
              <input style={inp} value={form.phone} onChange={e=>f("phone",e.target.value)} placeholder="(11) 9 9999-0000"/>
            </div>
            <div>
              <label style={lbl}>WhatsApp</label>
              <input style={inp} value={form.whatsapp||""} onChange={e=>f("whatsapp",e.target.value)} placeholder="(11) 9 9999-0000"/>
            </div>
            <div>
              <label style={lbl}>E-mail</label>
              <input style={inp} value={form.email} onChange={e=>f("email",e.target.value)} placeholder="contato@empresa.com.br"/>
            </div>
            <div>
              <label style={lbl}>Canal de Origem</label>
              <select style={inp} value={form.channel} onChange={e=>f("channel",e.target.value)}>
                {channels.map(ch=><option key={ch}>{ch}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Prioridade</label>
              <div style={{display:"flex",gap:8}}>
                {priorities.map(p=>{
                  const c=p==="Alta"?"#F87171":p==="Média"?"#FBBF24":"#4ADE80";
                  const a=form.priority===p;
                  return <button key={p} onClick={()=>f("priority",p)} style={{flex:1,padding:"9px",borderRadius:8,border:("1px solid "+a?c:C.border),background:a?(c+"18"):"transparent",color:a?c:C.dim,fontSize:12,fontWeight:a?700:500,cursor:"pointer"}}>{p}</button>;
                })}
              </div>
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <label style={lbl}>Observações / Notas</label>
            <textarea style={{...inp,minHeight:70,resize:"vertical"}} value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="Como conheceu este lead? Algum contexto relevante?"/>
          </div>

          {err&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #F8717133",borderRadius:8,padding:"9px 12px",color:"#F87171",fontSize:12,marginBottom:14}}>⚠️ {err}</div>}
          {saved&&<div style={{background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE8033",borderRadius:8,padding:"9px 12px",color:"#4ADE80",fontSize:12,marginBottom:14}}>✅ Lead cadastrado com sucesso e adicionado ao CRM!</div>}

          <div style={{display:"flex",gap:10}}>
            <button style={btnP} onClick={handleSave}><Icon d={IC.save} size={14} color="#fff"/>Salvar no CRM</button>
            <button style={btnG} onClick={()=>{setForm(EMPTY);setErr("");}}>Limpar</button>
          </div>
        </div>
      )}

      {/* ── AI MODE ─────────────────────────────────────────────────────────── */}
      {mode==="ai"&&(
        <div>
          <div style={card({marginBottom:16})}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>✨ Localizar Empresa com IA</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{gridColumn:"1 / 3"}}>
                <label style={lbl}>Nome da Empresa *</label>
                <input style={inp} value={aiQuery.name} onChange={e=>setAiQuery(q=>({...q,name:e.target.value}))} placeholder="Ex: MedSupply Brasil Ltda" onKeyDown={e=>e.key==="Enter"&&handleAISearch()}/>
              </div>
              <div>
                <label style={lbl}>Cidade</label>
                <input style={inp} value={aiQuery.city} onChange={e=>setAiQuery(q=>({...q,city:e.target.value}))} placeholder="São Paulo"/>
              </div>
              <div style={{gridColumn:"1 / -1"}}>
                <label style={lbl}>Segmento / Ramo (opcional)</label>
                <input style={inp} value={aiQuery.segment} onChange={e=>setAiQuery(q=>({...q,segment:e.target.value}))} placeholder="Ex: Distribuição de materiais cirúrgicos, hospitalar, OPME..."/>
              </div>
            </div>

            {aiError&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #F8717133",borderRadius:8,padding:"9px 12px",color:"#F87171",fontSize:12,marginBottom:14}}>⚠️ {aiError}</div>}

            <button style={{...btnP,width:"100%",justifyContent:"center"}} onClick={handleAISearch} disabled={aiLoading}>
              {aiLoading
                ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Localizando dados...</>
                : <>✨ Buscar Dados com IA</>
              }
            </button>

            <div style={{marginTop:12,fontSize:11,color:C.faint,textAlign:"center"}}>
              A IA identifica o decisor, cargo, contatos e melhor horário com base no perfil da empresa
            </div>
          </div>

          {/* AI Result card */}
          {aiResult&&(
            <div style={{...card(),borderLeft:("3px solid "+C.accent),animation:"fin 0.3s ease"}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>
                ✅ Dados Localizados - Revise antes de salvar
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                {[
                  ["Responsável", aiResult.name],
                  ["Empresa", aiResult.company],
                  ["Cargo", aiResult.role],
                  ["Cidade", aiResult.city],
                  ["E-mail", aiResult.email],
                  ["Telefone", aiResult.phone],
                  ["Canal", aiResult.channel],
                  ["Prioridade", aiResult.priority],
                ].map(([k,v])=>(
                  <div key={k} style={{background:C.sidebar,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{k}</div>
                    <div style={{fontSize:13,color:C.text,fontWeight:600}}>{v||"-"}</div>
                  </div>
                ))}
              </div>

              {/* Score + bestTime */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div style={{background:C.sidebar,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Score</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1,height:6,background:C.border,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:(aiResult.score+"%"),background:sc,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:14,fontWeight:800,color:sc}}>{aiResult.score}</span>
                  </div>
                </div>
                {aiResult.bestTime&&(
                  <div style={{background:C.sidebar,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Melhor Horário</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {aiResult.bestTime.slots?.map((s,i)=>(
                        <span key={i} style={{fontSize:11,fontWeight:700,color:C.accent,background:(C.accent+"14"),border:("1px solid "+C.accent+"33"),padding:"2px 8px",borderRadius:12}}>⏰ {s}</span>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:C.faint,marginTop:4}}>via {aiResult.bestTime.bestChannel} · {aiResult.bestTime.days?.join(", ")}</div>
                  </div>
                )}
              </div>

              {aiResult.notes&&(
                <div style={{background:C.sidebar,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#C8DFF0",fontStyle:"italic"}}>
                  💡 {aiResult.notes}
                </div>
              )}

              <div style={{display:"flex",gap:10}}>
                <button style={btnP} onClick={handleConfirmAI}><Icon d={IC.save} size={14} color="#fff"/>Confirmar e Salvar no CRM</button>
                <button style={btnG} onClick={()=>{setAiResult(null);setAiError("");}}>Descartar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({user}) {
  const [cfg,setCfg]=useState({company:"Pipe.TM",email:user?.email||"",signature:"Equipe Comercial\nPipe.TM | Prospecção Inteligente",webhook:"https://seu-n8n.app.n8n.cloud/webhook/pipe-tm",delay:"3"});
  const [saved,setSaved]=useState(false);
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return (
    <div style={{maxWidth:680}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>Configurações</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:22}}>Preferências gerais da plataforma</div>
      {[["🏢 Empresa","Dados corporativos",[["company","Nome"],["email","E-mail corporativo"]]],["✍️ Assinatura","Assinatura padrão dos e-mails",[["signature","Assinatura"]]],["⚙️ Integrações","Conexões externas",[["webhook","Webhook n8n"],["delay","Intervalo entre envios (s)"]]]].map(([title,sub,fields])=>(
      <div key={title} style={card({marginBottom:14})}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{title}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>{sub}</div>
        {fields.map(([k,label])=><div key={k} style={{marginBottom:12}}><label style={lbl}>{label}</label>{k==="signature"?<textarea style={{...inp,minHeight:60,resize:"vertical"}} value={cfg[k]} onChange={e=>setCfg(c=>({...c,[k]:e.target.value}))}/>:<input style={inp} value={cfg[k]} onChange={e=>setCfg(c=>({...c,[k]:e.target.value}))}/>}</div>)}
      </div>))}
      <div style={{...card({marginBottom:16}),background:(C.accent+"08"),border:("1px solid "+C.accent+"33")}}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>🔑 API de IA</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Gerenciada automaticamente pela plataforma.</div>
        <div style={{padding:"8px 12px",background:C.sidebar,borderRadius:8,fontSize:11,color:"#4ADE80",fontWeight:600}}>✅ Conectada e operacional</div>
      </div>
      <button style={btnP} onClick={save}><Icon d={IC.save} size={15} color="#fff"/>{saved?"✅ Salvo!":"Salvar Configurações"}</button>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
const DEFAULT_PROFILE={ companyName:"", segment:"", city:"São Paulo", founded:"", product:"", audience:"", coverage:"", history:"", differentials:"", valueProposition:"", cases:"" };

function Chev({o}) { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transition:"transform 0.2s",transform:o?"none":"rotate(180deg)"}}><path d="M15 18l-6-6 6-6"/></svg>; }

// ─── MÓDULO REATIVAÇÃO ────────────────────────────────────────────────────────
function Reativacao({ leads, onUpdateLead, onSetPage }) {
  const [filtro, setFiltro] = useState("todos");
  const [sel, setSel]       = useState(null);

  const DIAS_SEM_CONTATO = 15; // considera inativo após X dias

  const getDiasSemContato = (lead) => {
    if(!lead.cadence||lead.cadence.length===0){
      const d = new Date(lead.createdAt||Date.now());
      return Math.floor((Date.now()-d.getTime())/86400000);
    }
    const ultimos = lead.cadence
      .filter(c=>c.doneAt||c.date)
      .map(c=>new Date(c.doneAt||c.date).getTime());
    if(ultimos.length===0) return Math.floor((Date.now()-new Date(lead.createdAt||Date.now()).getTime())/86400000);
    return Math.floor((Date.now()-Math.max(...ultimos))/86400000);
  };

  // Leads sem contato há mais de X dias e não convertidos
  const inativos = leads.filter(l=>{
    if(l.module==="pos_venda"||l.module==="receptivo") return false;
    if(["Contratou","Perdido"].includes(l.status)) return false;
    return getDiasSemContato(l) >= DIAS_SEM_CONTATO;
  }).sort((a,b)=>getDiasSemContato(b)-getDiasSemContato(a));

  const filtrados = filtro==="todos" ? inativos
    : filtro==="frio"   ? inativos.filter(l=>getDiasSemContato(l)>=30)
    : filtro==="morno"  ? inativos.filter(l=>getDiasSemContato(l)>=15&&getDiasSemContato(l)<30)
    : inativos.filter(l=>["Proposta enviada","Negociando"].includes(l.status));

  const FILTROS = [
    {id:"todos",    label:"Todos",          count:inativos.length},
    {id:"morno",    label:"15-30 dias",     count:inativos.filter(l=>getDiasSemContato(l)>=15&&getDiasSemContato(l)<30).length},
    {id:"frio",     label:"30+ dias",       count:inativos.filter(l=>getDiasSemContato(l)>=30).length},
    {id:"proposta", label:"Com proposta",   count:inativos.filter(l=>["Proposta enviada","Negociando"].includes(l.status)).length},
  ];

  const getHeatColor = (dias) => dias>=45?"#F87171":dias>=30?"#F59E0B":dias>=15?"#FBBF24":"#6B7280";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>🔄 Reativação</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Leads sem contato há {DIAS_SEM_CONTATO}+ dias</div>
        </div>
        <button onClick={()=>onSetPage("messages")} style={{...btnP,padding:"9px 16px",fontSize:12}}>✉️ Ir para Mensagens</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}} className="mob-grid-1">
        <div style={{...card({padding:14}),borderLeft:"4px solid #FBBF24"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#FBBF24"}}>{inativos.filter(l=>getDiasSemContato(l)>=15&&getDiasSemContato(l)<30).length}</div>
          <div style={{fontSize:11,color:C.muted}}>🌡️ Mornos (15-30d)</div>
        </div>
        <div style={{...card({padding:14}),borderLeft:"4px solid #F59E0B"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#F59E0B"}}>{inativos.filter(l=>getDiasSemContato(l)>=30&&getDiasSemContato(l)<45).length}</div>
          <div style={{fontSize:11,color:C.muted}}>🧊 Frios (30-45d)</div>
        </div>
        <div style={{...card({padding:14}),borderLeft:"4px solid #F87171"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#F87171"}}>{inativos.filter(l=>getDiasSemContato(l)>=45).length}</div>
          <div style={{fontSize:11,color:C.muted}}>❄️ Inativos (45d+)</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {FILTROS.map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)}
            style={{padding:"6px 14px",borderRadius:20,border:"1px solid "+(filtro===f.id?C.accent:C.border),background:filtro===f.id?(C.accent+"18"):"transparent",color:filtro===f.id?C.accent:C.muted,fontSize:11,fontWeight:filtro===f.id?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {f.label} <span style={{fontWeight:900}}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length===0
        ?<div style={{...card({padding:40}),textAlign:"center",color:C.muted}}>
          <div style={{fontSize:32,marginBottom:12}}>🎉</div>
          <div>Nenhum lead inativo nesse filtro!</div>
        </div>
        :<div style={card({padding:0,overflow:"hidden"})}>
          {filtrados.map((l,i)=>{
            const dias = getDiasSemContato(l);
            const cor = getHeatColor(dias);
            return (
              <div key={l.id} onClick={()=>setSel(l)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<filtrados.length-1?"1px solid "+C.border:"none",cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.accent+"08"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:40,height:40,borderRadius:10,background:cor+"18",border:"1px solid "+cor+"33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:900,color:cor}}>{dias}d</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{l.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{l.status} · {l.city}</div>
                </div>
                <div style={{fontSize:10,color:cor,fontWeight:700,background:cor+"18",padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap"}}>
                  {dias>=45?"❄️ Inativo":dias>=30?"🧊 Frio":"🌡️ Morno"}
                </div>
              </div>
            );
          })}
        </div>
      }

      {/* Modal */}
      {sel&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setSel(null)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>{sel.name}</div>
              <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{sel.status} · {getDiasSemContato(sel)} dias sem contato</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {sel.phone&&(
                <ContactPicker lead={sel} type="phone" onSelect={(ph)=>{
                  const raw=ph.replace(/\D/g,"");
                  const phone=raw.startsWith("55")?raw:"55"+raw;
                  window.open("https://api.whatsapp.com/send?phone="+phone,"_blank");
                }}>
                  <button style={{...btnP,padding:"9px 14px",fontSize:12,background:"linear-gradient(135deg,#25D366,#128C7E)"}}>📱 WhatsApp</button>
                </ContactPicker>
              )}
              {sel.email&&(
                <button onClick={()=>window.open("mailto:"+sel.email,"_blank")}
                  style={{...btnP,padding:"9px 14px",fontSize:12,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)"}}>✉️ Email</button>
              )}
              <button onClick={()=>{setSel(null);onSetPage("messages");}}
                style={{...btnG,padding:"9px 14px",fontSize:12}}>💬 Ver Mensagens</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MÓDULO SUPORTE ───────────────────────────────────────────────────────────
function Suporte({ leads, onUpdateLead, currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm]       = useState({titulo:"", descricao:"", lead_id:"", prioridade:"Media", canal:"WhatsApp"});
  const [filtro, setFiltro]   = useState("todos");
  const [sel, setSel]         = useState(null);

  // Simulate tickets from local state (would be Supabase in production)
  const PRIORIDADE_COLOR = {Alta:"#F87171", Media:"#F59E0B", Baixa:"#4ADE80"};
  const STATUS_COLOR     = {Aberto:"#3B82F6", "Em andamento":"#F59E0B", Resolvido:"#4ADE80", Cancelado:"#F87171"};

  const createTicket = () => {
    if(!form.titulo) return;
    const novo = {
      id: Date.now(),
      titulo: form.titulo,
      descricao: form.descricao,
      lead_id: form.lead_id,
      lead_name: leads.find(l=>l.id===parseInt(form.lead_id))?.name||"—",
      prioridade: form.prioridade,
      canal: form.canal,
      status: "Aberto",
      user_id: currentUser?.id,
      user_name: currentUser?.name||"Usuário",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTickets(ts=>[novo,...ts]);
    setForm({titulo:"",descricao:"",lead_id:"",prioridade:"Media",canal:"WhatsApp"});
    setShowNew(false);
  };

  const updateStatus = (id, status) => {
    setTickets(ts=>ts.map(t=>t.id===id?{...t,status,updatedAt:new Date().toISOString()}:t));
    if(sel?.id===id) setSel(s=>({...s,status}));
  };

  const filtrados = filtro==="todos" ? tickets
    : tickets.filter(t=>t.status===filtro||(filtro==="alta"&&t.prioridade==="Alta"));

  const FILTROS = [
    {id:"todos",        label:"Todos",         count:tickets.length},
    {id:"Aberto",       label:"Abertos",       count:tickets.filter(t=>t.status==="Aberto").length},
    {id:"Em andamento", label:"Em andamento",  count:tickets.filter(t=>t.status==="Em andamento").length},
    {id:"Resolvido",    label:"Resolvidos",    count:tickets.filter(t=>t.status==="Resolvido").length},
    {id:"alta",         label:"Alta Prior.",   count:tickets.filter(t=>t.prioridade==="Alta").length},
  ];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>🎧 Suporte</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Gerencie tickets de atendimento ao cliente</div>
        </div>
        <button onClick={()=>setShowNew(true)} style={{...btnP,padding:"9px 18px",fontSize:13}}>+ Novo Ticket</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}} className="mob-grid-2">
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#3B82F6"}}>{tickets.filter(t=>t.status==="Aberto").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Abertos</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#F59E0B"}}>{tickets.filter(t=>t.status==="Em andamento").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Em andamento</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#4ADE80"}}>{tickets.filter(t=>t.status==="Resolvido").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Resolvidos</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#F87171"}}>{tickets.filter(t=>t.prioridade==="Alta"&&t.status==="Aberto").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Alta prior. abertos</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {FILTROS.map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)}
            style={{padding:"6px 14px",borderRadius:20,border:"1px solid "+(filtro===f.id?C.accent:C.border),background:filtro===f.id?(C.accent+"18"):"transparent",color:filtro===f.id?C.accent:C.muted,fontSize:11,fontWeight:filtro===f.id?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {f.label} <span style={{fontWeight:900}}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length===0
        ?<div style={{...card({padding:40}),textAlign:"center",color:C.muted}}>
          <div style={{fontSize:32,marginBottom:12}}>🎉</div>
          <div>{tickets.length===0?"Nenhum ticket criado ainda.":"Nenhum ticket nesse filtro."}</div>
        </div>
        :<div style={card({padding:0,overflow:"hidden"})}>
          {filtrados.map((t,i)=>{
            const sc = STATUS_COLOR[t.status]||C.muted;
            const pc = PRIORIDADE_COLOR[t.prioridade]||C.muted;
            return (
              <div key={t.id} onClick={()=>setSel(t)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<filtrados.length-1?"1px solid "+C.border:"none",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.accent+"08"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:4,height:40,borderRadius:2,background:pc,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{t.titulo}</div>
                  <div style={{fontSize:11,color:C.muted}}>{t.lead_name} · {t.user_name} · {t.createdAt?.substring(0,10)}</div>
                </div>
                <span style={{fontSize:9,color:sc,background:sc+"18",padding:"2px 8px",borderRadius:20,fontWeight:700,whiteSpace:"nowrap"}}>{t.status}</span>
              </div>
            );
          })}
        </div>
      }

      {/* Modal novo ticket */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setShowNew(false)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:20}}>🎧 Novo Ticket</div>
            <div style={{marginBottom:14}}>
              <div style={lbl}>Título *</div>
              <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Descreva o problema..." style={inp}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <div style={lbl}>Prioridade</div>
                <select value={form.prioridade} onChange={e=>setForm(f=>({...f,prioridade:e.target.value}))} style={inp}>
                  <option>Alta</option><option>Media</option><option>Baixa</option>
                </select>
              </div>
              <div>
                <div style={lbl}>Canal</div>
                <select value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))} style={inp}>
                  <option>WhatsApp</option><option>Email</option><option>Ligação</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={lbl}>Lead relacionado</div>
              <select value={form.lead_id} onChange={e=>setForm(f=>({...f,lead_id:e.target.value}))} style={inp}>
                <option value="">Selecione...</option>
                {leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:20}}>
              <div style={lbl}>Descrição</div>
              <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                rows={3} placeholder="Detalhes do atendimento..." style={{...inp,resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowNew(false)} style={{...btnG,flex:1,padding:"10px"}}>Cancelar</button>
              <button onClick={createTicket} style={{...btnP,flex:2,padding:"10px",fontSize:13,fontWeight:700}}>Criar Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe ticket */}
      {sel&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setSel(null)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>{sel.titulo}</div>
              <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{sel.lead_name} · {sel.user_name} · {sel.createdAt?.substring(0,10)}</div>
            {sel.descricao&&<div style={{...card({padding:12}),fontSize:12,color:C.dim,marginBottom:16}}>{sel.descricao}</div>}
            <div style={lbl}>Atualizar status</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["Aberto","Em andamento","Resolvido","Cancelado"].map(st=>{
                const active=sel.status===st;
                const sc=STATUS_COLOR[st]||C.muted;
                return (
                  <div key={st} onClick={()=>updateStatus(sel.id,st)}
                    style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:400,border:"1px solid "+(active?sc:C.border),background:active?(sc+"18"):"transparent",color:active?sc:C.muted}}>
                    {st}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── MÓDULO PÓS-VENDA ────────────────────────────────────────────────────────
function PosVenda({ currentUser }) {
  const [tab, setTab]           = useState("clientes"); // clientes | agenda
  const [clientes, setClientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [sel,      setSel]      = useState(null);
  const [filtro,   setFiltro]   = useState("todos");
  const [busca,    setBusca]    = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    nome:"", cpf_cnpj:"", telefone:"", data_relacionamento:"",
    data_agendamento:"", vendedor:"",
  });
  const [lote, setLote] = useState([]); // múltiplos contatos

  const tenantId = currentUser?.tenant_id || "072b33d2-46ff-4bf2-839b-ee5d33fe6cb7";
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const loadClientes = async () => {
    setLoading(true);
    try {
      const rows = await sbFetch("pos_venda?select=*&tenant_id=eq."+tenantId+"&order=created_at.desc");
      setClientes(Array.isArray(rows)?rows:[]);
      setError("");
    } catch(e) {
      setError("Erro ao carregar: "+e.message);
    } finally { setLoading(false); }
  };

  const loadAgendamentos = async () => {
    try {
      const rows = await sbFetch("pos_venda_agenda?select=*&tenant_id=eq."+tenantId+"&order=data_agendamento.asc");
      setAgendamentos(Array.isArray(rows)?rows:[]);
    } catch(e) { console.warn(e); }
  };

  useEffect(()=>{
    loadClientes();
    loadAgendamentos();
  },[]);

  const addToLote = () => {
    if(!form.nome||!form.telefone){ setError("Nome e telefone são obrigatórios."); return; }
    setLote(l=>[...l,{...form,id:Date.now()}]);
    setForm({nome:"",cpf_cnpj:"",telefone:"",data_relacionamento:"",data_agendamento:form.data_agendamento,vendedor:form.vendedor});
    setError("");
  };

  const removeFromLote = (id) => setLote(l=>l.filter(x=>x.id!==id));

  const salvarAgendamentos = async () => {
    const lista = lote.length>0 ? lote : (form.nome&&form.telefone?[form]:[]);
    if(lista.length===0){ setError("Adicione ao menos um contato."); return; }
    if(!lista[0].data_agendamento){ setError("Data/hora do acionamento é obrigatória."); return; }
    setSaving(true); setError("");
    try {
      for(const item of lista){
        await sbFetch("pos_venda_agenda", "POST", {
          nome: item.nome,
          cpf_cnpj: item.cpf_cnpj||null,
          telefone: item.telefone,
          data_relacionamento: item.data_relacionamento||null,
          data_agendamento: item.data_agendamento,
          vendedor: item.vendedor||null,
          tenant_id: tenantId,
          user_id: currentUser?.id||null,
          status: "pendente",
        });
      }
      setLote([]);
      setForm({nome:"",cpf_cnpj:"",telefone:"",data_relacionamento:"",data_agendamento:"",vendedor:""});
      setShowForm(false);
      loadAgendamentos();
    } catch(e){
      setError("Erro ao salvar: "+e.message);
    } finally { setSaving(false); }
  };

  // Filters for clientes tab
  const filtered = clientes.filter(c=>{
    const matchFiltro = filtro==="todos" ? true
      : filtro==="aguardando"  ? c.status_envio==="Aguardando"
      : filtro==="enviado"     ? c.status_envio==="Enviado"
      : filtro==="respondeu"   ? c.status_envio==="Respondeu"
      : filtro==="conversa"    ? c.status_envio==="Em conversa"
      : c.status_envio==="Sem resposta";
    const matchBusca = !busca ||
      (c.nome||"").toLowerCase().includes(busca.toLowerCase()) ||
      (c.razao_social||"").toLowerCase().includes(busca.toLowerCase()) ||
      (c.celular||"").includes(busca);
    return matchFiltro && matchBusca;
  });

  const STATUS_COLORS = {
    "Aguardando":   "#6B7280",
    "Enviado":      "#3B82F6",
    "Respondeu":    "#8B5CF6",
    "Em conversa":  "#F59E0B",
    "Finalizado":   "#4ADE80",
    "Sem resposta": "#F87171",
  };

  const AGENDA_STATUS_COLORS = {
    "pendente":    "#F59E0B",
    "processado":  "#4ADE80",
    "erro":        "#F87171",
  };

  const total      = clientes.length;
  const enviados   = clientes.filter(c=>c.status_envio!=="Aguardando").length;
  const respondeu  = clientes.filter(c=>["Respondeu","Em conversa","Finalizado"].includes(c.status_envio)).length;
  const aguardando = clientes.filter(c=>c.status_envio==="Aguardando").length;
  const txResposta = enviados>0?Math.round((respondeu/enviados)*100):0;

  const agPendentes   = agendamentos.filter(a=>a.status==="pendente").length;
  const agProcessados = agendamentos.filter(a=>a.status==="processado").length;

  const FILTROS = [
    {id:"todos",        label:"Todos",       count:total},
    {id:"aguardando",   label:"Aguardando",  count:aguardando},
    {id:"enviado",      label:"Enviados",    count:clientes.filter(c=>c.status_envio==="Enviado").length},
    {id:"respondeu",    label:"Responderam", count:respondeu},
    {id:"sem_resposta", label:"Sem resposta",count:clientes.filter(c=>c.status_envio==="Sem resposta").length},
  ];

  const updateStatus = async (id, status) => {
    try {
      await sbFetch("pos_venda?id=eq."+id, "PATCH", {status_envio: status});
      setClientes(cs=>cs.map(c=>c.id===id?{...c,status_envio:status}:c));
      if(sel?.id===id) setSel(s=>({...s,status_envio:status}));
    } catch(e) { setError(e.message); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>🤝 Pós-venda</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Gestão de clientes e acionamentos</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {tab==="agenda"&&<button onClick={()=>setShowForm(true)} style={{...btnP,padding:"9px 18px",fontSize:13}}>+ Agendar Acionamento</button>}
          <button onClick={()=>{loadClientes();loadAgendamentos();}} style={{...btnG,padding:"8px 14px",fontSize:12}}>🔄 Atualizar</button>
        </div>
      </div>

      {error&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(248,113,113,0.1)",border:"1px solid #F87171",borderRadius:8,fontSize:12,color:"#F87171"}}>{error}<button onClick={()=>setError("")} style={{marginLeft:8,background:"transparent",border:"none",color:"#F87171",cursor:"pointer"}}>✕</button></div>}

      {/* Tabs principais */}
      <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden"}}>
        {[["clientes","📋 Clientes ativos"],["agenda","📅 Agendamentos"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{flex:1,padding:"10px",border:"none",background:tab===v?C.accent:"transparent",color:tab===v?"#fff":C.muted,fontWeight:tab===v?700:400,fontSize:12,cursor:"pointer",transition:"all 0.15s"}}>
            {l}
            {v==="agenda"&&agPendentes>0&&<span style={{marginLeft:6,background:"#F59E0B",color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{agPendentes}</span>}
          </button>
        ))}
      </div>

      {/* ── ABA CLIENTES ── */}
      {tab==="clientes"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}} className="mob-grid-2">
            <div style={card({padding:14})}><div style={{fontSize:22,fontWeight:900,color:C.accent}}>{total}</div><div style={{fontSize:11,color:C.muted}}>Total clientes</div></div>
            <div style={card({padding:14})}><div style={{fontSize:22,fontWeight:900,color:"#3B82F6"}}>{enviados}</div><div style={{fontSize:11,color:C.muted}}>Acionados</div></div>
            <div style={card({padding:14})}><div style={{fontSize:22,fontWeight:900,color:"#8B5CF6"}}>{respondeu}</div><div style={{fontSize:11,color:C.muted}}>Responderam</div></div>
            <div style={card({padding:14})}><div style={{fontSize:22,fontWeight:900,color:"#4ADE80"}}>{txResposta+"%"}</div><div style={{fontSize:11,color:C.muted}}>Taxa resposta</div></div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
            {FILTROS.map(f=>(
              <button key={f.id} onClick={()=>setFiltro(f.id)}
                style={{padding:"6px 14px",borderRadius:20,border:"1px solid "+(filtro===f.id?C.accent:C.border),background:filtro===f.id?(C.accent+"18"):"transparent",color:filtro===f.id?C.accent:C.muted,fontSize:11,fontWeight:filtro===f.id?700:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {f.label} <span style={{fontWeight:900}}>{f.count}</span>
              </button>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..." style={{...inp,width:"100%"}}/>
          </div>
          {loading
            ?<div style={{textAlign:"center",padding:40,color:C.muted}}>⟳ Carregando...</div>
            :filtered.length===0
              ?<div style={{...card({padding:40}),textAlign:"center",color:C.muted}}>
                <div style={{fontSize:32,marginBottom:12}}>🤝</div>
                <div>{clientes.length===0?"Nenhum cliente ainda.":"Nenhum resultado."}</div>
              </div>
              :<div style={card({padding:0,overflow:"hidden"})}>
                {filtered.map((c,i)=>{
                  const sc=STATUS_COLORS[c.status_envio]||C.muted;
                  return (
                    <div key={c.id} onClick={()=>setSel(c)}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<filtered.length-1?"1px solid "+C.border:"none",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.accent+"08"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:sc+"18",border:"1px solid "+sc+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                        {c.tipo_pessoa==="PJ"?"🏢":"👤"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nome_formatado||c.nome||c.razao_social}</div>
                        <div style={{fontSize:11,color:C.muted}}>{c.celular||c.whatsapp||"—"}{c.vendedor?" · "+c.vendedor:""}</div>
                      </div>
                      <span style={{fontSize:9,color:sc,background:sc+"18",padding:"2px 8px",borderRadius:20,fontWeight:700,whiteSpace:"nowrap"}}>{c.status_envio||"Aguardando"}</span>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── ABA AGENDAMENTOS ── */}
      {tab==="agenda"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}} className="mob-grid-1">
            <div style={{...card({padding:14}),borderLeft:"4px solid #F59E0B"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#F59E0B"}}>{agPendentes}</div>
              <div style={{fontSize:11,color:C.muted}}>Pendentes</div>
            </div>
            <div style={{...card({padding:14}),borderLeft:"4px solid #4ADE80"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#4ADE80"}}>{agProcessados}</div>
              <div style={{fontSize:11,color:C.muted}}>Processados</div>
            </div>
            <div style={{...card({padding:14}),borderLeft:"4px solid #F87171"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#F87171"}}>{agendamentos.filter(a=>a.status==="erro").length}</div>
              <div style={{fontSize:11,color:C.muted}}>Com erro</div>
            </div>
          </div>

          {agendamentos.length===0
            ?<div style={{...card({padding:40}),textAlign:"center",color:C.muted}}>
              <div style={{fontSize:32,marginBottom:12}}>📅</div>
              <div>Nenhum agendamento ainda.</div>
              <button onClick={()=>setShowForm(true)} style={{...btnP,padding:"10px 24px",marginTop:16}}>+ Agendar Acionamento</button>
            </div>
            :<div style={card({padding:0,overflow:"hidden"})}>
              {agendamentos.map((a,i)=>{
                const sc = AGENDA_STATUS_COLORS[a.status]||C.muted;
                const dt = new Date(a.data_agendamento);
                return (
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<agendamentos.length-1?"1px solid "+C.border:"none"}}>
                    <div style={{width:40,textAlign:"center",flexShrink:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.accent}}>{dt.getDate().toString().padStart(2,"0")}/{(dt.getMonth()+1).toString().padStart(2,"0")}</div>
                      <div style={{fontSize:10,color:C.faint}}>{dt.getHours().toString().padStart(2,"0")}:{dt.getMinutes().toString().padStart(2,"0")}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{a.nome}</div>
                      <div style={{fontSize:11,color:C.muted}}>{a.telefone}{a.vendedor?" · "+a.vendedor:""}</div>
                    </div>
                    <span style={{fontSize:9,color:sc,background:sc+"18",padding:"2px 8px",borderRadius:20,fontWeight:700,whiteSpace:"nowrap",textTransform:"capitalize"}}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* Modal detalhe cliente */}
      {sel&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setSel(null)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:0,width:"100%",maxWidth:480,boxShadow:"0 24px 64px rgba(0,0,0,0.6)",maxHeight:"85vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"20px 24px 16px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>{sel.nome_formatado||sel.nome||sel.razao_social}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{sel.razao_social}</div>
                <div style={{fontSize:11,color:C.faint,marginTop:2}}>{sel.cpf_cnpj} · {sel.tipo_pessoa||sel.tipo}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{padding:"16px 24px",borderBottom:"1px solid "+C.border}}>
              <div style={{fontSize:11,color:C.faint,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Contato</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {sel.celular&&<div style={{fontSize:13,color:C.text}}>📱 {sel.celular}</div>}
                {sel.email&&<div style={{fontSize:13,color:C.text}}>✉️ {sel.email}</div>}
                {sel.estado&&<div style={{fontSize:13,color:C.text}}>📍 {sel.estado}</div>}
                {sel.vendedor&&<div style={{fontSize:13,color:C.text}}>👤 {sel.vendedor}</div>}
              </div>
            </div>
            <div style={{padding:"16px 24px",borderBottom:"1px solid "+C.border}}>
              <div style={{fontSize:11,color:C.faint,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Status</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {["Aguardando","Enviado","Respondeu","Em conversa","Agendou reunião","Sem resposta"].map(st=>{
                  const active=sel.status_envio===st;
                  const sc=STATUS_COLORS[st]||C.muted;
                  return (
                    <div key={st} onClick={()=>updateStatus(sel.id,st)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,cursor:"pointer",border:"1px solid "+(active?sc:C.border),background:active?(sc+"12"):"transparent",transition:"all 0.15s"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:active?sc:C.border,flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:active?700:400,color:active?sc:C.muted}}>{st}</span>
                      {active&&<span style={{marginLeft:"auto",fontSize:10,color:sc,fontWeight:700}}>✓ Atual</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{padding:"16px 24px",display:"flex",gap:8,flexWrap:"wrap"}}>
              {(sel.celular||sel.whatsapp)&&(
                <button onClick={()=>{
                  const raw=((sel.whatsapp||sel.celular)||"").replace(/\D/g,"");
                  const phone=raw.startsWith("55")?raw:"55"+raw;
                  window.open("https://api.whatsapp.com/send?phone="+phone,"_blank");
                }} style={{...btnP,flex:1,padding:"9px",fontSize:12,background:"linear-gradient(135deg,#25D366,#128C7E)"}}>📱 WhatsApp</button>
              )}
              {sel.email&&<button onClick={()=>window.open("mailto:"+sel.email,"_blank")} style={{...btnP,flex:1,padding:"9px",fontSize:12,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)"}}>✉️ Email</button>}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agendar Acionamento */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setShowForm(false)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:520,boxShadow:"0 24px 64px rgba(0,0,0,0.6)",maxHeight:"90vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>📅 Agendar Acionamento</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Preencha os dados do contato e defina quando disparar</div>

            {/* Data/hora e vendedor — campos globais do lote */}
            <div style={{...card({padding:14}),marginBottom:16,border:"1px solid "+C.accent+"44",background:C.accent+"06"}}>
              <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Configuração do acionamento</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="mob-grid-1">
                <div>
                  <div style={lbl}>Data e hora do disparo *</div>
                  <input type="datetime-local" value={form.data_agendamento}
                    onChange={e=>f("data_agendamento",e.target.value)} style={inp}/>
                </div>
                <div>
                  <div style={lbl}>Vendedor responsável</div>
                  <input value={form.vendedor} onChange={e=>f("vendedor",e.target.value)}
                    placeholder="Nome do vendedor" style={inp}/>
                </div>
              </div>
            </div>

            {/* Dados do contato */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Dados do contato</div>
                <label style={{...btnG,padding:"5px 12px",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  📎 Importar CSV/Excel
                  <input type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}}
                    onChange={async(e)=>{
                      const file = e.target.files[0];
                      if(!file) return;
                      const ext = file.name.split(".").pop().toLowerCase();
                      try {
                        if(ext==="csv"){
                          const text = await file.text();
                          const rows = text.trim().split("\n");
                          const header = rows[0].split(/[;,]/).map(h=>h.trim().toLowerCase().replace(/"/g,""));
                          const getCol = (row, names) => {
                            const idx = names.map(n=>header.indexOf(n)).find(i=>i>=0);
                            return idx>=0 ? row[idx]?.replace(/"/g,"")?.trim() : "";
                          };
                          const imported = rows.slice(1).filter(r=>r.trim()).map(row=>{
                            const cols = row.split(/[;,]/);
                            return {
                              id: Date.now()+Math.random(),
                              nome: getCol(cols,["nome","name","cliente","razao_social","razão social"]),
                              telefone: getCol(cols,["telefone","celular","fone","phone","tel"]),
                              cpf_cnpj: getCol(cols,["cpf","cnpj","cpf_cnpj","documento"]),
                              data_relacionamento: getCol(cols,["data_relacionamento","data_contato","ultimo_contato","data"]),
                              data_agendamento: getCol(cols,["data_agendamento","data","hora","disparo"])||form.data_agendamento,
                              vendedor: getCol(cols,["vendedor","seller","responsavel"])||form.vendedor,
                            };
                          }).filter(r=>r.nome&&r.telefone);
                          setLote(l=>[...l,...imported]);
                        } else {
                          setError("Por enquanto só CSV é suportado. Salve seu Excel como CSV e tente novamente.");
                        }
                      } catch(err) {
                        setError("Erro ao importar: "+err.message);
                      }
                      e.target.value="";
                    }}/>
                </label>
              </div>
              <div style={{fontSize:10,color:C.faint,marginBottom:10,padding:"6px 10px",background:C.sidebar,borderRadius:6}}>
                📋 CSV deve ter colunas: <strong>nome</strong>, <strong>telefone</strong>, <strong>data_agendamento</strong> (obrigatórios) + cpf_cnpj, data_relacionamento, vendedor (opcionais). Separador: vírgula ou ponto-e-vírgula. Data no formato: AAAA-MM-DD HH:MM
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}} className="mob-grid-1">
                <div>
                  <div style={lbl}>Nome *</div>
                  <input value={form.nome} onChange={e=>f("nome",e.target.value)}
                    placeholder="Nome completo" style={inp}/>
                </div>
                <div>
                  <div style={lbl}>Telefone com DDD *</div>
                  <input value={form.telefone} onChange={e=>f("telefone",e.target.value)}
                    placeholder="11999999999" style={inp}/>
                </div>
                <div>
                  <div style={lbl}>CPF/CNPJ</div>
                  <input value={form.cpf_cnpj} onChange={e=>f("cpf_cnpj",e.target.value)}
                    placeholder="000.000.000-00" style={inp}/>
                  <div style={{fontSize:9,color:C.faint,marginTop:3}}>Pontos e traços removidos automaticamente</div>
                </div>
                <div>
                  <div style={lbl}>Data do último contato com a loja</div>
                  <input type="date" value={form.data_relacionamento} onChange={e=>f("data_relacionamento",e.target.value)} style={inp}/>
                </div>
              </div>
              <button onClick={addToLote} style={{...btnG,width:"100%",padding:"9px",fontSize:12}}>
                + Adicionar à lista
              </button>
            </div>

            {/* Lista do lote */}
            {lote.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8}}>{lote.length} contato{lote.length>1?"s":""} na lista</div>
                <div style={{maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                  {lote.map(item=>(
                    <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.sidebar,borderRadius:8,border:"1px solid "+C.border}}>
                      <div style={{flex:1}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.text}}>{item.nome}</span>
                        <span style={{fontSize:11,color:C.muted,marginLeft:8}}>{item.telefone}</span>
                        {item.cpf_cnpj&&<span style={{fontSize:10,color:C.faint,marginLeft:8}}>{item.cpf_cnpj}</span>}
                      </div>
                      <button onClick={()=>removeFromLote(item.id)}
                        style={{background:"transparent",border:"none",color:"#F87171",cursor:"pointer",fontSize:14}}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error&&<div style={{marginBottom:12,padding:"8px 12px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,fontSize:12,color:"#F87171"}}>{error}</div>}

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowForm(false);setLote([]);setError("");}} style={{...btnG,flex:1,padding:"11px"}}>Cancelar</button>
              <button onClick={salvarAgendamentos} disabled={saving}
                style={{...btnP,flex:2,padding:"11px",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?"⟳ Salvando...":(lote.length>0?"📅 Salvar "+lote.length+" contatos":"📅 Salvar agendamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function WebhooksConfig({ tenants, onSaved }) {
  const [selTenant, setSelTenant] = useState(tenants[0]?.id||"");
  const [webhooks, setWebhooks]   = useState({busca_leads:"",pos_resposta:""});
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(()=>{
    if(!selTenant) return;
    const t = tenants.find(t=>t.id===selTenant);
    if(!t) return;
    try {
      const cfg = typeof t.config==="string"?JSON.parse(t.config||"{}"):( t.config||{});
      setWebhooks({busca_leads:cfg.webhooks?.busca_leads||"",pos_resposta:cfg.webhooks?.pos_resposta||""});
    } catch(e){ setWebhooks({busca_leads:"",pos_resposta:""}); }
  },[selTenant, tenants]);

  const saveWebhooks = async () => {
    if(!selTenant) return;
    setLoading(true);
    try {
      const t = tenants.find(t=>t.id===selTenant);
      const existingCfg = typeof t?.config==="string"?JSON.parse(t?.config||"{}"):( t?.config||{});
      await sbFetch("tenants?id=eq."+selTenant,"PATCH",{config: JSON.stringify({...existingCfg, webhooks})});
      setSaved(true); setTimeout(()=>setSaved(false),2000);
      if(onSaved) onSaved("Webhooks salvos");
    } catch(e){ alert("Erro ao salvar: "+e.message); }
    finally { setLoading(false); }
  };

  const FIELDS = [
    {key:"busca_leads",  label:"Busca de Leads",     placeholder:"https://n8n.app/webhook/busca-leads",  desc:"Chamado quando vendedor busca novos leads"},
    {key:"pos_resposta", label:"Resposta do Cliente", placeholder:"https://n8n.app/webhook/pos-resposta", desc:"Acionado quando cliente responde via WhatsApp"},
  ];

  const currentTenant = tenants.find(t=>t.id===selTenant);

  return (
    <div>
      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>Configurar Webhooks por Empresa</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Selecione a empresa e configure as URLs dos fluxos N8N.</div>
      <div style={{...card({padding:16}),marginBottom:20}}>
        <div style={lbl}>Empresa</div>
        <select value={selTenant} onChange={e=>setSelTenant(e.target.value)} style={inp}>
          <option value="">Selecione...</option>
          {tenants.map(t=>(<option key={t.id} value={t.id}>{t.name}</option>))}
        </select>
        {currentTenant&&(
          <div style={{marginTop:10,padding:"8px 12px",background:C.sidebar,borderRadius:6}}>
            <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:4}}>TENANT ID</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,fontSize:11,color:C.accent,fontFamily:"monospace"}}>{currentTenant.id}</div>
              <button onClick={()=>navigator.clipboard&&navigator.clipboard.writeText(currentTenant.id)} style={{...btnG,padding:"4px 10px",fontSize:10}}>Copiar</button>
            </div>
          </div>
        )}
      </div>
      {selTenant&&(
        <div style={{...card({padding:20}),marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16}}>URLs dos Fluxos N8N</div>
          {FIELDS.map(field=>(
            <div key={field.key} style={{marginBottom:16,padding:"14px 16px",background:C.sidebar,borderRadius:10,border:"1px solid "+C.border}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{field.label}</div>
              <div style={{fontSize:11,color:C.faint,marginBottom:8}}>{field.desc}</div>
              <input style={inp} value={webhooks[field.key]||""} onChange={e=>setWebhooks(w=>({...w,[field.key]:e.target.value}))} placeholder={field.placeholder}/>
              {webhooks[field.key]?<div style={{fontSize:9,color:"#4ADE80",marginTop:4}}>Configurado</div>:<div style={{fontSize:9,color:"#F59E0B",marginTop:4}}>Nao configurado</div>}
            </div>
          ))}
          {saved&&<div style={{marginBottom:12,padding:"8px 12px",background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE80",borderRadius:6,fontSize:12,color:"#4ADE80"}}>Salvo!</div>}
          <button onClick={saveWebhooks} disabled={loading} style={{...btnP,width:"100%",padding:"11px",fontSize:13,fontWeight:700,opacity:loading?0.7:1}}>
            {loading?"Salvando...":"Salvar Webhooks"}
          </button>
        </div>
      )}
      <div style={{...card({padding:20})}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Status dos Webhooks</div>
        {tenants.map(t=>{
          let cfg={};
          try{ cfg=typeof t.config==="string"?JSON.parse(t.config||"{}"):( t.config||{}); }catch(e){}
          const wh=cfg.webhooks||{};
          const configured=Object.values(wh).filter(v=>v).length;
          return (
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,border:"1px solid "+C.border,marginBottom:8,cursor:"pointer",background:selTenant===t.id?(C.accent+"08"):"transparent"}} onClick={()=>setSelTenant(t.id)}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.name}</div>
                <div style={{fontSize:10,color:C.faint}}>/{t.slug}</div>
              </div>
              <div style={{display:"flex",gap:4}}>
                {FIELDS.map(f=>(<div key={f.key} style={{width:8,height:8,borderRadius:"50%",background:wh[f.key]?"#4ADE80":"#F87171"}}/>))}
              </div>
              <div style={{fontSize:11,color:configured===FIELDS.length?"#4ADE80":"#F59E0B",fontWeight:700}}>{configured}/{FIELDS.length}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModulosConfig({ tenant, onSave }) {
  const cfg = tenant?.config || {};
  const [perms, setPerms] = React.useState(cfg.permissions || {});
  const [quota, setQuota] = React.useState(cfg.quota || 100);
  const [expanded, setExpanded] = React.useState({});
  const [dirty, setDirty] = React.useState(false);

  const toggleMod = (modId) => {
    const enabled = !!perms[modId];
    const newPerms = {...perms};
    if(enabled) { delete newPerms[modId]; }
    else { newPerms[modId] = { items: getAllModPerms(modId) }; }
    setPerms(newPerms); setDirty(true);
  };

  const toggleItem = (modId, itemKey) => {
    const cur = perms[modId]?.items || [];
    const newItems = cur.includes(itemKey) ? cur.filter(x=>x!==itemKey) : [...cur, itemKey];
    const newPerms = {...perms, [modId]: {...(perms[modId]||{}), items: newItems}};
    setPerms(newPerms); setDirty(true);
  };

  const save = () => {
    const newCfg = {...cfg, permissions: perms, quota};
    onSave(newCfg); setDirty(false);
  };

  return (
    <div style={{marginTop:12}}>
      <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Permissões e Módulos</div>
      {/* Quota */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"8px 12px",background:"rgba(0,180,216,0.06)",borderRadius:8,border:"1px solid rgba(0,180,216,0.15)"}}>
        <span style={{fontSize:12,color:C.muted,fontWeight:600}}>🔍 Cota mensal de buscas:</span>
        <input type="number" min={0} max={9999} value={quota} onChange={e=>{setQuota(Number(e.target.value));setDirty(true);}}
          style={{width:80,padding:"4px 8px",background:C.sidebar,border:"1px solid "+C.border,borderRadius:6,color:C.text,fontSize:12,fontWeight:700,textAlign:"center"}}/>
        <span style={{fontSize:11,color:C.faint}}>leads/mês</span>
      </div>
      {/* Modules */}
      {Object.entries(PERMISSIONS_SCHEMA).map(([modId, modDef])=>{
        const modEnabled = !!perms[modId];
        const isOpen = expanded[modId];
        const items = modDef.items;
        const enabledItems = perms[modId]?.items || [];
        return (
          <div key={modId} style={{marginBottom:6,border:"1px solid "+(modEnabled?C.accent:C.border),borderRadius:8,overflow:"hidden",transition:"all 0.15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:modEnabled?"rgba(0,180,216,0.06)":"transparent",cursor:"pointer"}}
              onClick={()=>setExpanded(e=>({...e,[modId]:!isOpen}))}>
              {/* Toggle on/off */}
              <div onClick={e=>{e.stopPropagation();toggleMod(modId);}} style={{width:32,height:18,borderRadius:9,background:modEnabled?C.accent:C.border,position:"relative",cursor:"pointer",flexShrink:0,transition:"background 0.2s"}}>
                <div style={{position:"absolute",top:2,left:modEnabled?14:2,width:14,height:14,borderRadius:7,background:"#fff",transition:"left 0.2s"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:modEnabled?C.text:C.muted,flex:1}}>{modDef.label}</span>
              {modEnabled&&<span style={{fontSize:10,color:C.faint}}>{enabledItems.length}/{Object.keys(items).length} itens</span>}
              <span style={{fontSize:10,color:C.faint}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && modEnabled && (
              <div style={{padding:"8px 12px 10px",background:C.sidebar,display:"flex",flexWrap:"wrap",gap:6}}>
                {Object.entries(items).map(([itemKey, itemDef])=>{
                  const on = enabledItems.includes(itemKey);
                  return (
                    <div key={itemKey} onClick={()=>toggleItem(modId,itemKey)}
                      style={{padding:"4px 10px",borderRadius:20,cursor:"pointer",fontSize:11,border:"1px solid "+(on?C.accent:C.border),background:on?C.accent+"22":"transparent",color:on?C.accent:C.muted,fontWeight:on?700:400,transition:"all 0.15s"}}>
                      {on?"✓ ":""}{itemDef.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {dirty&&<button onClick={save} style={{marginTop:10,width:"100%",padding:"9px",background:"linear-gradient(135deg,"+C.accent+","+C.accent2+")",color:"#fff",border:"none",borderRadius:8,fontWeight:800,fontSize:13,cursor:"pointer"}}>💾 Salvar Permissões</button>}
    </div>
  );
}

function SuperAdminPanel({ currentUser }) {
  const [tab, setTab]           = useState("tenants");
  const [tenants, setTenants]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showNew, setShowNew]   = useState(false);
  const [saved, setSaved]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [form, setForm]         = useState({
    name:"", slug:"", plan:"basic", modules:["prospeccao"]
  });

  const SB_URL_ADM = "https://rbizynwybepmlljgcveq.supabase.co";
  const SB_KEY_ADM = "sb_publishable_oqQ9VvnLTSZI4yYiu4UsyA_EV1a2nT4";

  const adm = async (path, method="GET", body=null) => {
    const opts = {
      method,
      headers: {
        "apikey": SB_KEY_ADM,
        "Authorization": "Bearer "+(typeof sbAuth!=="undefined"&&sbAuth.token?sbAuth.token():SB_KEY_ADM),
        "Content-Type": "application/json",
        "Prefer": method==="POST"?"return=representation":"return=minimal",
      }
    };
    if(body) opts.body = JSON.stringify(body);
    const res = await fetch(SB_URL_ADM+"/rest/v1/"+path, opts);
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if(!res.ok) throw new Error((parsed?.message||parsed?.error||"Erro "+res.status));
    return parsed;
  };

  const MOCK_TENANTS = [
    {id:"072b33d2-46ff-4bf2-839b-ee5d33fe6cb7",name:"TM Soluções Comerciais",status:"ativo",created_at:"2026-01-01T00:00:00",config:{quota:100,permissions:{}},users:[]},
  ];

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await adm("tenants?select=*,users(id,name,role,status)&order=created_at.desc");
      if(Array.isArray(data)&&data.length>0){ setTenants(data); setError(""); }
      else { setTenants(MOCK_TENANTS); }
    } catch(e) {
      setTenants(MOCK_TENANTS);
      setError("Modo offline: dados locais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ loadTenants(); },[]);

  const updateTenantStatus = async (id, status) => {
    try {
      await adm("tenants?id=eq."+id, "PATCH", {status});
      setTenants(ts=>ts.map(t=>t.id===id?{...t,status}:t));
      setSaved("Status atualizado!");
      setTimeout(()=>setSaved(""),2000);
    } catch(e) { setError(e.message); }
  };

  const updateTenantModules = async (id, modules) => {
    try {
      await adm("tenants?id=eq."+id, "PATCH", {modules:JSON.stringify(modules)});
      setTenants(ts=>ts.map(t=>t.id===id?{...t,modules}:t));
    } catch(e) { setError(e.message); }
  };

  const createTenant = async () => {
    if(!form.name){ setError("Nome da empresa é obrigatório."); return; }
    setBusy(true); setError("");
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const newTenant = {
      id: "local_"+Date.now(),
      name: form.name,
      slug,
      plan: form.plan,
      status: "active",
      created_at: new Date().toISOString(),
      modules: form.modules,
      config: { quota: 100, permissions: {} },
      users: [],
    };
    try {
      const data = await adm("tenants", "POST", {
        name: form.name,
        slug,
        plan: form.plan,
        status: "active",
        modules: JSON.stringify(form.modules),
        config: JSON.stringify({ quota: 100, permissions: {} }),
      });
      if(data&&data[0]) newTenant.id = data[0].id;
    } catch(e) {
      // Supabase retornou erro — registra mas cria localmente mesmo assim
      console.warn("Supabase createTenant error:", e.message);
    }
    setTenants(ts=>[newTenant,...ts]);
    setSaved("Empresa \""+form.name+"\" criada!");
    setShowNew(false);
    setForm({name:"",slug:"",plan:"basic",modules:["prospeccao"]});
    setBusy(false);
  };

  const PLAN_COLORS = { basic:"#6B7280", pro:"#3B82F6", enterprise:"#8B5CF6" };
  const STATUS_COLORS = { active:"#4ADE80", suspended:"#F59E0B", cancelled:"#F87171" };
  const ALL_MODS = ["prospeccao","receptivo","pos_venda","cadencia"];

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>⭐ Super Admin</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>Gerencie todas as empresas do Pipe.TM</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={loadTenants} style={{...btnG,padding:"8px 14px",fontSize:12}}>🔄 Atualizar</button>
          <button onClick={()=>setShowNew(true)} style={{...btnP,padding:"9px 18px",fontSize:13}}>+ Nova Empresa</button>
        </div>
      </div>

      {saved&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(74,222,128,0.1)",border:"1px solid #4ADE80",borderRadius:8,fontSize:12,color:"#4ADE80",fontWeight:700}}>✅ {saved}</div>}
      {error&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(248,113,113,0.1)",border:"1px solid #F87171",borderRadius:8,fontSize:12,color:"#F87171"}}>{error}<button onClick={()=>setError("")} style={{marginLeft:8,background:"transparent",border:"none",color:"#F87171",cursor:"pointer"}}>✕</button></div>}


      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[["tenants","Empresas"],["webhooks","Webhooks N8N"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{padding:"8px 18px",borderRadius:8,border:"1px solid "+(tab===v?C.accent:C.border),background:tab===v?(C.accent+"18"):"transparent",color:tab===v?C.accent:C.muted,fontSize:12,fontWeight:tab===v?700:400,cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      {tab==="tenants"&&(
      <div>
            {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}} className="mob-grid-2">
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:C.accent}}>{tenants.length}</div>
          <div style={{fontSize:11,color:C.muted}}>Total empresas</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#4ADE80"}}>{tenants.filter(t=>t.status==="active").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Ativas</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#8B5CF6"}}>{tenants.filter(t=>t.plan==="enterprise").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Enterprise</div>
        </div>
        <div style={card({padding:14})}>
          <div style={{fontSize:22,fontWeight:900,color:"#F59E0B"}}>{tenants.filter(t=>t.status==="suspended").length}</div>
          <div style={{fontSize:11,color:C.muted}}>Suspensas</div>
        </div>
      </div>

      {/* Tenant List */}
      {loading
        ?<div style={{textAlign:"center",padding:40,color:C.muted}}>⟳ Carregando...</div>
        :tenants.length===0
          ?<div style={{...card({padding:40}),textAlign:"center",color:C.muted}}>
            <div style={{fontSize:32,marginBottom:12}}>🏢</div>
            <div>Nenhuma empresa cadastrada ainda.</div>
          </div>
          :tenants.map(t=>{
            const statusColor = STATUS_COLORS[t.status]||C.muted;
            const planColor   = PLAN_COLORS[t.plan]||C.muted;
            const mods = Array.isArray(t.modules)?t.modules:(typeof t.modules==="string"?JSON.parse(t.modules||"[]"):[]);
            const users = Array.isArray(t.users)?t.users:[];
            return (
              <div key={t.id} style={{...card({padding:20,marginBottom:14}),borderLeft:"4px solid "+statusColor}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:16,fontWeight:800,color:C.text}}>{t.name}</span>
                      <span style={{fontSize:9,color:"#fff",background:planColor,padding:"2px 8px",borderRadius:20,fontWeight:700,textTransform:"uppercase"}}>{t.plan}</span>
                      <span style={{fontSize:9,color:statusColor,background:statusColor+"18",padding:"2px 8px",borderRadius:20,fontWeight:700}}>
                        {t.status==="active"?"● Ativa":t.status==="suspended"?"⏸ Suspensa":"✕ Cancelada"}
                      </span>
                    </div>
                    <div style={{fontSize:11,color:C.faint}}>/{t.slug} · ID: {t.id?.substring(0,8)}...</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:4}}>
                      {users.length} usuário{users.length!==1?"s":""} · Criado em {t.created_at?.substring(0,10)||"—"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {t.status==="active"
                      ?<button onClick={()=>updateTenantStatus(t.id,"suspended")}
                          style={{...btnG,padding:"5px 12px",fontSize:11,color:"#F59E0B",border:"1px solid rgba(245,158,11,0.3)"}}>⏸ Suspender</button>
                      :<button onClick={()=>updateTenantStatus(t.id,"active")}
                          style={{...btnG,padding:"5px 12px",fontSize:11,color:"#4ADE80",border:"1px solid rgba(74,222,128,0.3)"}}>▶ Reativar</button>
                    }
                  </div>
                </div>

                {/* Permissions granular */}
                <ModulosConfig tenant={t} onSave={async(newCfg)=>{
                  try {
                    await adm("tenants?id=eq."+t.id, "PATCH", {config:newCfg});
                    setTenants(ts=>ts.map(x=>x.id===t.id?{...x,config:newCfg}:x));
                    setSaved("Permissões salvas!");setTimeout(()=>setSaved(""),2500);
                  } catch(e){ setError(e.message); }
                }}/>

                {/* Users */}
                {users.length>0&&(
                  <div>
                    <div style={{fontSize:10,color:C.faint,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Usuários</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {users.map(u=>(
                        <div key={u.id} style={{fontSize:10,color:C.text,background:C.sidebar,border:"1px solid "+C.border,padding:"3px 10px",borderRadius:20}}>
                          {u.name} <span style={{color:C.faint}}>· {u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
      }

      {/* Modal: Nova Empresa */}
      </div>
      )}

      {tab==="webhooks"&&(
        <WebhooksConfig tenants={tenants} onSaved={(msg)=>{setSaved(msg);setTimeout(()=>setSaved(""),3000);}}/>
      )}

            {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(6,14,28,0.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setShowNew(false)}>
          <div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:16,padding:24,width:"100%",maxWidth:460,boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>🏢 Nova Empresa</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Cadastre uma nova empresa no Pipe.TM</div>

            <div style={{marginBottom:14}}>
              <div style={lbl}>Nome da Empresa *</div>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="Ex: TM Soluções Comerciais" style={inp}/>
            </div>
            <div style={{marginBottom:14}}>
              <div style={lbl}>Slug (URL amigável — opcional)</div>
              <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value.toLowerCase().replace(/\s+/g,"-")}))}
                placeholder="ex: tm-solucoes (gerado automaticamente se vazio)" style={inp}/>
              <div style={{fontSize:10,color:C.faint,marginTop:4}}>Se vazio, gerado automaticamente pelo nome</div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={lbl}>Plano</div>
              <select value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} style={inp}>
                <option value="basic">Basic — Prospecção apenas</option>
                <option value="pro">Pro — Prospecção + Receptivo</option>
                <option value="enterprise">Enterprise — Todos os módulos</option>
              </select>
            </div>
            <div style={{marginBottom:20}}>
              <div style={lbl}>Módulos ativos</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[["prospeccao","🎯 Prospecção"],["receptivo","📥 Receptivo"],["pos_venda","🤝 Pós-venda"],["cadencia","📅 Cadências"]].map(([id,label])=>{
                  const active = form.modules.includes(id);
                  return (
                    <div key={id} onClick={()=>setForm(f=>({...f,modules:active?f.modules.filter(m=>m!==id):[...f.modules,id]}))}
                      style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:active?700:400,border:"1px solid "+(active?C.accent:C.border),background:active?(C.accent+"18"):"transparent",color:active?C.accent:C.muted}}>
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowNew(false)} style={{...btnG,flex:1,padding:"10px"}}>Cancelar</button>
              <button onClick={createTenant} disabled={busy} style={{...btnP,flex:2,padding:"10px",fontSize:13,fontWeight:700,opacity:busy?0.7:1,cursor:busy?"wait":"pointer"}}>
                {busy?"⟳ Criando...":"🏢 Criar Empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [page,setPage]=useState("dashboard");
  const [notif,setNotif]=useState(null);
  const [open,setOpen]=useState(true);
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(DEFAULT_PROFILE);
  const [ownerWebhook,setOwnerWebhook]=useState("https://seu-n8n.app.n8n.cloud/webhook/pipe-tm");
  const [ownerWebhooks,setOwnerWebhooks]=useState({busca_leads:"",pos_resposta:""});

  const [leads,setLeads]=useState([]);
  const [sbLoading,setSbLoading]=useState(true);
  const [sbError,setSbError]=useState("");
  const [pwaPrompt, setPwaPrompt] = useState(null);

  const installPwa = async () => {
    if(!pwaPrompt) return;
    pwaPrompt.prompt();
    const result = await pwaPrompt.userChoice;
    if(result.outcome==="accepted") setPwaInstalled(true);
    setPwaPrompt(null);
  };
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load from Supabase on mount
  useEffect(()=>{
    const loadFromSB = async () => {
      setSbLoading(true);
      const firstStage = FUNIL_STAGES[0]?.id||"s1";
      const firstName = FUNIL_STAGES[0]?.name||"Novo cliente";
      const initLocal = (srcLeads) => {
        srcLeads.forEach(l=>{ setLeadStage(l.id, firstStage); });
        setLeads(srcLeads.map(l=>({...l,funilStage:firstStage,status:l.status||firstName})));
      };
      try {
        if(user?.tenant_id){ try { const t=await sbFetch("tenants?id=eq."+user.tenant_id+"&select=config"); if(t&&t[0]?.config){ const cfg=typeof t[0].config==="string"?JSON.parse(t[0].config):t[0].config; if(cfg.webhooks) setOwnerWebhooks(w=>({...w,...cfg.webhooks})); } } catch(e){ console.warn(e); } }
        const rows = await sbGetLeads(user?.tenant_id); // loads all modules
        if(rows && rows.length > 0){
          rows.forEach(r=>{ setLeadStage(r.id, r.funil_stage||firstStage); });
          setLeads(rows.map(dbToLead));
        } else {
          initLocal(MOCK_LEADS);
        }
        setSbError("");
      } catch(e){
        // Silently fall back to local data - don't show error on load
        initLocal(MOCK_LEADS);
        console.warn("Supabase unavailable, using local data:", e.message);
      } finally {
        setSbLoading(false);
      }
    };
    loadFromSB();
  },[]);
  // Check pending cadence steps daily and notify via N8N
  useEffect(()=>{
    if(!leads.length) return;
    const pending = leads.flatMap(l=>{
      const steps = getCadencePending(l);
      return steps.map(s=>({lead:l, step:s}));
    });
    if(pending.length>0){
      // Store in sessionStorage to avoid repeated notifications
      const key = "cadence_notif_"+new Date().toDateString();
      if(!sessionStorage.getItem(key)){
        sessionStorage.setItem(key,"1");
        // Notify via webhook if configured
        const wh = ownerWebhook||TENANT_CONFIG.webhookUrl;
        if(wh&&wh.includes("n8n")){
          fetch(wh+"/cadence-notify", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              pending_count: pending.length,
              user_email: user?.email||"",
              leads: pending.slice(0,5).map(p=>({name:p.lead.name,step:p.step.tema,canal:p.step.canal}))
            }),
            mode:"no-cors"
          }).catch(()=>{});
        }
      }
    }
  },[leads]);

  // Permission check - owner always has access to everything
  const hasAccess = (mod) => {
    if(!user) return false;
    // super_admin tab only for super_admin role
    if(mod==="super_admin") return user.role==="owner";
    if(user.role==="owner") return true;
    // pos_venda only for owner and master
    if(mod==="pos_venda") return user.role==="owner"||user.role==="master";
    const u = DB.findById(user.id);
    const perms = u?.perms || (user.role==="master"?ALL_MODULES:DEFAULT_USER_PERMS);
    return perms.includes(mod);
  };

  // Responsive hooks - before any conditional return (React rules)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [mobileMenu, setMobileMenu] = useState(false);
  useEffect(()=>{
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  },[]);
  useEffect(()=>{ if(isMobile){ setOpen(false); } },[isMobile]);

  const notify=(msg,type="ok")=>{setNotif({msg,type});setTimeout(()=>setNotif(null),3000);}; 
  const addLead=async(lead)=>{
    if(leads.find(l=>l.name.toLowerCase()===lead.name.toLowerCase()&&l.company?.toLowerCase()===lead.company?.toLowerCase())){notify("Lead já existe no CRM","warn");return;}
    const firstStage=FUNIL_STAGES[0];
    const withStage={...lead,funilStage:firstStage?.id||"s1",status:firstStage?.name||"Novo cliente",tenant_id:user?.tenant_id||null,module:"prospeccao"};
    try{
      const saved=await sbInsertLead(leadToDb(withStage));
      const newLead=saved&&saved[0]?dbToLead(saved[0]):{...withStage,id:Date.now()};
      setLeadStage(newLead.id,firstStage?.id||"s1");
      setLeads(ls=>[newLead,...ls]);
      notify("✅ "+newLead.name+" adicionado ao CRM e ao Funil");
    }catch(e){
      // Fallback to local if Supabase fails
      setLeadStage(lead.id,firstStage?.id||"s1");
      setLeads(ls=>[withStage,...ls]);
      notify("✅ "+lead.name+" adicionado (offline)");
    }
  };
  const updateLead=(lead)=>{
    setLeads(ls=>ls.map(l=>l.id===lead.id?lead:l));
    sbUpdateLead(lead.id,leadToDb(lead)).catch(()=>{});
  };
  const deleteLead=(id)=>{
    setLeads(ls=>ls.filter(l=>l.id!==id));
    sbDeleteLead(id).catch(()=>{});
    notify("Lead removido","warn");
  };

  if(!user) return <AuthScreen onLogin={u=>{setUser(u);notify(`Bem-vindo(a), ${u.name.split(" ")[0]}! 👋`);setPage("dashboard");}}/>;

  const profileComplete=!!profile.companyName;
  const isOwner  = user?.role==="owner";
  const isMaster = user?.role==="master" || isOwner;

  // Build nav from permissions - owner always sees all
  const ALL_NAV = [
    {id:"dashboard",label:"Dashboard",        icon:"dashboard", group:"Principal"},
    {id:"profile",  label:"Perfil da Empresa",icon:"briefcase", group:"Principal", badge:!profileComplete?1:0},
    {id:"search",   label:"Buscar Leads",     icon:"search",    group:"Principal"},
    {id:"addlead",  label:"Cadastrar Empresa",icon:"plus",      group:"Principal"},
    {id:"messages", label:"Mensagens",        icon:"message",   group:"Comunicação"},
    {id:"whatsapp", label:"Envio WhatsApp",   icon:"whatsapp",  group:"Comunicação"},
    {id:"crm",      label:"Acompanhamento",   icon:"users",     group:"Gestão", badge:leads.filter(l=>l.status==="Novo cliente").length},
    {id:"funil",    label:"Funil de Vendas",   icon:"filter",    group:"Gestão", badge:leads.filter(l=>getPendingActions(l).length>0).length},
    {id:"metas",    label:"Metas",              icon:"target",    group:"Gestão"},
    {id:"cadencia",  label:"Cadências",           icon:"calendar",  group:"Gestão"},
    {id:"receptivo", label:"Receptivo",          icon:"inbox",     group:"Módulos"},
    {id:"pos_venda",   label:"Pos-venda",           icon:"handshake", group:"Módulos"},
    {id:"reativacao",  label:"Reativação",          icon:"refresh",   group:"Módulos"},
    {id:"suporte",     label:"Suporte",              icon:"headset",   group:"Módulos"},
    {id:"settings", label:"Configurações",    icon:"settings",  group:"Gestão"},
    ...(isMaster?[{id:"master",label:"Controle de Acesso",icon:"shield",group:"Gestão",master:true}]:[]),
    ...(isOwner?[{id:"super_admin",label:"Super Admin",icon:"settings",group:"Administração",owner:true}]:[]),
  ];
  const nav = ALL_NAV.filter(n => hasAccess(n.id));
  const presentGroups = [...new Set(nav.map(n=>n.group))];
  const groups = ["Principal","Comunicação","Gestão","Módulos","Master","Owner","Administração"].filter(g=>presentGroups.includes(g));
  const renderPage = (pg) => {
    if(pg==="dashboard") return <Dashboard leads={leads} onSetPage={setPage} onAcionar={(id)=>{setPage("crm");}} users={DB.all()} currentUser={user} isMaster={isMaster}/>;
    if(pg==="profile") return <CompanyProfile profile={profile} onSave={p=>{setProfile(p);notify("Perfil salvo!");}} />;
    if(pg==="search") return <SearchLeads onLeadsFound={addLead} existingLeads={leads} profile={profile} currentUser={user} ownerWebhook={ownerWebhooks.busca_leads||ownerWebhook}/>;
    if(pg==="addlead") return <AddLead onLeadsFound={addLead} existingLeads={leads} profile={profile}/>;
    if(pg==="messages") return <Messages leads={leads} profile={profile}/>;
    if(pg==="whatsapp") return <WhatsappSender leads={leads} profile={profile} webhook={ownerWebhook}/>;
    if(pg==="crm") return <CRM leads={leads} onUpdateLead={updateLead} onDeleteLead={deleteLead}/>;
    if(pg==="funil") return <FunnelPage leads={leads} onUpdateLead={updateLead} currentUser={user} isMaster={isMaster}/>;
    if(pg==="metas") return <GoalsDashboard leads={leads} users={DB.all()||[]} currentUser={user}/>;
    if(pg==="cadencia") return <Cadencias leads={leads} currentUser={user} onUpdateLead={updateLead}/>;
    if(pg==="receptivo") return <Receptivo leads={leads} onAddLead={addLead} onUpdateLead={updateLead} currentUser={user}/>;
    if(pg==="pos_venda")  return <PosVenda currentUser={user}/>;
    if(pg==="reativacao") return <Reativacao leads={leads} onUpdateLead={updateLead} onSetPage={setPage}/>;
    if(pg==="suporte")    return <Suporte leads={leads} onUpdateLead={updateLead} currentUser={user}/>;
    if(pg==="settings") return <Settings user={user}/>;
    if(pg==="master") return <MasterPanel/>;
    if(pg==="super_admin") return <SuperAdminPanel currentUser={user}/>;
    return <Dashboard leads={leads} onSetPage={setPage} onAcionar={(id)=>{setPage("crm");}} users={DB.all()||[]} currentUser={user} isMaster={isMaster}/>;
  };

  // Guard: if current page not accessible, redirect to dashboard
  const safePage = hasAccess(page) ? page : "dashboard";




  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text,overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(-100%)}to{transform:none}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes fin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}} ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:${C.sidebar}} ::-webkit-scrollbar-thumb{background:#1E3A5F;border-radius:4px} input::placeholder,textarea::placeholder{color:${C.faint}} select option{background:${C.panel};color:${C.text}} @media(max-width:767px){.mob-hide{display:none!important;}.mob-grid-1{grid-template-columns:1fr!important;}.mob-scroll-x{overflow-x:auto!important;} table{min-width:560px;}}`}</style>
      {pwaPrompt&&!pwaInstalled&&(
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:998,background:C.panel,border:"1px solid "+C.accent,borderRadius:12,padding:"12px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",maxWidth:"90vw"}}>
          <span style={{fontSize:20}}>📱</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text}}>Instalar Pipe.TM</div>
            <div style={{fontSize:10,color:C.muted}}>Acesse como app no seu celular</div>
          </div>
          <button onClick={installPwa} style={{...btnP,padding:"6px 14px",fontSize:11}}>Instalar</button>
          <button onClick={()=>setPwaPrompt(null)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
      )}
      {sbLoading&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:C.panel,border:"1px solid "+C.accent,borderRadius:10,padding:"10px 20px",color:C.accent,fontSize:12,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",display:"flex",alignItems:"center",gap:8}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Carregando do Supabase...</div>}
      
      {notif&&<div style={{position:"fixed",top:16,right:16,zIndex:999,background:notif.type==="warn"?"#1A1A2E":C.panel,border:("1px solid "+notif.type==="warn"?"#FBBF2466":C.accent),borderRadius:10,padding:"10px 18px",color:C.text,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",animation:"fin 0.2s ease"}}>{notif.msg}</div>}

      {/* Mobile overlay menu */}
      {isMobile&&mobileMenu&&(
        <>
          <div onClick={()=>setMobileMenu(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",top:0,left:0,bottom:0,width:260,background:C.sidebar,zIndex:201,display:"flex",flexDirection:"column",animation:"slideIn 0.22s ease",boxShadow:"4px 0 24px rgba(0,0,0,0.5)"}}>
            <div style={{padding:"16px",borderBottom:("1px solid "+C.border),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:34,height:34,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff"}}>P.TM</div>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>OPEN LOG</div>
              </div>
              <button onClick={()=>setMobileMenu(false)} style={{background:"transparent",border:("1px solid "+C.border),borderRadius:6,padding:"5px 8px",cursor:"pointer",color:C.muted,display:"flex"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <nav style={{flex:1,padding:"10px",overflowY:"auto"}}>
              {groups.map(g=>(
                <div key={g}>
                  <div style={{fontSize:9,color:C.faint,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700,padding:"10px 10px 5px"}}>{g}</div>
                  {nav.filter(n=>n.group===g).map(item=>{
                    const activeColor=item.owner?"#A855F7":item.master?"#F59E0B":C.accent;
                    return (
                      <div key={item.id} onClick={()=>{setPage(item.id);setMobileMenu(false);}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:2,background:page===item.id?("linear-gradient(90deg,"+item.owner?"rgba(168,85,247,0.18)":item.master?"rgba(245,158,11,0.18)":"rgba(0,180,216,0.18)"+",transparent)"):"transparent",color:page===item.id?activeColor:C.dim,borderLeft:page===item.id?("2px solid "+activeColor):"2px solid transparent"}}>
                        <Icon d={IC[item.icon]||IC.dashboard} size={18} color={page===item.id?activeColor:C.dim}/>
                        <span style={{fontSize:13}}>{item.label}</span>
                        {item.badge>0&&<span style={{background:C.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:20,marginLeft:"auto"}}>{item.badge}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div style={{padding:"12px 16px",borderTop:("1px solid "+C.border)}}>
              <div style={{fontSize:11,color:C.text,fontWeight:600,marginBottom:2}}>{user.name}</div>
              <div style={{fontSize:10,color:C.faint,marginBottom:8}}>{user.email}</div>
              <button onClick={()=>{setUser(null);setMobileMenu(false);}} style={{width:"100%",padding:"7px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:7,color:"#F87171",fontSize:11,fontWeight:600,cursor:"pointer"}}>Sair</button>
            </div>
          </div>
        </>
      )}

      {/* SIDEBAR - desktop only */}
      <div style={{width:open?224:60,background:C.sidebar,borderRight:("1px solid "+C.border),display:isMobile?"none":"flex",flexDirection:"column",flexShrink:0,zIndex:10,transition:"width 0.22s cubic-bezier(0.4,0,0.2,1)",overflow:"hidden"}}>
        <div style={{padding:open?"18px 16px 14px":"16px 10px 12px",borderBottom:("1px solid "+C.border),display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:open?"space-between":"center",width:"100%"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:34,height:34,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff",flexShrink:0}}>P.TM</div>
              {open&&<div style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:1.5,whiteSpace:"nowrap"}}>Pipe.TM</div>}
            </div>
            <button onClick={()=>setOpen(o=>!o)} style={{background:"transparent",border:("1px solid "+C.border),borderRadius:6,padding:"4px 6px",cursor:"pointer",color:C.muted,display:"flex",alignItems:"center",flexShrink:0,marginLeft:4}}><Chev o={open}/></button>
          </div>
          {open&&<div style={{fontSize:9,color:C.muted,letterSpacing:2.5,textTransform:"uppercase",paddingLeft:43,whiteSpace:"nowrap"}}>Prospecção Inteligente</div>}
        </div>
        <nav style={{flex:1,padding:open?"12px 10px":"10px 6px",overflowY:"auto"}}>
          {groups.map(g=>(
            <div key={g}>
              {open&&<div style={{fontSize:9,color:C.faint,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700,padding:"10px 12px 5px"}}>{g}</div>}
              {!open&&<div style={{height:8}}/>}
              {g==="Master"&&open&&<div style={{height:1,background:"linear-gradient(90deg,#F59E0B33,transparent)",margin:"8px 4px 4px"}}/>}
              {g==="Owner"&&open&&<div style={{height:1,background:"linear-gradient(90deg,#A855F733,transparent)",margin:"8px 4px 4px"}}/>}
              {nav.filter(n=>n.group===g).map(item=>{
                const isMasterItem=item.master;
                const isOwnerItem=item.owner;
                const activeColor=isOwnerItem?"#A855F7":isMasterItem?"#F59E0B":C.accent;
                return (
                <div key={item.id} onClick={()=>setPage(item.id)} title={!open?item.label:""} style={{display:"flex",alignItems:"center",gap:open?10:0,padding:open?"9px 12px":"9px 0",justifyContent:open?"flex-start":"center",borderRadius:8,cursor:"pointer",marginBottom:2,background:page===item.id?("linear-gradient(90deg,"+isOwnerItem?"rgba(168,85,247,0.18)":isMasterItem?"rgba(245,158,11,0.18)":"rgba(0,180,216,0.18)"+","+isOwnerItem?"rgba(168,85,247,0.06)":isMasterItem?"rgba(245,158,11,0.06)":"rgba(0,180,216,0.06)"+")"):"transparent",color:page===item.id?activeColor:C.dim,borderLeft:page===item.id?("2px solid "+activeColor):"2px solid transparent",fontSize:13,fontWeight:page===item.id?600:400,transition:"all 0.14s",position:"relative"}}>
                  <Icon d={IC[item.icon]||IC.dashboard} size={17} color={page===item.id?C.accent:C.dim}/>
                  {open&&<span style={{fontSize:12,whiteSpace:"nowrap"}}>{item.label}</span>}
                  {open&&item.badge>0&&<span style={{background:item.id==="profile"?"#FBBF24":C.accent,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,marginLeft:"auto"}}>{item.id==="profile"?"!":item.badge}</span>}
                  {!open&&item.badge>0&&<div style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:item.id==="profile"?"#FBBF24":C.accent,border:("1px solid "+C.bg)}}/>}
                </div>
              );})}
            </div>
          ))}
        </nav>
        <div style={{padding:open?"12px 16px":"12px 8px",borderTop:("1px solid "+C.border),display:"flex",flexDirection:"column",alignItems:open?"flex-start":"center",gap:8}}>
          {open?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.bg,borderRadius:8,width:"100%"}}>
                <div style={{width:28,height:28,borderRadius:7,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{user.name[0]}</div>
                <div style={{flex:1,overflow:"hidden"}}><div style={{fontSize:11,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div><div style={{fontSize:9,color:C.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.email}</div></div>
              </div>
              <button onClick={()=>setUser(null)} style={{width:"100%",padding:"6px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:7,color:"#F87171",fontSize:11,fontWeight:600,cursor:"pointer"}}>Sair da conta</button>
              <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:"#4ADE80",flexShrink:0}}/><span style={{fontSize:9,color:C.faint}}>OPEN Log v9.0 · IA Ativa</span></div>
            </>
          ):(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:7,background:("linear-gradient(135deg,"+C.accent+","+C.accent2+")"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",cursor:"pointer"}} title={`${user.name} - Clique para sair`} onClick={()=>setUser(null)}>{user.name[0]}</div>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#4ADE80"}}/>
            </div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:56,background:C.sidebar,borderBottom:("1px solid "+C.border),display:"flex",alignItems:"center",padding:"0 24px",gap:14,flexShrink:0}}>
          {isMobile&&<button onClick={()=>setMobileMenu(true)} style={{background:"transparent",border:("1px solid "+C.border),borderRadius:6,padding:"6px 9px",cursor:"pointer",color:C.muted,display:"flex",marginRight:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>}
          {!open&&!isMobile&&<button onClick={()=>setOpen(true)} style={{background:"transparent",border:("1px solid "+C.border),borderRadius:6,padding:"5px 7px",cursor:"pointer",color:C.muted,display:"flex",alignItems:"center",marginRight:4}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>}
          <div style={{fontSize:15,fontWeight:700,color:C.text,flex:1}}>{nav.find(n=>n.id===page)?.label}</div>
          {!profileComplete&&hasAccess("profile")&&page!=="profile"&&<button onClick={()=>setPage("profile")} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:"1px solid #FBBF2444",background:"rgba(251,191,36,0.08)",color:"#FBBF24",fontSize:11,fontWeight:700,cursor:"pointer"}}>⚠️ Configure o Perfil da Empresa</button>}
          {isOwner&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.3)"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#A855F7",flexShrink:0}}/>
            <span style={{fontSize:11,color:"#A855F7",fontWeight:700}}>◆ Owner</span>
          </div>}
          
          <button onClick={()=>setPage("search")} style={{...btnG,whiteSpace:"nowrap"}}><Icon d={IC.plus} size={14}/>Novo Lead</button>
          <div style={{position:"relative"}}>
            <button onClick={()=>setPage("crm")} style={{...btnG,padding:"7px 10px"}}><Icon d={IC.bell} size={15}/></button>
            {leads.filter(l=>l.status==="Novo cliente"&&l.cadence.length===0).length>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#F87171",border:("2px solid "+C.bg),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff"}}>{leads.filter(l=>l.status==="Novo cliente"&&l.cadence.length===0).length}</div>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"12px 14px":"24px 28px",paddingBottom:isMobile?80:undefined}}>{renderPage(safePage)}</div>
        {isMobile&&(
          <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.sidebar,borderTop:("1px solid "+C.border),display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
            {[
              {id:"dashboard",icon:"dashboard",label:"Home"},
              {id:"search",icon:"search",label:"Buscar"},
              {id:"crm",icon:"users",label:"CRM"},
              {id:"messages",icon:"message",label:"Msgs"},
              {id:"whatsapp",icon:"whatsapp",label:"WA"},
            ].map(item=>{
              const active=page===item.id;
              return (
                <div key={item.id} onClick={()=>setPage(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px",cursor:"pointer",color:active?C.accent:C.dim,gap:3}}>
                  <Icon d={IC[item.icon]||IC.dashboard} size={20} color={active?C.accent:C.dim}/>
                  <span style={{fontSize:9,fontWeight:active?700:400}}>{item.label}</span>
                </div>
              );
            })}
            <div onClick={()=>setMobileMenu(true)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px",cursor:"pointer",color:C.dim,gap:3}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              <span style={{fontSize:9}}>Mais</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
