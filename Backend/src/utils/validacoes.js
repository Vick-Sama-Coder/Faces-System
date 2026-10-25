//validacoes especificas de entrada — devolvem mensagem ou null
//mantidas em conjunto com Frontend/src/utils/validacoes.js

//regras do cartao de fidelizacao
export const META_FIDELIZACAO = 5;
export const LIMITE_FIDELIZACAO = 200;

//um servico elegivel tem de ser pago e nao pode exceder o limite do beneficio
export function servicoContaParaFidelizacao(servico) {
    const valor = Number(servico?.valor);
    return Boolean(servico?.elegivel_fidelizacao)
        && Number.isFinite(valor)
        && valor > 0
        && valor <= LIMITE_FIDELIZACAO;
}

//valida a configuracao de elegibilidade de um servico
export function validarElegibilidadeFidelizacao(valor, elegivel_fidelizacao) {
    if (!elegivel_fidelizacao) return null;

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        return "O valor do servico deve ser maior que zero";
    }
    if (numero > LIMITE_FIDELIZACAO) {
        return `Servicos elegiveis para fidelizacao nao podem custar mais de ${LIMITE_FIDELIZACAO} MT`;
    }
    return null;
}

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

//sexo: apenas 'M' ou 'F'
export function validarSexo(sexo){
    if(sexo === undefined || sexo === null || sexo === '') return null;
    if(!['M', 'F'].includes(sexo)) return "Sexo invalido: use 'M' ou 'F'";
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

//codigo de recuperacao de senha: exactamente 6 digitos
export function validarCodigo(codigo){
    if(!codigo){
        return "Codigo e obrigatorio";
    }
    if(!/^\d{6}$/.test(String(codigo))){
        return "Codigo invalido: use os 6 digitos recebidos";
    }
    return null;
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
