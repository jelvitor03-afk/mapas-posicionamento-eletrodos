// FISIOVANTA PRO — CLINICAL ENGINE & PWA CONTROLLER
let deferredPrompt = null;

// 1. PWA INSTALLATION PROMPT
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btnInstallApp');
  if (btn) btn.style.display = 'flex';
  const mobileBtn = document.getElementById('mobileInstallBtn');
  if (mobileBtn) mobileBtn.style.display = 'inline-flex';
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('FisioVanta Pro instalado pelo utilizador.');
      }
      deferredPrompt = null;
    });
  } else {
    alert("Para instalar no telemóvel:\n\n• No Safari (iPhone): toca em 'Partilhar' e seleciona 'Adicionar ao Ecrã Principal'.\n• No Chrome (Android): toca nos 3 pontos e seleciona 'Instalar Aplicação'.");
  }
}

// 2. TAB SWITCHER
function switchTab(tabId) {
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const targetPanel = document.getElementById(tabId);
  if (targetPanel) targetPanel.classList.add('active');

  // Update desktop sidebar
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Update mobile bottom bar
  document.querySelectorAll('.mobile-nav-bar .mobile-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // Update top bar title
  const titles = {
    'tab-calc': { title: 'Calculadora de Dosimetria', desc: 'Ajuste em tempo real de parâmetros em Hz, µs e rampas' },
    'tab-atlas': { title: 'Master Atlas 3D Interativo', desc: 'Consulta anatómica rápida organizada por 8 regiões corporais' },
    'tab-videos': { title: 'Demonstrações de Marquesa', desc: 'Vídeos práticos Axelgaard dobrados em Português de Portugal' },
    'tab-testes': { title: 'Kit Pro: 25 Testes Ortopédicos', desc: 'Sensibilidade, especificidade e manobras de gabinete' },
    'tab-prontuario': { title: 'Registo Clínico & Evolução', desc: 'Gerador de notas de sessão para prontuário do utente' },
    'tab-seguranca': { title: 'Triagem de Segurança', desc: 'Checklist de contraindicações absolutas e relativas' }
  };

  if (titles[tabId]) {
    document.getElementById('topBarTitle').innerText = titles[tabId].title;
    document.getElementById('topBarDesc').innerText = titles[tabId].desc;
  }

  // Scroll to top of viewport
  const viewport = document.querySelector('.content-viewport');
  if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. CLINICAL ELECTROTHERAPY PARAMETER DATABASE & CALCULATOR
const CLINICAL_PROTOCOLS = {
  // TENS CONVENCIONAL
  "tens_convencional": {
    name: "TENS Convencional (Alta Frequência)",
    mecanismo: "Teoria das Comportas Medulares (Melzack & Wall) · Fibras A-Beta",
    hz: "80 - 120",
    us: "50 - 100",
    tempo: "30 a 45 min",
    onOff: "Contínuo (Modulado em Freq. se > 30 min)",
    intensidade: "Parestesia forte, mas agradável. SEM contração motora visível.",
    polaridade: "Indiferente (corrente bifásica simétrica recomendada).",
    dica: "Ideal para dor aguda, pós-operatório imediato e lombalgias mecânicas agudas."
  },
  // TENS ACUPUNTURA
  "tens_acupuntura": {
    name: "TENS Acupuntura / Burst (Baixa Freq.)",
    mecanismo: "Libertação de Opiáceos Endógenos (Endorfinas e Encefalinas)",
    hz: "2 - 4 (ou Burst 100 Hz a 2 Hz)",
    us: "150 - 250",
    tempo: "30 a 40 min",
    onOff: "Contínuo ou Trens de Pulso",
    intensidade: "Acomodação motora com fasciculações visíveis sem dor aguda.",
    polaridade: "Cátodo (-) sobre o ponto motor ou ponto-gatilho.",
    dica: "Excelente para dores crónicas, fibromialgia, artrose e dor miofascial."
  },
  // TENS BREVE E INTENSO
  "tens_breve": {
    name: "TENS Breve e Intenso",
    mecanismo: "Bloqueio do Condução Nervosa Periférica Antidrómica",
    hz: "100 - 150",
    us: "200 - 300",
    tempo: "10 a 15 min",
    onOff: "Contínuo",
    intensidade: "No limiar máximo tolerável (quase dor), contração tetânica.",
    polaridade: "Eletrodos próximos ao local da intervenção dolorosa.",
    dica: "Usado antes de debridamento de feridas, mobilizações forçadas ou pós-trauma agudo."
  },
  // NMES FORTALECIMENTO (TETANIA)
  "nmes_forca": {
    name: "NMES Fortalecimento Muscular (Hipertrofia/Força)",
    mecanismo: "Recrutamento Sincronizado de Fibras Tipo II (Rápidas)",
    hz: "50 - 75",
    us: "250 - 400",
    tempo: "15 a 20 min (10 a 15 contrações)",
    onOff: "Rampa Subida 2s · Manutenção 6-10s · Descida 2s · Repouso 20-40s (1:3 ou 1:4)",
    intensidade: "Contração máxima clinicamente tolerada (≥ 60% da CVM).",
    polaridade: "Cátodo (-) no ponto motor do músculo alvo (maior despolarização).",
    dica: "Ativação de VMO pós-LCA, quadricípite pós-artroplastia e glúteo médio."
  },
  // NMES RESISTÊNCIA À FADIGA
  "nmes_resistencia": {
    name: "NMES Resistência Muscular",
    mecanismo: "Recrutamento de Fibras Tipo I (Oxidativas/Lentas)",
    hz: "25 - 35",
    us: "200 - 300",
    tempo: "25 a 30 min",
    onOff: "Rampa 1s · Manutenção 8s · Descida 1s · Repouso 8s (Razão 1:1)",
    intensidade: "Contração moderada e sustentada, sem dor aguda.",
    polaridade: "Bipolar sobre o ventre muscular ao longo das fibras.",
    dica: "Indicado para músculos posturais: multífidos, sóleo e romboides."
  },
  // CORRENTE RUSSA (MÉDIA FREQUÊNCIA 2500 HZ)
  "russa_forca": {
    name: "Corrente Russa (Kotz - Portadora 2.500 Hz)",
    mecanismo: "Menor impedância capacitiva da pele com modulação a 50 Hz",
    hz: "2.500 Hz (Burst 50 Hz, Ciclo 50%)",
    us: "Pulso Interno 200 µs (determinado pela portadora)",
    tempo: "15 a 20 min",
    onOff: "10s Contração / 50s Repouso (Razão 1:5 no protocolo de Kotz)",
    intensidade: "Contração tetânica potente e vigorosa com tolerância otimizada.",
    polaridade: "Canais CH1 e CH2 cruzados ou longitudinais no ventre.",
    dica: "Reduz a sensação de picada cutânea. Muito aceita em atletas e pós-operatório."
  },
  // CORRENTE AUSSIE (1000 HZ / 4000 HZ)
  "aussie_conforto": {
    name: "Corrente Aussie (Australiana)",
    mecanismo: "Burst curto (4ms ou 2ms) para máximo conforto sensorial e motor",
    hz: "1.000 Hz (Motor) ou 4.000 Hz (Sensorial)",
    us: "Burst duration 4 ms (motor) / 2 ms (analgésico)",
    tempo: "15 a 20 min",
    onOff: "Motor: 1:2 ou 1:3 | Analgésico: Contínuo",
    intensidade: "Contração profunda sem a queimação superficial de correntes polarizadas.",
    polaridade: "Bipolar longitudinal.",
    dica: "Padrão ouro em conforto no consultório europeu quando o paciente recusa TENS."
  },
  // FES (ESTIMULAÇÃO ELÉTRICA FUNCIONAL)
  "fes_marcha": {
    name: "FES (Funcional na Marcha ou Preensão)",
    mecanismo: "Integração sensório-motora em tarefas dinâmicas funcionais",
    hz: "30 - 45",
    us: "200 - 350",
    tempo: "20 a 30 min durante o treino de marcha",
    onOff: "Disparo por Switch de calcanhar ou sensor inercial na fase de balanço",
    intensidade: "Suficiente para dorsiflexão neutra sem eversão/inversão excessiva.",
    polaridade: "Cátodo (-) sobre o nervo fibular comum / tibial anterior.",
    dica: "Essencial em utentes pós-AVC com pé pendente ou paresias do nervo fibular."
  }
};

function calculateParameters() {
  const select = document.getElementById('calcSelectProtocol');
  const key = select.value;
  const proto = CLINICAL_PROTOCOLS[key];
  if (!proto) return;

  document.getElementById('resName').innerText = proto.name;
  document.getElementById('resMecanismo').innerText = proto.mecanismo;
  document.getElementById('resHz').innerText = proto.hz;
  document.getElementById('resUs').innerText = proto.us;
  document.getElementById('resTempo').innerText = proto.tempo;
  document.getElementById('resOnOff').innerText = proto.onOff;
  document.getElementById('resIntensidade').innerText = proto.intensidade;
  document.getElementById('resPolaridade').innerText = proto.polaridade;
  document.getElementById('resDica').innerText = proto.dica;
}

// 4. ATLAS FILTER
function filterAtlas(region, btn) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('.map-card');
  cards.forEach(c => {
    const cardRegion = c.getAttribute('data-region');
    if (region === 'all' || cardRegion === region) {
      c.style.display = 'block';
    } else {
      c.style.display = 'none';
    }
  });
}

// 5. SESSION NOTE GENERATOR
function generateSessionNote() {
  const patient = document.getElementById('logPatient').value || 'Utente';
  const region = document.getElementById('logRegion').value;
  const current = document.getElementById('logCurrent').value;
  const hz = document.getElementById('logHz').value;
  const us = document.getElementById('logUs').value;
  const time = document.getElementById('logTime').value;
  const notes = document.getElementById('logObs').value;

  const date = new Date().toLocaleDateString('pt-PT');

  const output = `REGISTO DE SESSÃO — FISIOVANTA PRO
Data: ${date}
Utente: ${patient}
Região Clínica: ${region}
Corrente Utilizada: ${current}
Parâmetros Aplicados: ${hz} Hz | ${us} µs | Tempo: ${time} min
Canais Utilizados: CH1 / CH2 (Posicionamento conforme Atlas 3D)
Observações & Evolução: ${notes || 'Sessão concluída com boa tolerância motora e alívio de sintomas referidos.'}
Assinatura: Fisioterapeuta Responsável`;

  document.getElementById('logOutputText').value = output;
  document.getElementById('logOutputWrap').style.display = 'block';
}

function copyNoteToClipboard() {
  const text = document.getElementById('logOutputText');
  text.select();
  document.execCommand('copy');
  alert('Nota clínica copiada para a área de transferência! Pronta para colar no prontuário.');
}

// INITIALIZE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
  // Init calculator with default protocol
  calculateParameters();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('FisioVanta Pro SW Registered!', reg.scope))
      .catch(err => console.log('SW Registration failed:', err));
  }
});
