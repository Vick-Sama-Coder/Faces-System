// Estado partilhado do pedido de instalacao da PWA.
// O evento beforeinstallprompt pode acontecer uma unica vez; por isso os
// listeners sao registados a nivel do modulo e nao por cada botao.

const ESTADO_INICIAL = {
    instalada: false,
    promptDisponivel: false,
    plataforma: "desktop",
    navegador: "outro",
    mostrarInstalacao: false
};

let estado = ESTADO_INICIAL;
let deferredPrompt = null;
let iniciado = false;
const ouvintes = new Set();

function eStandalone() {
    if (typeof window === "undefined") return false;

    return window.matchMedia?.("(display-mode: standalone)").matches
        || window.navigator?.standalone === true;
}

function detectarPlataforma() {
    if (typeof navigator === "undefined") return "desktop";

    const ua = navigator.userAgent || "";
    const ipad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

    if (/Android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/i.test(ua) || ipad) return "ios";
    return "desktop";
}

function detectarNavegador() {
    if (typeof navigator === "undefined") return "outro";

    const ua = navigator.userAgent || "";
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    if (/EdgA?\/|Edg\//i.test(ua)) return "edge";
    if (/CriOS|Chrome|Chromium/i.test(ua)) return "chrome";
    if (/Firefox|FxiOS/i.test(ua)) return "firefox";
    if (/Safari/i.test(ua)) return "safari";
    return "outro";
}

function atualizar(mudancas) {
    estado = { ...estado, ...mudancas };
    for (const ouvinte of ouvintes) ouvinte();
}

function garantirInicio() {
    if (iniciado || typeof window === "undefined") return;
    iniciado = true;

    const plataforma = detectarPlataforma();
    const navegador = detectarNavegador();
    const instalada = eStandalone();

    atualizar({
        instalada,
        plataforma,
        navegador,
        // Em Android e iOS mostramos sempre instrucoes, mesmo quando o
        // browser nao disponibiliza o prompt nativo.
        mostrarInstalacao: !instalada && (plataforma === "android" || plataforma === "ios")
    });

    window.addEventListener("beforeinstallprompt", (evento) => {
        evento.preventDefault();
        deferredPrompt = evento;

        atualizar({
            promptDisponivel: true,
            mostrarInstalacao: true
        });
    });

    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        atualizar({
            instalada: true,
            promptDisponivel: false,
            mostrarInstalacao: false
        });
    });

    const media = window.matchMedia?.("(display-mode: standalone)");
    if (media?.addEventListener) {
        media.addEventListener("change", () => {
            const agoraInstalada = eStandalone();
            atualizar({
                instalada: agoraInstalada,
                mostrarInstalacao: !agoraInstalada
                    && (estado.plataforma === "android" || estado.plataforma === "ios")
            });
        });
    }
}

// O evento pode acontecer antes de o primeiro botao ser montado. Registar os
// listeners no arranque do modulo garante que o prompt nativo nao se perde.
if (typeof window !== "undefined") garantirInicio();

export function subscribeInstallPrompt(ouvinte) {
    garantirInicio();
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
}

export function getInstallSnapshot() {
    garantirInicio();
    return estado;
}

export function getInstallServerSnapshot() {
    return ESTADO_INICIAL;
}

export async function pedirInstalacao() {
    garantirInicio();

    if (!deferredPrompt) {
        return { outcome: "unavailable" };
    }

    // O evento so pode ser usado uma vez. E importante consumi-lo antes de
    // abrir o prompt para evitar dois pedidos simultaneos.
    const prompt = deferredPrompt;
    deferredPrompt = null;
    atualizar({ promptDisponivel: false });

    try {
        prompt.prompt();
        const escolha = await prompt.userChoice;
        return { outcome: escolha?.outcome || "dismissed" };
    } catch {
        return { outcome: "error" };
    }
}
