import {
    CalendarPlus,
    ChartNoAxesCombined,
    Clock3,
    LayoutDashboard,
    Logs,
    Receipt,
    Scissors,
    ShieldCheck,
    Tag,
    UserCog,
    UserRound,
    Users
} from "lucide-react"

/**
 * Configuracao da navegacao lateral.
 *
 * `permissions` funciona como "pelo menos uma destas permissoes". Quando fica
 * vazio/omitido, o item e visivel para qualquer sessao autenticada.
 *
 * IMPORTANTE: estas permissoes devem acompanhar os guards de
 * `routes/AppRoutes.jsx`; caso contrario o menu mostra itens que a rota
 * rejeita (ou esconde itens que o utilizador poderia abrir).
 */
export const NAV_GROUPS = [
    {
        id: "operacao",
        title: "Operação",
        items: [
            { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
            {
                label: "Novo Atendimento",
                to: "/novoAtendimento",
                icon: CalendarPlus,
                permissions: ["atendimentos:escrever"]
            },
            {
                label: "Clientes",
                to: "/clientes",
                icon: UserRound,
                permissions: ["clientes:ler", "clientes:escrever"]
            },
            {
                label: "Serviços",
                to: "/servicos",
                icon: Scissors,
                permissions: ["servicos:ler", "servicos:escrever"]
            },
            {
                label: "Categorias",
                to: "/categorias",
                icon: Tag,
                permissions: ["servicos:escrever"]
            }
        ]
    },
    {
        id: "financeiro",
        title: "Financeiro",
        items: [
            {
                label: "Relatório",
                to: "/relatorio",
                icon: ChartNoAxesCombined,
                permissions: ["relatorios:ler"]
            },
            {
                label: "Despesas",
                to: "/despesas",
                icon: Receipt,
                permissions: ["despesas:escrever"]
            }
        ]
    },
    {
        id: "administracao",
        title: "Administração",
        items: [
            {
                label: "Funcionários",
                to: "/funcionarios",
                icon: Users,
                permissions: ["funcionarios:ler", "funcionarios:escrever"]
            },
            {
                label: "Horários",
                to: "/horarios",
                icon: Clock3,
                permissions: ["assiduidade:gerir"]
            },
            {
                label: "Gestão de Utilizadores",
                to: "/gestao-utilizadores",
                icon: UserCog,
                permissions: ["contas:gerir"]
            },
            {
                label: "Permissões",
                to: "/permissoes",
                icon: ShieldCheck,
                permissions: ["contas:gerir"]
            },
            {
                label: "Logs",
                to: "/logs",
                icon: Logs,
                permissions: ["auditoria:ler"]
            }
        ]
    }
]

// Um item e visivel se nao exigir perfis/permissoes ou se o utilizador
// cumprir pelo menos um dos requisitos indicados.
export function canAccessItem(user, item) {
    const perfis = item.perfis || []
    const permissoes = item.permissions || []

    if (perfis.length === 0 && permissoes.length === 0) return true
    if (perfis.length > 0 && perfis.includes(user?.perfil)) return true

    return permissoes.some((codigo) => user?.permissoes?.includes(codigo))
}

// Devolve apenas os grupos/itens que o utilizador pode abrir.
export function getVisibleGroups(user) {
    return NAV_GROUPS
        .map((grupo) => ({
            ...grupo,
            items: grupo.items.filter((item) => canAccessItem(user, item))
        }))
        .filter((grupo) => grupo.items.length > 0)
}
