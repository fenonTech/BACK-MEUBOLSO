/**************************************************************************
 * Objetivo: Controller responsável pela lógica de autenticação
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const jwt = require("jsonwebtoken");
const MESSAGE = require("../modulo/config.js");
const authDAO = require("../model/DAO/auth.js");
const usuarioDAO = require("../model/DAO/usuario.js");
const historicoAssinaturaDAO = require("../model/DAO/historicoAssinatura.js");
const { mapearPlanoId } = require("./assinatura/controllerAssinatura.js");

/**
 * HELPER: Obter data/hora atual no horário de Brasília (UTC-3)
 */
const getDataBrasilia = function () {
  const agora = new Date();
  // Brasília está 3 horas ATRÁS de UTC (UTC-3)
  // Então precisamos SUBTRAIR 3 horas do horário UTC
  const dataBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return dataBrasilia;
};

/**
 * ENVIAR CÓDIGO DE AUTENTICAÇÃO
 */
const enviarCodigo = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // Gerar código de 6 dígitos
    const codigo = authDAO.gerarCodigoTemp();

    // Armazenar código no banco
    const codigoArmazenado = await authDAO.armazenarCodigo(
      dados.telefone,
      codigo,
      dados.is_segundaValidacao || false,
    );

    if (codigoArmazenado) {
      // TODO: Integrar com serviço de envio de SMS (Twilio, etc)
      console.log(`Código enviado para ${dados.telefone}: ${codigo}`);

      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Código enviado com sucesso",
      };
    } else {
      return MESSAGE.ERROR_INTERNAL_SERVER_DB;
    }
  } catch (error) {
    console.error("Erro no controller enviarCodigo:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * VALIDAR CÓDIGO DE AUTENTICAÇÃO
 */
const validarCodigo = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone || !dados.codigo) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    const codigoValido = await authDAO.validarCodigoTemp(
      dados.telefone,
      dados.codigo,
    );

    if (codigoValido) {
      // Buscar dados do usuário pelo telefone
      const usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

      if (!usuario) {
        return {
          status: MESSAGE.ERROR_NOT_FOUND.status,
          status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
          message: "Usuário não encontrado",
        };
      }

      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Código validado com sucesso",
        usuario: usuario,
      };
    } else {
      return {
        status: MESSAGE.ERROR_BAD_REQUEST.status,
        status_code: MESSAGE.ERROR_BAD_REQUEST.status_code,
        message: "Código inválido ou expirado",
      };
    }
  } catch (error) {
    console.error("Erro no controller validarCodigo:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * VALIDAR ASSINATURA DO USUÁRIO
 */
const validarAssinatura = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // Buscar usuário pelo telefone
    const usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

    if (!usuario) {
      return {
        status: MESSAGE.ERROR_NOT_FOUND.status,
        status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
        message: "Usuário não encontrado",
      };
    }

    // Verificar assinatura baseado no plano_id (usando horário de Brasília)
    const agora = getDataBrasilia();
    // Zerar horas para comparar apenas datas (UTC)
    const hojeInicio = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
    );

    console.log("=== DEBUG VALIDAR ASSINATURA ===");
    console.log("Telefone:", dados.telefone);
    console.log("Plano ID:", usuario.plano_id);
    console.log("Hoje (Brasília):", hojeInicio);

    if (usuario.plano_id === 1) {
      // Plano teste/gratuito - validar trial_end
      if (usuario.trial_end) {
        const trialEnd = new Date(usuario.trial_end);
        const trialEndDia = new Date(
          Date.UTC(
            trialEnd.getUTCFullYear(),
            trialEnd.getUTCMonth(),
            trialEnd.getUTCDate(),
          ),
        );
        const expirado = trialEndDia < hojeInicio;

        console.log("Trial End:", usuario.trial_end);
        console.log("Trial End Dia:", trialEndDia);
        console.log("Expirado?", expirado);

        return {
          expirado: expirado,
        };
      }

      // Trial não configurado - considerar como expirado
      console.log("Trial não configurado");
      return {
        expirado: true,
      };
    } else {
      // Plano pago - buscar último histórico de assinatura
      const historicos = await historicoAssinaturaDAO.selectHistoricoByUsuario(
        usuario.id,
      );

      console.log("Históricos encontrados:", historicos?.length || 0);

      if (historicos && historicos.length > 0) {
        const ultimoHistorico = historicos[0]; // Já vem ordenado por data DESC
        console.log("Último histórico:", ultimoHistorico);
        console.log("Prazo original:", ultimoHistorico.prazo);
        console.log("is_cancelado:", ultimoHistorico.is_cancelado);

        const prazo = new Date(ultimoHistorico.prazo);
        const prazoDia = new Date(
          Date.UTC(
            prazo.getUTCFullYear(),
            prazo.getUTCMonth(),
            prazo.getUTCDate(),
          ),
        );
        console.log("Prazo Dia:", prazoDia);
        console.log("Hoje Inicio:", hojeInicio);
        console.log("prazoDia < hojeInicio?", prazoDia < hojeInicio);

        const expirado = ultimoHistorico.is_cancelado || prazoDia < hojeInicio;
        console.log("Expirado final?", expirado);

        return {
          expirado: expirado,
        };
      }

      // Sem histórico de assinatura
      console.log("Sem histórico de assinatura");
      return {
        expirado: true,
      };
    }
  } catch (error) {
    console.error("Erro no controller validarAssinatura:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * LOGIN COMPLETO (VALIDA CÓDIGO + ASSINATURA + RETORNA JWT)
 */
const login = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone || !dados.codigo) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // 1. Validar código temporário
    const codigoValido = await authDAO.validarCodigoTemp(
      dados.telefone,
      dados.codigo,
    );

    if (!codigoValido) {
      return {
        status: MESSAGE.ERROR_BAD_REQUEST.status,
        status_code: MESSAGE.ERROR_BAD_REQUEST.status_code,
        message: "Código inválido ou expirado",
      };
    }

    // 2. Buscar usuário
    const usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

    if (!usuario) {
      return {
        status: MESSAGE.ERROR_NOT_FOUND.status,
        status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
        message: "Usuário não encontrado",
      };
    }

    // 3. Verificar assinatura baseado no plano_id (usando horário de Brasília)
    let assinaturaAtiva = false;
    let assinaturaTipo = null;
    let assinaturaValidade = null;
    let planoNome = null;

    const agora = getDataBrasilia();
    // Zerar horas para comparar apenas datas (UTC)
    const hojeInicio = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
    );

    console.log("🔍 [LOGIN] Validando assinatura...");
    console.log("🔍 [LOGIN] Usuario plano_id:", usuario.plano_id);
    console.log("🔍 [LOGIN] Data atual (Brasília):", hojeInicio);

    if (usuario.plano_id === 1) {
      // Plano teste/gratuito - validar trial_end
      console.log("📋 [LOGIN] Validando plano gratuito/trial");
      console.log("📋 [LOGIN] Trial end:", usuario.trial_end);

      if (usuario.trial_end) {
        const trialEnd = new Date(usuario.trial_end);
        const trialEndDia = new Date(
          Date.UTC(
            trialEnd.getUTCFullYear(),
            trialEnd.getUTCMonth(),
            trialEnd.getUTCDate(),
          ),
        );
        console.log("📋 [LOGIN] Trial end (Date):", trialEndDia);
        console.log("📋 [LOGIN] Trial ativo?", trialEndDia >= hojeInicio);

        if (trialEndDia >= hojeInicio) {
          assinaturaAtiva = true;
          assinaturaTipo = "trial";
          assinaturaValidade = usuario.trial_end;
          planoNome = "Plano Gratuito";
        }
      }
    } else {
      // Plano pago - buscar último histórico de assinatura
      console.log("💳 [LOGIN] Validando plano pago - buscando histórico...");

      const historicos = await historicoAssinaturaDAO.selectHistoricoByUsuario(
        usuario.id,
      );

      console.log(
        "💳 [LOGIN] Históricos encontrados:",
        historicos?.length || 0,
      );

      if (historicos && historicos.length > 0) {
        const ultimoHistorico = historicos[0]; // Já vem ordenado por data DESC

        console.log("💳 [LOGIN] Último histórico:", {
          id: ultimoHistorico.id,
          nome_assinatura: ultimoHistorico.nome_assinatura,
          is_cancelado: ultimoHistorico.is_cancelado,
          prazo: ultimoHistorico.prazo,
          plano_id: ultimoHistorico.plano_id,
        });

        // Verificar se não foi cancelado e se não expirou
        console.log("💳 [LOGIN] Cancelado?", ultimoHistorico.is_cancelado);

        if (!ultimoHistorico.is_cancelado) {
          const prazo = new Date(ultimoHistorico.prazo);
          const prazoDia = new Date(
            Date.UTC(
              prazo.getUTCFullYear(),
              prazo.getUTCMonth(),
              prazo.getUTCDate(),
            ),
          );
          console.log("💳 [LOGIN] Prazo:", prazoDia);
          console.log("💳 [LOGIN] Prazo >= hoje?", prazoDia >= hojeInicio);

          if (prazoDia >= hojeInicio) {
            assinaturaAtiva = true;
            assinaturaTipo = "paga";
            assinaturaValidade = ultimoHistorico.prazo;
            planoNome = ultimoHistorico.nome_assinatura;
          } else {
            console.log("⚠️ [LOGIN] Assinatura expirada!");
          }
        } else {
          console.log("⚠️ [LOGIN] Assinatura cancelada!");
        }
      } else {
        console.log("⚠️ [LOGIN] Nenhum histórico encontrado!");
      }
    }

    console.log("✅ [LOGIN] Resultado validação:", {
      ativa: assinaturaAtiva,
      tipo: assinaturaTipo,
      validade: assinaturaValidade,
      plano: planoNome,
    });

    // 4. Gerar JWT Token
    const tokenPayload = {
      id: usuario.id,
      telefone: usuario.telefone,
      nome: usuario.nome,
      email: usuario.email,
    };

    // JWT Secret fixo
    const jwtSecret = process.env.JWT_SECRET || "your_secret_key_here";
    const jwtExpires = process.env.JWT_EXPIRES_IN || "1h";

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: jwtExpires,
    });

    // NOTA: O código NÃO é deletado após login
    // Pode ser reutilizado até expirar (5 minutos)
    // Apenas será atualizado quando um novo código for solicitado

    // 5. Retornar resposta
    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      message: "Login realizado com sucesso",
      token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        telefone: usuario.telefone,
        email: usuario.email,
        mensagens: usuario.mensagens,
        plano_id: usuario.plano_id,
        status_plano: usuario.status_plano,
      },
      assinatura: {
        ativa: assinaturaAtiva,
        tipo: assinaturaTipo,
        validade: assinaturaValidade,
        plano: planoNome,
      },
    };
  } catch (error) {
    console.error("Erro no controller login:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * CADASTRAR/AUTENTICAR USUÁRIO POR TELEFONE
 * Se existir: gera código e envia mensagem
 * Se não existir: cria usuário com plano 4, histórico de assinatura e envia mensagem
 */
const cadastrarUsuario = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    // Validar campo obrigatório
    if (!dados.telefone) {
      return {
        status: MESSAGE.ERROR_REQUIRED_FIELDS.status,
        status_code: MESSAGE.ERROR_REQUIRED_FIELDS.status_code,
        message: "Telefone é obrigatório",
      };
    }

    console.log("📝 [CADASTRO] Iniciando cadastro/autenticação...");
    console.log("📝 [CADASTRO] Telefone:", dados.telefone);

    // 1. Verificar se o usuário já existe
    const usuarioExistente = await usuarioDAO.selectByTelefoneUsuario(
      dados.telefone,
    );

    let codigo;
    let mensagem;

    if (usuarioExistente) {
      // Usuário já existe - apenas envia mensagem (NÃO atualiza histórico de assinatura)
      console.log("👤 [CADASTRO] Usuário já existe - enviando mensagem...");

      codigo = authDAO.gerarCodigoTemp();
      const codigoArmazenado = await authDAO.armazenarCodigo(
        dados.telefone,
        codigo,
        false,
      );

      if (!codigoArmazenado) {
        console.error("❌ [CADASTRO] Erro ao gerar código temporário");
        return MESSAGE.ERROR_INTERNAL_SERVER_DB;
      }

      console.log("✅ [CADASTRO] Código temporário gerado:", codigo);

      mensagem = `Olá! Para acessar e visualizar melhor seus gastos e entradas, utilize o dashboard:
https://www.meubolsoia.com.br/dashboard/index.html?telefone=${encodeURIComponent(dados.telefone)}&codigo=${codigo}`;

      // Chamar webhook n8n
      try {
        const webhookUrl =
          "https://n8n.srv1056458.hstgr.cloud/webhook/enviarMensagem";

        console.log("📞 [CADASTRO] Chamando webhook n8n...");

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telefone: dados.telefone,
            mensagem: mensagem,
          }),
        });

        if (response.ok) {
          console.log("✅ [CADASTRO] Webhook chamado com sucesso");
        } else {
          console.error(
            "⚠️ [CADASTRO] Webhook retornou erro:",
            response.status,
          );
        }
      } catch (webhookError) {
        console.error("⚠️ [CADASTRO] Erro ao chamar webhook:", webhookError);
      }

      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Código de acesso enviado com sucesso",
      };
    } else {
      // Usuário não existe - criar novo usuário
      console.log("✨ [CADASTRO] Novo usuário - criando cadastro...");

      // 2. Calcular prazo de 5 dias
      const agora = getDataBrasilia();
      const prazo = new Date(agora.getTime() + 5 * 24 * 60 * 60 * 1000);
      const prazoFormatado = prazo.toISOString().split("T")[0]; // YYYY-MM-DD

      console.log("📝 [CADASTRO] Prazo calculado:", prazoFormatado);

      // 3. Criar usuário no banco com plano 4
      const novoUsuario = await supabase
        .from("usuarios")
        .insert([
          {
            nome: dados.telefone, // Nome padrão = telefone
            telefone: dados.telefone,
            email: null,
            mensagens: 0,
            plano_id: 4,
            status_plano: "Plano visionario - Trial",
          },
        ])
        .select();

      if (novoUsuario.error) {
        console.error(
          "❌ [CADASTRO] Erro ao criar usuário:",
          novoUsuario.error,
        );
        return MESSAGE.ERROR_INTERNAL_SERVER_DB;
      }

      const usuario = novoUsuario.data[0];
      console.log("✅ [CADASTRO] Usuário criado:", usuario);

      // 4. Criar registro no histórico de assinatura
      const historicoData = {
        usuarioCodigo: usuario.id,
        checkout_id: `trial_5_dias`,
        nome_assinatura: "Plano visionario - Trial 5 dias",
        dataAssinatura: agora.toISOString(),
        prazo: prazoFormatado,
        plano_id_cakto: "trial_5_dias",
        plano_id: 4,
        is_cancelado: false,
      };

      const historico =
        await historicoAssinaturaDAO.insertHistoricoAssinatura(historicoData);

      if (!historico) {
        console.error("❌ [CADASTRO] Erro ao criar histórico de assinatura");
        // Não vamos falhar o cadastro por isso, mas vamos logar
      } else {
        console.log("✅ [CADASTRO] Histórico de assinatura criado:", historico);
      }

      // 5. Gerar código temporário
      codigo = authDAO.gerarCodigoTemp();
      const codigoArmazenado = await authDAO.armazenarCodigo(
        dados.telefone,
        codigo,
        false,
      );

      if (!codigoArmazenado) {
        console.error("❌ [CADASTRO] Erro ao gerar código temporário");
      } else {
        console.log("✅ [CADASTRO] Código temporário gerado:", codigo);
      }

      mensagem = `Parabéns! Você ganhou 5 dias grátis do Plano Visionário.
Acesse seu dashboard:
https://www.meubolsoia.com.br/dashboard/index.html?telefone=${encodeURIComponent(dados.telefone)}&codigo=${codigo}`;

      // Usar função mapearPlanoId para criar estrutura do carrossel
      const mensagemCarrossel = mapearPlanoId("Visionário", dados.telefone);

      // Personalizar mensagem para trial de 5 dias
      mensagemCarrossel.message =
        "🎉 Parabéns! Você ganhou 5 dias grátis do Plano Visionário! Aproveite todos os recursos premium sem custo.";

      // 6. Chamar webhook n8n
      try {
        const webhookUrl =
          "https://n8n.srv1056458.hstgr.cloud/webhook/enviarCarrosel";

        console.log("📞 [CADASTRO] Chamando webhook n8n...");

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mensagemCarrossel),
        });

        if (response.ok) {
          console.log("✅ [CADASTRO] Webhook chamado com sucesso");
        } else {
          console.error(
            "⚠️ [CADASTRO] Webhook retornou erro:",
            response.status,
          );
        }
      } catch (webhookError) {
        console.error("⚠️ [CADASTRO] Erro ao chamar webhook:", webhookError);
        // Não vamos falhar o cadastro por erro no webhook
      }

      return {
        status: MESSAGE.SUCCESS_CREATED_ITEM.status,
        status_code: MESSAGE.SUCCESS_CREATED_ITEM.status_code,
        message:
          "Usuário cadastrado com sucesso! Você ganhou 5 dias grátis do Plano Visionário.",
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          telefone: usuario.telefone,
          plano: "Plano visionario - Trial 5 dias",
          prazo: prazoFormatado,
        },
      };
    }
  } catch (error) {
    console.error("❌ [CADASTRO] Erro no controller cadastrarUsuario:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

// Importar supabase para uso direto
const supabase = require("../config/supabase.js");

module.exports = {
  enviarCodigo,
  validarCodigo,
  validarAssinatura,
  login,
  cadastrarUsuario,
};
