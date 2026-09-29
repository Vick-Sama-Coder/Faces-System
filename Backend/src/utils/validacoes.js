//validacoes especificas de entrada — devolvem mensagem ou null
//mantidas em conjunto com Frontend/src/utils/validacoes.js

//nome: so letras (com acentos) e espacos, 3 a 100 caracteres (tamanho da coluna)
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

//sanitiza o telefone: remove tudo o que nao for digito
export function limparTelefone(telefone){
    return String(telefone).replace(/\D/g, '').replace(/^258/, '');
}

//telefone: 9 digitos moçambicanos comecando por 8[2-7] (cobre os existentes na BD)
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

//senha: 8 a 72 caracteres (limite do bcrypt), pelo menos 1 letra e 1 numero
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
