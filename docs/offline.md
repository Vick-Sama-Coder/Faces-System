# Funcionamento offline

[← Voltar ao índice](./README.md)

Este documento descreve o modo offline da PWA: o que fica disponível, como a fila de
escritas é sincronizada e como testar.

## Como funciona

| Camada | Onde está | O que faz |
| --- | --- | --- |
| App shell | Service worker (Workbox) | Precaches de HTML, JS, CSS, fontes e ícones; `navigateFallback` para as rotas da SPA |
| Leituras | IndexedDB `faces-system` → `api_cache` | Guarda cada resposta `GET` bem-sucedida por utilizador (URL + parâmetros) |
| Escritas | IndexedDB `faces-system` → `offline_queue` | Guarda `POST`/`PUT`/`PATCH`/`DELETE` com `Idempotency-Key` |
| Metadados | IndexedDB `faces-system` → `offline_meta` | Dono do cache, versão, mapa de IDs temporários e logout pendente |
| Instalação | Manifest + service worker + `InstallAppButton` | Permite instalar a PWA no Android/desktop; no iOS mostra as instruções do Safari |
| Prefetch | `services/offlinePrefetch.js` | Aquece listas, relatórios e dados de modais depois do login, quando o browser está idle; pode ser executado manualmente |
| Preparação | `components/OfflinePreparation/` | Botão **Preparar offline**, progresso, última preparação e estado “Offline pronto” na sidebar |

O Axios é adaptado em `services/offline.js`. Quando o browser está sem rede:

- um `GET` é servido do cache; se não existir, devolve `ERR_OFFLINE`;
- uma escrita é guardada na fila e devolvida como `202` otimista.

Quando a rede regressa, a fila é enviada por ordem. Cada operação leva o mesmo
`Idempotency-Key` da primeira tentativa, pelo que o backend não cria duplicados.

## Instalar no Android

A build de produção é uma PWA instalável. O botão **Instalar app** aparece na landing
page e na sidebar; quando o browser disponibiliza o pedido nativo, abre diretamente o
diálogo de instalação. Caso contrário, mostra as instruções do browser.

No Chrome Android também é possível instalar manualmente:

1. abrir a aplicação em **HTTPS**;
2. abrir o menu **⋮**;
3. escolher **Instalar aplicação** ou **Adicionar ao ecrã principal**;
4. confirmar.

O `npm run dev` não regista o service worker (`devOptions.enabled: false`). Para testar
a instalação use `npm run build && npm run preview` ou o deploy.

A app instalada arranca em `/dashboard`. Se ainda não houver sessão, é redirecionada para
`/login`; nesse ecrã o aviso offline explica que a primeira autenticação exige ligação à
internet.

## Preparar os dados offline

O prefetch automático continua a arrancar depois do login, mas pode ficar incompleto se a
app for fechada cedo. Na sidebar, o botão **Preparar offline** executa a preparação
completa com progresso e guarda a data da última execução; quando termina, passa a
**Offline pronto**.

A preparação manual:

- exige ligação à internet;
- ignora o intervalo de 10 minutos do prefetch automático;
- inclui os dados essenciais e os detalhes usados pelos modais;
- é cancelada se a sessão mudar ou a rede cair;
- fica registada por utilizador em `localStorage`; o registo é removido no logout e
  expira ao fim de 30 dias, como a cache de dados;
- não substitui a primeira autenticação online nem aumenta a validade da sessão offline
  de 10 dias.

## Quando sincroniza

- ao recuperar a ligação (`online`);
- ao voltar à aba (`visibilitychange`);
- a cada 30 segundos, com a aplicação aberta;
- no botão **Sincronizar agora** do indicador `OfflineStatus`;
- depois de um novo login, se houver fila pendente.

Não existe Background Sync: com a aplicação completamente fechada a fila não é enviada.
Isso depende de suporte do browser e de um service worker próprio (não implementado).

## O que funciona offline

- Consultar todas as páginas e modais já visitados ou pré-carregados.
- Criar/editar clientes, atendimentos, pagamentos, despesas, stock, serviços,
  categorias, funcionários, horários e assiduidade.
- Aplicar descontos, concluir/anular atendimentos e alterar estados.
- Usar o benefício de fidelização **como parte de um atendimento**; o servidor valida-o
  na sincronização.

## O que exige ligação

- Login, registo, primeiro acesso, alteração de senha e logout.
- Alteração do próprio perfil e gestão de utilizadores/permissões.
- **Todas as escritas de salários** (processar, deduções, aprovar, pagar).
- **Alterações manuais do cartão de fidelização** (marcar/remover marcas e utilizar
  benefícios). O cartão continua consultável offline; o ciclo é sempre calculado pelo
  servidor.

## Limitações conhecidas

- **Conflitos** entre dispositivos são last-write-wins: não há versões por registo nem
  resolução assistida. Dois dispositivos a editar o mesmo registo ficam com o último
  pedido que chegar ao servidor.
- **Dados antigos**: o cache de dados expira ao fim de 30 dias; a sessão restaurada
  offline dura 10 dias (igual ao cookie). O cache é limitado a 2000 entradas por
  utilizador (as mais antigas são removidas).
- **Erros definitivos** (`400`, `404`, `409`) ficam marcados como falhados e não bloqueiam
  as restantes operações. Erros transitórios (rede, `429`, `5xx`) param a fila e são
  repetidos.
- **IDs temporários**: entidades criadas offline usam IDs negativos até à sincronização.
  As escritas seguintes são remapeadas automaticamente; a interface só recebe os IDs
  reais na próxima leitura.
- **Fidelização**: um atendimento criado offline com benefício pode falhar na
  sincronização se o benefício já tiver sido usado noutro dispositivo. O servidor é a
  autoridade.
- **Agregados**: dashboard, caixa e relatórios podem ficar desatualizados offline (são
  calculados no servidor). As listas operacionais refletem as alterações otimistas; os
  agregados são corrigidos na sincronização. O prefetch de relatórios cobre o mês corrente.
- **Dados no dispositivo**: o cache fica em IndexedDB sem cifra. Num dispositivo
  partilhado, termine sessão para limpar o cache.
- **Quota**: se o browser despejar o IndexedDB (pressão de espaço), o cache e a fila
  perdem-se. A aplicação pede `navigator.storage.persist()` quando disponível.
- **Erros de renderização**: as rotas estão protegidas por um `ErrorBoundary`; um erro
  numa página mostra uma opção de recuperação em vez de deixar a aplicação em branco.
  “Limpar cache e recarregar” não apaga a fila de escritas pendentes e remove o estado
  “Offline pronto”.

## Checklist de teste manual

> O service worker está desativado em desenvolvimento (`devOptions.enabled: false`).
> Para testar o arranque offline use a build de produção: `npm run build` e
> `npm run preview` (ou o deploy). Sem service worker, um *reload* offline falha porque
> o app shell não está em cache.

1. **Preparar (online):** iniciar sessão, usar **Preparar offline** na sidebar e confirmar
   que passa a **Offline pronto**; abrir também as páginas
   principais (`/dashboard`, `/clientes`, `/novoAtendimento`, `/servicos`, `/despesas`,
   `/horarios`, `/relatorio`).
2. **Cortar a rede:** DevTools → *Network* → *Offline* (ou desligar a rede).
3. **Recarregar a aplicação:** deve abrir com a sessão restaurada e mostrar **Modo
   offline**.
4. **Navegar** pelas páginas visitadas: devem mostrar os dados em cache.
5. **Criar um cliente** offline: deve aparecer na lista com um ID temporário.
6. **Criar um atendimento** com pagamento offline: os totais otimistas devem ser
   coerentes e o atendimento deve aparecer na lista.
7. **Recarregar offline**: a fila e os dados devem manter-se (IndexedDB + service worker).
8. **Voltar a ligar:** o indicador deve sincronizar; o contador de pendentes deve ir a
   zero e os IDs temporários devem ser substituídos.
9. **Confirmar no servidor** que não há duplicados: repetir o passo 5 duas vezes com a
   mesma `Idempotency-Key` (retry) deve devolver a mesma resposta.
10. **Erro definitivo:** com um atendimento eliminado no servidor, tentar pagá-lo offline
    e sincronizar. O item deve ficar “com erro” sem bloquear as restantes operações.
11. **Avisos simultâneos:** com uma atualização da PWA pendente e a aplicação offline,
    confirmar que os dois avisos ficam visíveis e não se sobrepõem em desktop e mobile.

### Instalação Android

1. publicar a build em HTTPS (ou usar um túnel para `npm run preview`);
2. abrir no Chrome Android e usar **Instalar app** na landing/sidebar;
3. aceitar o pedido nativo ou seguir as instruções do menu do browser;
4. confirmar que a app abre em modo standalone, com ícone no ecrã inicial;
5. com sessão iniciada e **Offline pronto**, ativar o modo de avião e reabrir a app.

## Diagnóstico

- `navigator.onLine` é usado apenas como sinal rápido; falhas reais de rede também são
  detetadas pelo adapter.
- No DevTools → *Application*:
  - *Service Workers*: versão ativa do `sw.js`;
  - *IndexedDB* → `faces-system`: `api_cache`, `offline_queue`, `offline_meta`;
  - *Cache Storage*: precache do Workbox.
- `OfflineStatus` mostra ligação, pendentes, falhados, última sincronização e o último
  erro. **Ver detalhes** lista o erro e permite tentar novamente ou descartar as
  operações falhadas.
