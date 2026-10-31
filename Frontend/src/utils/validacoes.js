//validacoes de entrada do frontend — espelho de Backend/src/utils/validacoes.js
//devolvem mensagem ou null

//regras do cartao de fidelizacao
export const META_FIDELIZACAO = 5;
export const LIMITE_FIDELIZACAO = 200;

//um servico so conta se estiver marcado como elegivel e custar ate 200 MT
export function servicoContaParaFidelizacao(servico) {
    const valor = Number(servico?.valor);
    return Boolean(servico?.elegivel_fidelizacao)
        && Number.isFinite(valor)
        && valor > 0
        && valor <= LIMITE_FIDELIZACAO;
}

//nome: so letras (com acentos) e espacos, 3 a 100 caracteres
export function validarNome(nome){
    if(!nome || !String(nome).trim()){
        return "Nome e obrigatorio";
    }
    if(String(nome).length < 3 || String(nome).length > 100){
        return "Nome: use de 3 a 100 caracteres";
    }
    if(!/^[A-Za-zÀ-ÿ\s]+$/.test(String(nome))){
        return "Nome: use apenas letras e espacos";
    }
    return null;
}

//sanitiza o telefone: remove formatacao e prefixo +258
export function limparTelefone(telefone){
    return String(telefone).replace(/\D/g, '').replace(/^258/, '');
}

//telefone: 9 digitos moçambicanos comecando por 8[2-7]
export function validarTelefone(telefone){
    const limpo = limparTelefone(telefone);
    if(!limpo){
        return "Telefone e obrigatorio";
    }
    if(!/^8[2-7]\d{7}$/.test(limpo)){
        return "Telefone invalido (ex.: 84 123 4567)";
    }
    return null;
}

//senha: 8 a 72 caracteres, 1 letra e 1 numero — cada falha com mensagem propria
export function validarSenha(senha){
    if(!senha){
        return "Senha e obrigatoria";
    }
    if(String(senha).length < 8){
        return "A senha deve ter no minimo 8 caracteres";
    }
    if(String(senha).length > 72){
        return "A senha nao pode ter mais de 72 caracteres";
    }
    if(!/[A-Za-z]/.test(String(senha))){
        return "A senha deve conter pelo menos 1 letra";
    }
    if(!/\d/.test(String(senha))){
        return "A senha deve conter pelo menos 1 numero";
    }
    return null;
}

//confirmacao de senha
export function validarConfirmacao(senha, confirmacao){
    if(!confirmacao){
        return "Confirme a sua senha";
    }
    if(senha !== confirmacao){
        return "As senhas nao coincidem";
    }
    return null;
}

//valida os dados iniciais do registo; devolve {campo: mensagem}
//a senha nao e pedida aqui: a conta nasce com a senha padrao 12345
export function validarRegisto({nome, telefone}){
    const erros = {};
    const erroNome = validarNome(nome);
    if(erroNome) erros.nome = erroNome;
    const erroTel = validarTelefone(telefone);
    if(erroTel) erros.telefone = erroTel;
    return erros;
}

//valida campos do login; devolve {campo: mensagem}
export function validarLogin({nome, senha}){
    const erros = {};
    const nomeLimpo = String(nome || "").trim();
    if(!nomeLimpo){
        erros.nome = "Nome de utilizador e obrigatorio";
    } else if(nomeLimpo.length < 3 || nomeLimpo.length > 100){
        erros.nome = "Nome de utilizador: use de 3 a 100 caracteres";
    }
    if(!senha){
        erros.senha = "Senha e obrigatoria";
    }
    return erros;
}


//valida sexo: apenas 'M' ou 'F'
export function validarSexo(sexo) {
    if (sexo === undefined || sexo === null || sexo === '') return null;
    if (!['M', 'F'].includes(sexo)) return "Sexo invalido: use 'M' ou 'F'";
    return null;
}

//valida campos do cliente (nome, apelido, telefone, sexo); devolve {campo: mensagem}
export function validarCliente({nome, apelido, telefone, sexo}) {
    const erros = {};

    const erroNome = validarNome(nome);
    if (erroNome) erros.nome = erroNome;

    const erroApelido = validarNome(apelido);
    if (erroApelido) erros.apelido = erroApelido;

    const erroTel = validarTelefone(telefone);
    if (erroTel) erros.telefone = erroTel;

    const erroSexo = validarSexo(sexo);
    if (erroSexo) erros.sexo = erroSexo;

    return erros;
}

function validarItensAtendimento(itens, erros) {
    itens.forEach((item, index) => {
        const chave = item.uid ?? index;
        const aplicacao = item.tipo_servico === "Aplicacao";
        const precoVazio = item.preco_praticado === "" || item.preco_praticado === null || item.preco_praticado === undefined;
        const preco = Number(item.preco_praticado);

        if (!item.servico_id) {
            erros[`servico_${chave}`] = aplicacao ? "Selecione a aplicacao" : "Selecione o servico";
        }

        if (!aplicacao && !item.funcionario_id) {
            erros[`funcionario_${chave}`] = "Selecione o funcionario";
        }

        if (precoVazio || !Number.isFinite(preco) || preco < 0 || (!aplicacao && preco <= 0)) {
            erros[`preco_${chave}`] = aplicacao
                ? "Indique um valor valido"
                : "Indique um valor maior que zero";
        } else if (item.usar_beneficio_fidelizacao && preco > LIMITE_FIDELIZACAO) {
            erros[`preco_${chave}`] = `O servico gratuito nao pode ultrapassar ${LIMITE_FIDELIZACAO} MT`;
        }
    });

    if (itens.filter((item) => item.usar_beneficio_fidelizacao).length > 1) {
        erros.servicos = "So e possivel marcar um servico gratis por cliente";
    }

    if (itens.filter((item) => item.fidelizacao_selecionada).length > 1) {
        erros.servicos = "So e possivel escolher um servico para fidelizacao por cliente";
    }
}

//valida o registo imediato de atendimento; devolve {campo: mensagem}
//aceita o formato multi-cliente { clientes: [{ uid, cliente_id, itens }] }
//e mantem compatibilidade com o formato anterior { cliente_id, servicos }
export function validarAtendimento({ clientes, cliente_id, servicos }) {
    const erros = {};

    if (Array.isArray(clientes)) {
        if (clientes.length === 0) {
            erros.servicos = "Adicione pelo menos um cliente";
            return erros;
        }

        const ids = new Set();

        clientes.forEach((grupo) => {
            const chave = grupo.uid;

            if (!grupo.cliente_id) {
                erros[`cliente_${chave}`] = "Selecione o cliente";
            } else if (ids.has(String(grupo.cliente_id))) {
                erros[`cliente_${chave}`] = "O mesmo cliente nao pode ser adicionado duas vezes";
            } else {
                ids.add(String(grupo.cliente_id));
            }

            if (!Array.isArray(grupo.itens) || grupo.itens.length === 0) {
                erros[`servicos_${chave}`] = "Adicione pelo menos um servico";
                return;
            }

            validarItensAtendimento(grupo.itens, erros);
        });

        return erros;
    }

    if (!cliente_id) {
        erros.cliente_id = "Selecione o cliente";
    }

    if (!Array.isArray(servicos) || servicos.length === 0) {
        erros.servicos = "Adicione pelo menos um servico";
    } else {
        validarItensAtendimento(servicos, erros);
    }

    return erros;
}

//valida os dados de uma conta de utilizador (criacao/edicao)
export function validarUtilizador({ nome, telefone, id_perfil, senha }, { senhaObrigatoria = false } = {}) {
    const erros = {};

    //gestao de contas: nomes de utilizador podem incluir numeros/simbolos,
    //por isso so se valida o tamanho (a unicidade e verificada pelo servidor)
    const nomeLimpo = String(nome || "").trim();
    if (!nomeLimpo) {
        erros.nome = "Nome e obrigatorio";
    } else if (nomeLimpo.length < 3 || nomeLimpo.length > 100) {
        erros.nome = "Nome: use de 3 a 100 caracteres";
    }

    const erroTel = validarTelefone(telefone);
    if (erroTel) erros.telefone = erroTel;

    if (!id_perfil) erros.id_perfil = "Selecione o perfil";

    if (senha || senhaObrigatoria) {
        const erroSenha = validarSenha(senha);
        if (erroSenha) erros.senha = erroSenha;
    }

    return erros;
}
//dia da semana: 0 = domingo ... 6 = sabado
export function validarDiaSemana(dia){
    if(dia === undefined || dia === null || dia === ""){
        return "O dia da semana e obrigatorio";
    }
    const numero = Number(dia);
    if(!Number.isInteger(numero) || numero < 0 || numero > 6){
        return "O dia da semana deve estar entre 0 (domingo) e 6 (sabado)";
    }
    return null;
}

//converte HH:MM ou HH:MM:SS em minutos desde a meia-noite
export function horaParaMinutos(hora){
    const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(hora ?? "").trim());
    if(!match){
        return null;
    }
    return Number(match[1]) * 60 + Number(match[2]);
}

export function validarHora(hora, campo){
    if(!hora){
        return `O campo ${campo} e obrigatorio`;
    }
    if(horaParaMinutos(hora) === null){
        return `O campo ${campo} deve estar no formato HH:MM`;
    }
    return null;
}

//dois turnos no mesmo dia sobrepoem-se quando os intervalos se cruzam
export function horariosSobrepostos(a, b){
    if(Number(a.dia_semana) !== Number(b.dia_semana)){
        return false;
    }

    const inicioA = horaParaMinutos(a.hora_entrada);
    const fimA = horaParaMinutos(a.hora_saida);
    const inicioB = horaParaMinutos(b.hora_entrada);
    const fimB = horaParaMinutos(b.hora_saida);

    if([inicioA, fimA, inicioB, fimB].some((valor) => valor === null)){
        return false;
    }

    return inicioA < fimB && fimA > inicioB;
}


