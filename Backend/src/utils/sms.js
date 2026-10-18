// Envio de SMS. Sem provedor configurado (ambiente de desenvolvimento), o texto
// e escrito no console, permitindo testar o fluxo de recuperacao localmente.
//
// Em producao, define SMS_API_URL e, opcionalmente, SMS_API_KEY e SMS_API_FROM.
// O pedido e um POST JSON generico no formato { to, from, message }.
export async function enviarSms(telefone, mensagem) {
    const { SMS_API_URL, SMS_API_KEY, SMS_API_FROM } = process.env;

    if (!SMS_API_URL) {
        console.log(`[SMS-DEV] para ${telefone}: ${mensagem}`);
        return { enviado: false, modo: "dev" };
    }

    const resposta = await fetch(SMS_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(SMS_API_KEY ? { Authorization: `Bearer ${SMS_API_KEY}` } : {})
        },
        body: JSON.stringify({ to: telefone, from: SMS_API_FROM, message: mensagem })
    });

    if (!resposta.ok) {
        throw new Error(`Falha ao enviar SMS (${resposta.status})`);
    }

    return { enviado: true, modo: "producao" };
}
