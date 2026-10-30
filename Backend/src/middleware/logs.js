import { registrarLogOperacoes } from '../services/logs.js';

// Middleware para registrar operações e desempenho de cada requisição
export const middlewareLogOperacoes = async (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  req.headers['x-request-id'] = requestId;

  // Sobreescrever res.end para registrar o log quando a resposta terminar
  const originalEnd = res.end;
  res.end = async function(chunk, encoding) {
    try {
      const duracao_ms = Date.now() - startTime;
      const statusCode = res.statusCode || 200;
      const sucesso = statusCode >= 200 && statusCode < 400;

      let modulo = 'api';
      const path = req.path || '';

      if (path.startsWith('/api/auth')) modulo = 'auth';
      else if (path.startsWith('/api/cliente')) modulo = 'cliente';
      else if (path.startsWith('/api/servico')) modulo = 'servico';
      else if (path.startsWith('/api/pagamento')) modulo = 'pagamento';
      else if (path.startsWith('/api/assiduidade')) modulo = 'assiduidade';
      else if (path.startsWith('/api/funcionario')) modulo = 'funcionario';
      else if (path.startsWith('/api/caixa')) modulo = 'caixa';
      else if (path.startsWith('/api/despesa')) modulo = 'despesa';
      else if (path.startsWith('/api/relatorio')) modulo = 'relatorio';
      else if (path.startsWith('/api/dashboard')) modulo = 'dashboard';

      await registrarLogOperacoes({
        tipo_operacao: 'requisicao_http',
        modulo,
        descricao: `${req.method} ${path}`,
        duracao_ms,
        status_codigo: statusCode,
        sucesso,
        request_id: requestId,
        usuario_id: req.user ? req.user.id : null
      });
    } catch (error) {
      // Não falhar a requisição se o log falhar
      console.error('Erro ao registrar log de operação:', error.message);
    }
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Middleware para registrar eventos de segurança (login falho/sucesso, acesso negado)
export const middlewareLogSeguranca = async (req, res, next) => {
  // Guardar o envio original
  const originalSend = res.send;

  res.send = function(body) {
    // Verificar status code após o envio
    // Usar setTimeout para garantir que o statusCode foi definido
    setTimeout(() => {
      try {
        const statusCode = res.statusCode || 200;

        // Registrar eventos de segurança para 401 (não autorizado) e 403 (proibido)
        if (statusCode === 401 || statusCode === 403) {
          const ip = req.ip || req.connection?.remoteAddress || null;
          const userAgent = req.get('User-Agent') || null;

          try {
            const isAuthRoute = req.path.includes('/api/auth/login') ||
                             (req.path.includes('/api/auth') && req.method === 'POST');

            const tipoEvento = isAuthRoute
              ? (statusCode === 401 ? 'login_falho' : 'login_sucesso')
              : 'acesso_negado';

            registrarLogSeguranca({
              tipo_evento,
              utilizador_id: req.user ? req.user.id : null,
              utilizador_nome: req.user ? req.user.nome || null : null,
              ip_address: ip,
              user_agent: userAgent,
              motivo: `${req.method} ${req.path} -> ${statusCode}`,
              sucesso: statusCode >= 200 && statusCode < 400
            });
          } catch (error) {
            console.error('Erro ao registrar log de segurança:', error.message);
          }
        }
      } catch (e) {
        // Ignorar erros no timeout
      }
    }, 0);
  };

  next();
};