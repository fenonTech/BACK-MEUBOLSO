/**************************************************************************
 * Objetivo: Controller para identificar e processar mensagens de transações
 * Data: 23/01/2026
 * Autor: Fenon Tech
 * Versão: 2.0 - Adicionado sistema de identificação de intenção
 **************************************************************************/

const axios = require("axios");
const controllerTransacao = require("../transacao/controllerTransacao.js");
const authDAO = require("../../model/DAO/auth.js");

// Constantes de intenção
const INTENCOES = {
  REGISTRAR_TRANSACAO: "REGISTRAR_TRANSACAO",
  CONSULTAR_TRANSACOES: "CONSULTAR_TRANSACOES",
  DELETAR_TRANSACAO: "DELETAR_TRANSACAO",
  SOLICITAR_DASHBOARD: "SOLICITAR_DASHBOARD",
  DESCONHECIDA: "DESCONHECIDA",
  PRODUTO: "PRODUTO",
  ALEATORIA: "ALEATORIA",
};

/**
 * Processa uma mensagem em linguagem natural e roteia para a ação apropriada
 * @param {string} frase - Mensagem em linguagem natural
 * @param {number} user_id - ID do usuário
 * @param {string} telefone - Telefone do usuário (opcional, para envio de mensagens)
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processarMensagem(frase, user_id, telefone = null) {
  try {
    console.log("🔍 [IDENTIFICADOR] Iniciando processamento da mensagem");
    console.log("📝 Frase:", frase);
    console.log("👤 User ID:", user_id);

    // Identificar intenção do usuário
    const intencao = await identificarIntencao(frase);
    console.log("🎯 Intenção identificada:", intencao);

    // Rotear para o handler apropriado
    switch (intencao) {
      case INTENCOES.REGISTRAR_TRANSACAO:
        return await handlerRegistrarTransacao(frase, user_id, telefone);

      case INTENCOES.CONSULTAR_TRANSACOES:
        return await handlerConsultarTransacoes(frase, user_id);

      case INTENCOES.DELETAR_TRANSACAO:
        return await handlerDeletarTransacao(frase, user_id, telefone);

      case INTENCOES.SOLICITAR_DASHBOARD:
        return await handlerSolicitarDashboard(telefone);

      case INTENCOES.PRODUTO:
      case INTENCOES.ALEATORIA:
      case INTENCOES.DESCONHECIDA:
      default:
        console.log("❓ Intenção não reconhecida ou fora de escopo");

        return {
          status: "erro",
          status_code: 400,
          message:
            "Não consegui entender sua solicitação. Tente reformular a mensagem.",
        };
    }
  } catch (error) {
    console.error("❌ [IDENTIFICADOR] Erro ao processar mensagem:", error);
    throw error;
  }
}

// ==============================
// IDENTIFICAÇÃO DE INTENÇÃO
// ==============================

/**
 * Identifica a intenção do usuário baseado na mensagem
 * @param {string} frase - Mensagem do usuário
 * @returns {Promise<string>} Intenção identificada
 */ async function identificarIntencao(frase) {
  console.log("🎯 Identificando intenção...");
  const msg = frase
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  /* =========================
   SOLICITAR DASHBOARD
   (PRIORIDADE ALTA - palavras específicas)
========================= */
  const palavrasDashboard = [
    "dashboard",
    "painel",
    "meu painel",
    "meu dashboard",
    "site",
    "meu site",
    "portal",
    "acessar dashboard",
    "acessar painel",
    "link do dashboard",
    "link do painel",
  ];

  const isDashboard = palavrasDashboard.some((palavra) =>
    msg.includes(palavra),
  );

  if (isDashboard) {
    return INTENCOES.SOLICITAR_DASHBOARD;
  }

  /* =========================
   CONSULTAS / RELATÓRIOS
========================= */
  const palavrasConsulta = [
    "quanto",
    "saldo",
    "o que",
    "quais",
    "listar",
    "mostrar",
    "ver",
    "visualizar",
    "relatorio",
    "extrato",
    "resumo",
    "total gasto",
    "media de gastos",
    "gastos do mes",
    "gastos da semana",
    "quanto sobrou",
    "balanco",
    "estatistica",
  ];

  const palavraConsultaEncontrada = palavrasConsulta.find((palavra) =>
    msg.includes(palavra),
  );
  const isConsulta = palavraConsultaEncontrada !== undefined;

  /* =========================
   REGISTRO (gasto / entrada)
========================= */
  const palavrasRegistro = [
    "gastei",
    "gasto",
    "registre",
    "gastar",
    "gastarei",
    "gasterei",
    "paguei",
    "pago",
    "pagar",
    "pagarei",
    "vou pagar",
    "comprei",
    "comprar",
    "compra",
    "recebi",
    "receber",
    "receberei",
    "vou receber",
    "ganhei",
    "ganhar",
    "ganharei",
    "salario",
    "pix recebido",
    "pix enviado",
    "anotar",
    "registrar",
    "lancar",
    "adicionar gasto",
    "adicionar entrada",
    "lembrar gasto",
    "lembrar pagamento",
    "conta para pagar",
    "boleto",
  ];

  const isRegistro = palavrasRegistro.some((palavra) => msg.includes(palavra));

  /* =========================
   VALOR (OBRIGATÓRIO PARA REGISTRO)
========================= */
  const numeros = extrairNumeros(frase);
  const temValor = numeros.length > 0;

  console.log("📝 Debug intenção:", {
    isRegistro,
    isConsulta,
    palavraConsultaEncontrada,
    temValor,
    numeros,
    msg: msg.substring(0, 100),
  });

  // PRIORIDADE 1: Se tem palavra de CONSULTA, é CONSULTA (mesmo que tenha palavra de registro)
  // Ex: "quanto gastei", "quanto recebi", "mostrar o que gastei"
  if (isConsulta) {
    console.log(
      "✅ Detectado como CONSULTA - Palavra encontrada:",
      palavraConsultaEncontrada,
    );
    return INTENCOES.CONSULTAR_TRANSACOES;
  }

  // PRIORIDADE 2: Se tem palavra de registro + valor, é REGISTRO
  // Ex: "gastei 50 reais", "recebi treze reais"
  if (isRegistro && temValor) {
    console.log("✅ Detectado como REGISTRO");
    return INTENCOES.REGISTRAR_TRANSACAO;
  }

  /* =========================
   DELETAR TRANSAÇÃO
========================= */
  const palavrasDeletar = [
    "deletar",
    "delete",
    "apague",
    "apagar",
    "excluir",
    "remover",
    "cancelar",
    "desfazer",
    "ultima",
    "último",
    "ultima transacao",
    "última transação",
    "apaga a ultima",
    "remove a ultima",
    "deleta a ultima",
  ];

  const isDeletar = palavrasDeletar.some((palavra) => msg.includes(palavra));

  if (isDeletar) {
    return INTENCOES.DELETAR_TRANSACAO;
  }

  /* =========================
   CASOS AMBÍGUOS
========================= */
  // Ex: "gastei ontem", "paguei uber"
  // Não registra → consulta ou agente
  if (isRegistro && !temValor) {
    return INTENCOES.CONSULTAR_TRANSACOES;
  }

  /* =========================
   FALLBACK IA
========================= */
  console.log("🤖 Chamando agente de IA para identificar intenção...");
  const categoriaIA = await agenteIdentificarIntencao(frase);

  const mapeamento = {
    registro: INTENCOES.REGISTRAR_TRANSACAO,
    relatorio: INTENCOES.CONSULTAR_TRANSACOES,
    dashboard: INTENCOES.SOLICITAR_DASHBOARD,
    deletar: INTENCOES.DELETAR_TRANSACAO,
    duvida_produto: INTENCOES.PRODUTO,
    duvida_aleatoria: INTENCOES.ALEATORIA,
  };

  return mapeamento[categoriaIA] || INTENCOES.DESCONHECIDA;
}

// ==============================
// HANDLERS DE INTENÇÃO
// ==============================

/**
 * Handler para registrar uma nova transação
 */
async function handlerRegistrarTransacao(frase, user_id, telefone) {
  console.log("💾 [HANDLER] Registrar transação");

  // Extrai números da mensagem
  const numeros = extrairNumeros(frase);
  console.log("🔢 Números extraídos:", numeros);

  // Detectar múltiplas transações (mais de 2 valores ou múltiplas conjunções)
  const temMultiplasTransacoes = detectarMultiplasTransacoes(frase, numeros);

  if (temMultiplasTransacoes) {
    console.log("⚠️ Detectadas múltiplas transações na mensagem");

    if (telefone) {
      const mensagemOrientacao = `⚠️ Detectei que você está tentando registrar múltiplas transações de uma vez.

📝 *Por favor, registre uma transação por vez:*

Exemplo correto:
• "Gastei 50 reais com Uber"
• "Gastei 60 reais com pão"

Isso me ajuda a registrar corretamente cada gasto ou entrada! 😊`;

      await enviarMensagemWhatsApp(telefone, mensagemOrientacao);
    }

    return {
      status: "info",
      status_code: 200,
      message: "Por favor, registre uma transação por vez",
      mensagemEnviada: true,
    };
  }

  // Interpreta os componentes da transação
  const dataPagamento = await interpretarData(frase, numeros);
  let valor = await interpretarValor(frase, numeros);
  const is_entrada = await interpretarTipo(frase);

  // Se o valor vier com múltiplos valores separados por |, somar todos
  if (typeof valor === "string" && valor.includes("|")) {
    console.log("🔢 Múltiplos valores detectados, somando:", valor);
    const valores = valor.split("|").map((v) => parseFloat(v.trim()));
    valor = valores.reduce((acc, v) => acc + v, 0);
    console.log("💰 Valor total após soma:", valor);
  }

  console.log("📊 Dados interpretados:", {
    dataPagamento,
    valor,
    is_entrada,
  });

  // Monta payload da transação
  const payloadTransacao = montarPayload(user_id, frase, {
    dataPagamento,
    valor,
    is_entrada,
  });

  // Insere a transação no banco de dados
  console.log("💾 Inserindo transação no banco de dados...");
  const resultado = await controllerTransacao.inserirTransacao(
    payloadTransacao,
    "application/json",
  );

  console.log("📊 Resultado da inserção:", resultado);

  // Se a transação foi inserida com sucesso, enviar mensagem formatada
  if (resultado.status_code === 201 && resultado.transacao && telefone) {
    // Gerar código temporário para o link do dashboard
    const codigo = authDAO.gerarCodigoTemp();
    const codigoArmazenado = await authDAO.armazenarCodigo(
      telefone,
      codigo,
      false,
    );

    const mensagemFormatada = formatarMensagemTransacao(
      resultado.transacao,
      is_entrada,
      valor,
      dataPagamento,
      frase,
      telefone,
      codigoArmazenado ? codigo : null,
    );

    console.log("📱 Enviando confirmação de registro...");
    console.log(
      "📊 Transação retornada:",
      JSON.stringify(resultado.transacao, null, 2),
    );
    await enviarMensagemWhatsApp(telefone, mensagemFormatada);
  }

  return resultado;
}

/**
 * Handler para consultar transações
 */
async function handlerConsultarTransacoes(frase, user_id) {
  console.log("🔍 [HANDLER] Consultar transações");
  console.log("📝 Mensagem:", frase);
  console.log("👤 User ID:", user_id);

  try {
    // Chamar API de relatórios
    console.log("📊 Chamando API de relatórios...");
    console.time("⏱️ [IA] agenteDeRelatorios");
    const response = await axios.post(
      "https://n8n.srv1056458.hstgr.cloud/webhook/agenteDeRelatorios",
      {
        mensagem: frase,
        idUsuario: user_id,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 segundos para relatórios
      },
    );
    console.timeEnd("⏱️ [IA] agenteDeRelatorios");

    const relatorio = response.data?.relatorio;
    console.log("✅ Relatório gerado:", relatorio);

    if (!relatorio) {
      console.log("⚠️ Relatório vazio");
      return {
        status: "info",
        status_code: 200,
        message: "Não foi possível gerar o relatório",
      };
    }

    // Retornar relatório para ser enviado via webhook na rota
    return {
      status: "sucesso",
      status_code: 200,
      message: "Relatório gerado com sucesso",
      relatorio: relatorio,
    };
  } catch (error) {
    console.error("❌ Erro ao consultar transações:", error.message);
    return {
      status: "erro",
      status_code: 500,
      message: "Erro ao gerar relatório",
    };
  }
}

/**
 * Handler para consultar saldo
 * TODO: Implementar lógica de saldo
 */
async function handlerConsultarSaldo(frase, user_id) {
  console.log("💰 [HANDLER] Consultar saldo");

  // TODO: Implementar cálculo de saldo
  return {
    status: "info",
    status_code: 200,
    message: "Funcionalidade de saldo em desenvolvimento",
  };
}

/**
 * Handler para deletar transação
 */
async function handlerDeletarTransacao(frase, user_id, telefone) {
  console.log("🗑️ [HANDLER] Deletar transação");
  console.log("📝 Mensagem:", frase);
  console.log("👤 User ID:", user_id);

  try {
    // Tentar extrair ID da mensagem
    const idMatch = frase.match(/\b(\d+)\b/);
    let transacaoCodigo = null;
    let ehUltimaTransacao = false;

    if (idMatch) {
      transacaoCodigo = parseInt(idMatch[1]);
      console.log("🆔 ID identificado na mensagem:", transacaoCodigo);
    } else {
      // Se não encontrou ID, buscar a última transação do usuário
      console.log("🔍 Buscando última transação do usuário...");
      ehUltimaTransacao = true;
      const transacoes = await controllerTransacao.listarTransacoesPorUsuario(
        user_id,
        {},
      );

      if (
        transacoes.status_code === 200 &&
        transacoes.transacoes &&
        transacoes.transacoes.length > 0
      ) {
        transacaoCodigo = transacoes.transacoes[0].codigo;
        console.log("📌 Última transação encontrada:", transacaoCodigo);
      } else {
        console.log("⚠️ Nenhuma transação encontrada");

        // Enviar mensagem ao usuário
        if (telefone) {
          await enviarMensagemWhatsApp(
            telefone,
            "❌ Você ainda não possui nenhuma transação para deletar.",
          );
        }

        return {
          status: "erro",
          status_code: 404,
          message: "Nenhuma transação encontrada para deletar",
          mensagemEnviada: true,
        };
      }
    }

    // Buscar detalhes da transação antes de deletar (para confirmação)
    const transacaoParaDeletar =
      await controllerTransacao.buscarTransacaoPorCodigo(transacaoCodigo);

    if (transacaoParaDeletar.status_code !== 200) {
      console.log("⚠️ Transação não encontrada");

      // Enviar mensagem ao usuário
      if (telefone) {
        await enviarMensagemWhatsApp(
          telefone,
          `❌ Transação não encontrada.\n\nVerifique se o ID ${transacaoCodigo} está correto.`,
        );
      }

      return {
        status: "erro",
        status_code: 404,
        message: "Transação não encontrada",
        mensagemEnviada: true,
      };
    }

    // Verificar se a transação pertence ao usuário
    if (transacaoParaDeletar.transacao.user_id !== user_id) {
      console.log("⚠️ Tentativa de deletar transação de outro usuário");
      console.log("👤 User ID solicitante:", user_id);
      console.log(
        "👤 User ID da transação:",
        transacaoParaDeletar.transacao.user_id,
      );

      // Enviar mensagem ao usuário
      if (telefone) {
        await enviarMensagemWhatsApp(
          telefone,
          `❌ Esta transação não pertence a você.\n\nVocê só pode deletar suas próprias transações.`,
        );
      }

      return {
        status: "erro",
        status_code: 403,
        message: "Você não tem permissão para deletar esta transação",
        mensagemEnviada: true,
      };
    }

    // Deletar transação
    console.log("🗑️ Deletando transação:", transacaoCodigo);
    const resultado = await controllerTransacao.excluirTransacao(
      transacaoCodigo,
      user_id,
    );

    console.log("📊 Resultado da exclusão:", resultado);

    // Se deletou com sucesso, enviar confirmação
    if (resultado.status_code === 200 && telefone) {
      // Gerar código temporário para o link do dashboard
      const codigo = authDAO.gerarCodigoTemp();
      const codigoArmazenado = await authDAO.armazenarCodigo(
        telefone,
        codigo,
        false,
      );

      const mensagemConfirmacao = formatarMensagemDelecao(
        transacaoParaDeletar.transacao,
        telefone,
        codigoArmazenado ? codigo : null,
        ehUltimaTransacao,
      );

      console.log("📱 Enviando confirmação de exclusão...");
      await enviarMensagemWhatsApp(telefone, mensagemConfirmacao);
    }

    return resultado;
  } catch (error) {
    console.error("❌ Erro ao deletar transação:", error.message);
    return {
      status: "erro",
      status_code: 500,
      message: "Erro ao deletar transação",
    };
  }
}

/**
 * Handler para solicitar dashboard
 */
async function handlerSolicitarDashboard(telefone) {
  console.log("📊 [HANDLER] Solicitar dashboard");
  console.log("📱 Telefone:", telefone);

  try {
    if (!telefone) {
      return {
        status: "erro",
        status_code: 400,
        message: "Telefone não fornecido",
      };
    }

    // Gerar código temporário
    const codigo = authDAO.gerarCodigoTemp();
    const codigoArmazenado = await authDAO.armazenarCodigo(
      telefone,
      codigo,
      false,
    );

    if (!codigoArmazenado) {
      console.error("❌ [DASHBOARD] Erro ao gerar código temporário");
      return {
        status: "erro",
        status_code: 500,
        message: "Erro ao gerar código de acesso",
      };
    }

    console.log("✅ [DASHBOARD] Código temporário gerado:", codigo);

    // Montar mensagem com link
    const mensagem = `📊 Aqui está o link para acessar seu dashboard:

https://www.meubolsoia.com.br/dashboard/index.html?telefone=${encodeURIComponent(telefone)}&codigo=${codigo}

✨ Visualize todas as suas transações, entradas e saídas de forma organizada!`;

    // Enviar mensagem
    console.log("📱 Enviando link do dashboard...");
    await enviarMensagemWhatsApp(telefone, mensagem);

    return {
      status: "sucesso",
      status_code: 200,
      message: "Link do dashboard enviado com sucesso",
      mensagemEnviada: true,
    };
  } catch (error) {
    console.error("❌ Erro ao solicitar dashboard:", error.message);
    return {
      status: "erro",
      status_code: 500,
      message: "Erro ao enviar link do dashboard",
    };
  }
}

/**
 * Handler para atualizar transação
 * TODO: Implementar lógica de atualização
 */
async function handlerAtualizarTransacao(frase, user_id) {
  console.log("✏️ [HANDLER] Atualizar transação");

  // TODO: Implementar identificação e atualização da transação
  return {
    status: "info",
    status_code: 200,
    message: "Funcionalidade de atualização em desenvolvimento",
  };
}

/**
 * Interpreta a data da mensagem
 */
async function interpretarData(frase, numeros) {
  console.log("📅 Interpretando data...");

  // Tenta interpretação simples primeiro
  if (numeros.length <= 1) {
    const dataSimples = interpretarDataSimples(frase);
    if (dataSimples) {
      console.log("📅 Data interpretada (simples):", dataSimples);
      return dataSimples;
    }
  }

  // Fallback para agente de IA
  console.log("🤖 Chamando agente de IA para interpretar data...");
  const respostaIA = await agenteInterpretarData(frase);
  console.log("📅 Data interpretada (IA):", respostaIA.data);
  return respostaIA.data;
}

/**
 * Interpreta o valor da mensagem
 */
async function interpretarValor(frase, numeros) {
  console.log("💰 Interpretando valor...");

  // Se há apenas um número, assume como valor
  if (numeros.length === 1) {
    console.log("💰 Valor interpretado (simples):", numeros[0]);
    return numeros[0];
  }

  // Fallback para agente de IA
  console.log("🤖 Chamando agente de IA para interpretar valor...");
  const respostaIA = await agenteInterpretarValor(frase);
  console.log("💰 Valor interpretado (IA):", respostaIA.valor);
  return respostaIA.valor;
}

/**
 * Interpreta o tipo da transação (entrada ou saída)
 */
async function interpretarTipo(frase) {
  console.log("↔️ Interpretando tipo (entrada/saída)...");

  // Tenta interpretação por palavras-chave
  const tipoSimples = interpretarIsEntrada(frase);
  if (tipoSimples !== null) {
    console.log("↔️ Tipo interpretado (simples):", tipoSimples);
    return tipoSimples;
  }

  // Fallback para agente de IA
  console.log("🤖 Chamando agente de IA para interpretar tipo...");
  const respostaIA = await agenteInterpretarTipo(frase);
  console.log("↔️ Tipo interpretado (IA):", respostaIA.is_entrada);
  return respostaIA.is_entrada;
}

/**
 * Monta o payload da transação
 */
function montarPayload(user_id, descricao, dados) {
  const payload = {
    user_id,
    descricao,
    valor: dados.valor,
    is_entrada: dados.is_entrada,
    data_pagamento: dados.dataPagamento,
  };

  console.log("📦 Payload montado:", JSON.stringify(payload, null, 2));
  return payload;
}

// ==============================
// FUNÇÕES AUXILIARES
// ==============================

/**
 * Detecta se a mensagem contém múltiplas transações
 */
function detectarMultiplasTransacoes(frase, numeros) {
  // Se há mais de 2 valores, provavelmente são múltiplas transações
  if (numeros.length > 2) {
    return true;
  }

  // Detectar múltiplas conjunções que indicam lista
  const conjuncoes = (frase.match(/\be\b/gi) || []).length;
  if (conjuncoes >= 2 && numeros.length >= 2) {
    return true;
  }

  // Detectar padrões de lista (vírgula + "e")
  const temVirgula = frase.includes(",");
  const temE = /\be\b/i.test(frase);
  if (temVirgula && temE && numeros.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Extrai números de um texto (valores monetários)
 */
function extrairNumeros(texto) {
  const numeros = [];

  // Regex para números numéricos (ex: 13, 13.50, 13,50)
  const numerosDigitos = texto.match(/\d+(?:[.,]\d{1,2})?/g);
  if (numerosDigitos) {
    numeros.push(...numerosDigitos.map((n) => parseFloat(n.replace(",", "."))));
  }

  // Mapa de números por extenso (0-99)
  const numerosPorExtenso = {
    zero: 0,
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    quatorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezasseis: 16,
    dezessete: 17,
    dezassete: 17,
    dezoito: 18,
    dezenove: 19,
    dezanove: 19,
    vinte: 20,
    trinta: 30,
    quarenta: 40,
    cinquenta: 50,
    sessenta: 60,
    setenta: 70,
    oitenta: 80,
    noventa: 90,
    cem: 100,
    cento: 100,
    duzentos: 200,
    trezentos: 300,
    quatrocentos: 400,
    quinhentos: 500,
    seiscentos: 600,
    setecentos: 700,
    oitocentos: 800,
    novecentos: 900,
    mil: 1000,
    milhao: 1000000,
    milhão: 1000000,
  };

  // Normalizar texto para buscar números por extenso
  const textoNormalizado = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Procurar por números por extenso
  for (const [palavra, valor] of Object.entries(numerosPorExtenso)) {
    const palavraNormalizada = palavra
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const regex = new RegExp(`\\b${palavraNormalizada}\\b`, "gi");
    if (regex.test(textoNormalizado)) {
      numeros.push(valor);
    }
  }

  return numeros;
}

/**
 * Interpreta datas simples (hoje, ontem, amanhã)
 */
function interpretarDataSimples(texto) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const t = texto.toLowerCase();

  // Datas relativas simples
  if (t.includes("ontem")) {
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    return ontem.toISOString().split("T")[0];
  }

  if (t.includes("hoje")) {
    return hoje.toISOString().split("T")[0];
  }

  if (t.includes("amanha") || t.includes("amanhã")) {
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    return amanha.toISOString().split("T")[0];
  }

  // Dias da semana → requer IA
  const diasDaSemana = [
    "segunda",
    "terça",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
    "sabado",
    "domingo",
  ];
  if (diasDaSemana.some((dia) => t.includes(dia))) {
    return null;
  }

  // Referências temporais complexas → requer IA
  const palavrasTempo = ["dia", "semana", "mês", "mes", "ano"];
  const indicativos = [
    "passado",
    "que vem",
    "esta",
    "nessa",
    "próximo",
    "proximo",
  ];
  if (
    palavrasTempo.some((p) => t.includes(p)) &&
    indicativos.some((i) => t.includes(i))
  ) {
    return null;
  }

  // Se não há referência temporal, assume hoje
  return hoje.toISOString().split("T")[0];
}

/**
 * Interpreta se é entrada ou saída por palavras-chave
 */
function interpretarIsEntrada(texto) {
  const t = texto.toLowerCase();

  // Palavras que indicam entrada (receita)
  const palavrasEntrada =
    /recebi|entrou|ganhei|aluguel|salario|salário|vendi|receita/;
  if (palavrasEntrada.test(t)) return true;

  // Palavras que indicam saída (despesa)
  const palavrasSaida = /paguei|gastei|comprei|pago|despesa|conta/;
  if (palavrasSaida.test(t)) return false;

  // Ambíguo - requer IA
  return null;
}

// ==============================
// ENVIO DE MENSAGENS
// ==============================

/**
 * Formata mensagem de confirmação de transação
 */
function formatarMensagemTransacao(
  transacao,
  is_entrada,
  valor,
  data,
  descricao,
  telefone,
  codigo,
) {
  const tipo = is_entrada ? "Entrada" : "Saída";
  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);

  const dataFormatada = new Date(data + "T00:00:00").toLocaleDateString(
    "pt-BR",
  );

  // O ID pode estar como 'id' ou 'codigo' dependendo do retorno do banco
  const idTransacao = transacao.codigo || transacao.id || "N/A";

  const linkDashboard = codigo
    ? `\n\n📊 Para visualizar melhor seus gastos e entradas, utilize o dashboard:\nhttps://www.meubolsoia.com.br/dashboard/index.html?telefone=${encodeURIComponent(telefone)}&codigo=${codigo}`
    : "";

  return `✅ Transação registrada com sucesso!

🆔 ID: ${idTransacao}
💸 Tipo: ${tipo}
💰 Valor: ${valorFormatado}
📅 Data: ${dataFormatada}
📝 Descrição: ${descricao}${linkDashboard}`;
}

/**
 * Formata mensagem de confirmação de exclusão
 */
function formatarMensagemDelecao(
  transacao,
  telefone,
  codigo,
  ehUltimaTransacao = false,
) {
  const linkDashboard = codigo
    ? `\n\n📊 Para visualizar melhor seus gastos e entradas, utilize o dashboard:\nhttps://www.meubolsoia.com.br/dashboard/index.html?telefone=${encodeURIComponent(telefone)}&codigo=${codigo}`
    : "";

  // Formatar valor
  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(transacao.valor || 0);

  // Tipo da transação
  const tipo = transacao.is_entrada ? "📥 Entrada" : "📤 Saída";

  const mensagem = ehUltimaTransacao
    ? `✅ Última transação excluída com sucesso!

🆔 ID: ${transacao.codigo}
${tipo}
💰 Valor: ${valorFormatado}
📝 Descrição: ${transacao.descricao || "Sem descrição"}`
    : `✅ Transação excluída com sucesso!

🆔 ID: ${transacao.codigo}
${tipo}
💰 Valor: ${valorFormatado}
📝 Descrição: ${transacao.descricao || "Sem descrição"}`;

  return `${mensagem}${linkDashboard}`;
}

/**
 * Envia mensagem via webhook n8n
 * @param {string} telefone - Número de telefone do destinatário
 * @param {string} mensagem - Mensagem a ser enviada
 * @returns {Promise<boolean>} Sucesso ou falha
 */
async function enviarMensagemWhatsApp(telefone, mensagem) {
  try {
    // Validar parâmetros
    if (!telefone || !mensagem) {
      console.error("❌ Telefone ou mensagem não fornecidos");
      return false;
    }

    const webhookUrl =
      "https://n8n.srv1056458.hstgr.cloud/webhook/enviarMensagem";

    console.log("📞 Enviando mensagem via WhatsApp...");
    console.log("📱 Telefone:", telefone);
    console.log("💬 Mensagem preview:", mensagem.substring(0, 100) + "...");

    const response = await axios.post(
      webhookUrl,
      {
        telefone: telefone,
        mensagem: mensagem,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    if (response.status === 200) {
      console.log("✅ Mensagem enviada com sucesso");
      return true;
    } else {
      console.error("⚠️ Webhook retornou status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error.message);
    return false;
  }
}

// ==============================
// AGENTES DE IA (APIs n8n)
// ==============================

/**
 * Faz chamada HTTP POST para os agentes de IA usando Axios
 */
async function chamarAgenteIA(url, mensagem) {
  const nomeAgente = url.split("/").pop();
  const timerLabel = `⏱️ [IA] ${nomeAgente}`;

  try {
    console.time(timerLabel);
    const response = await axios.post(
      url,
      {
        mensagem: mensagem,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 segundos
      },
    );
    console.timeEnd(timerLabel);

    return response.data;
  } catch (error) {
    console.timeEnd(timerLabel);
    console.error("❌ Erro ao chamar agente de IA:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    return null;
  }
}

/**
 * Agente de IA para identificar intenção (roteador)
 * @returns {Promise<string>} Categoria: "registro", "relatorio", "dashboard", "duvida_produto", "duvida_aleatoria"
 */
async function agenteIdentificarIntencao(frase) {
  console.log("🤖 [IA ROTEADOR] Identificando intenção:", frase);

  const resultado = await chamarAgenteIA(
    "https://n8n.srv1056458.hstgr.cloud/webhook/agenteRoteador",
    frase,
  );

  if (resultado && resultado.categoria) {
    console.log("✅ Categoria identificada:", resultado.categoria);
    return resultado.categoria;
  }

  console.log("⚠️ Falha ao identificar categoria, usando padrão");
  return "duvida_aleatoria";
}

/**
 * Agente de IA para interpretar data
 * @returns {Promise<Object>} { data: "YYYY-MM-DD" }
 */
async function agenteInterpretarData(frase) {
  console.log("🤖 [IA DATA] Analisando data:", frase);

  const resultado = await chamarAgenteIA(
    "https://n8n.srv1056458.hstgr.cloud/webhook/agenteDeData",
    frase,
  );

  if (resultado && resultado.data) {
    console.log("✅ Data identificada:", resultado.data);
    return { data: resultado.data };
  }

  console.log("⚠️ Falha ao interpretar data, usando hoje");
  const hoje = new Date().toISOString().split("T")[0];
  return { data: hoje };
}

/**
 * Agente de IA para interpretar valor
 * @returns {Promise<Object>} { valor: number }
 */
async function agenteInterpretarValor(frase) {
  console.log("🤖 [IA VALOR] Analisando valor:", frase);

  const resultado = await chamarAgenteIA(
    "https://n8n.srv1056458.hstgr.cloud/webhook/agenteDeValor",
    frase,
  );

  if (resultado && resultado.valor !== undefined) {
    console.log("✅ Valor identificado:", resultado.valor);
    return { valor: resultado.valor };
  }

  console.log("⚠️ Falha ao interpretar valor");
  return { valor: null };
}

/**
 * Agente de IA para interpretar tipo (entrada ou saída)
 * @returns {Promise<Object>} { is_entrada: boolean }
 */
async function agenteInterpretarTipo(frase) {
  console.log("🤖 [IA TIPO] Analisando tipo:", frase);

  const resultado = await chamarAgenteIA(
    "https://n8n.srv1056458.hstgr.cloud/webhook/agenteEntradaESaida",
    frase,
  );

  if (resultado && resultado.tipo !== undefined) {
    console.log("✅ Tipo identificado:", resultado.tipo);
    return { is_entrada: resultado.tipo };
  }

  console.log("⚠️ Falha ao interpretar tipo");
  return { is_entrada: null };
}

module.exports = {
  processarMensagem,
  enviarMensagemWhatsApp,
  INTENCOES, // Exportar constantes para uso externo se necessário
};
