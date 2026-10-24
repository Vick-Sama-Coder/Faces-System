//validacoes de entrada do frontend — espelho de Backend/src/utils/validacoes.js
//devolvem mensagem ou null

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

//valida todos os campos do registo; devolve {campo: mensagem}
export function validarRegisto({nome, telefone, senha, confirmarSenha}){
    const erros = {};
    const erroNome = validarNome(nome);
    if(erroNome) erros.nome = erroNome;
    const erroTel = validarTelefone(telefone);
    if(erroTel) erros.telefone = erroTel;
    const erroSenha = validarSenha(senha);
    if(erroSenha) erros.senha = erroSenha;
    const erroConf = validarConfirmacao(senha, confirmarSenha);
    if(erroConf) erros.confirmarSenha = erroConf;
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

//valida o registo imediato de atendimento; devolve {campo: mensagem}
export function validarAtendimento({ cliente_id, servicos }) {
    const erros = {};

    if (!cliente_id) {
        erros.cliente_id = "Selecione o cliente";
    }

    if (!Array.isArray(servicos) || servicos.length === 0) {
        erros.servicos = "Adicione pelo menos um servico";
    } else {
        servicos.forEach((item, index) => {
            if (!item.servico_id) {
                erros[`servico_${index}`] = "Selecione o servico";
            }
            if (!item.funcionario_id) {
                erros[`funcionario_${index}`] = "Selecione o funcionario";
            }
            const preco = Number(item.preco_praticado);
            if (!preco || preco <= 0) {
                erros[`preco_${index}`] = "Indique um valor maior que zero";
            }
        });
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
export function validarCodigo(codigo){
    if(!codigo){
        return "Codigo e obrigatorio";
    }
    if(!/^\d{6}$/.test(String(codigo))){
        return "Codigo invalido: use os 6 digitos recebidos";
    }
    return null;

}


