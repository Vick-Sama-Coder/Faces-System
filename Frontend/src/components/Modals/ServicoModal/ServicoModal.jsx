import { useEffect, useState } from "react";
import { X, Scissors, Save, Edit2, Tag, Heart, Layers, UserCheck, UserX, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { createServico, updateServico, getCategorias, getApiError, getApiErrorField, getServicoModalidades, createServicoModalidade, updateServicoModalidade, deleteServicoModalidade, getServicoAplicacoes, associarAplicacao, desassociarAplicacao, getServicos } from "../../../services/api.js";
import './ServicoModal.css'

function ServicoModal({ onclose, servico = null, onSuccess }) {
    const isEdit = !!servico;

    const [formData, setFormData] = useState({
        nome: servico ? servico.nome : "",
        descricao: servico ? servico.descricao : "",
        valor: servico ? servico.valor : "",
        duracao_min: servico ? servico.duracao_min : "",
        tipo_preco: servico ? servico.tipo_preco : "fixo",
        tipo_servico: servico ? servico.tipo_servico : "Servico",
        permite_aplicacoes: servico ? servico.permite_aplicacoes : false,
        elegivel_fidelizacao: servico ? servico.elegivel_fidelizacao : false,
        categoria_id: servico ? String(servico.categoria_id) : ""
    });

    const [categorias, setCategorias] = useState([]);
    const [aplicacoesDisponiveis, setAplicacoesDisponiveis] = useState([]);
    const [aplicacoesAssociadas, setAplicacoesAssociadas] = useState([]);
    const [modalidades, setModalidades] = useState([]);
    const [showModalidades, setShowModalidades] = useState(false);
    const [showAplicacoes, setShowAplicacoes] = useState(false);
    const [novaModalidade, setNovaModalidade] = useState({ nome: "", faixa_etaria: "Geral", valor: "", ordem: 0 });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingModalidades, setLoadingModalidades] = useState(false);
    const [loadingAplicacoes, setLoadingAplicacoes] = useState(false);

    useEffect(() => {
        let activo = true;

        async function carregarCategorias() {
            try {
                const res = await getCategorias();
                if (activo) setCategorias(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                if (activo) setError(getApiError(err));
            }
        }

        carregarCategorias();
        return () => { activo = false };
    }, []);

    // Carregar modalidades quando edita
    useEffect(() => {
        if (!isEdit || !servico) return;
        carregarModalidades();
    }, [isEdit, servico?.id]);

    // Carregar aplicacoes associadas quando edita
    useEffect(() => {
        if (!isEdit || !servico) return;
        carregarAplicacoes();
    }, [isEdit, servico?.id]);

    // Carregar aplicacoes disponiveis para associar
    useEffect(() => {
        let activo = true;
        async function carregarAplicacoesDisponiveis() {
            try {
                const res = await getServicos({ estado: "todos" });
                const lista = Array.isArray(res.data) ? res.data : [];
                if (activo) {
                    setAplicacoesDisponiveis(lista.filter(s => s.tipo_servico === 'Aplicacao' && s.estado === 'Ativo'));
                }
            } catch (err) {
                if (activo) setError(getApiError(err));
            }
        }
        carregarAplicacoesDisponiveis();
        return () => { activo = false };
    }, []);

    const carregarModalidades = async () => {
        if (!servico) return;
        setLoadingModalidades(true);
        try {
            const res = await getServicoModalidades(servico.id);
            const lista = Array.isArray(res.data) ? res.data : [];
            setModalidades(lista);
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingModalidades(false);
        }
    };

    const carregarAplicacoes = async () => {
        if (!servico) return;
        setLoadingAplicacoes(true);
        try {
            const res = await getServicoAplicacoes(servico.id);
            const lista = Array.isArray(res.data) ? res.data : [];
            setAplicacoesAssociadas(lista);
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingAplicacoes(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
        if (error) setError(null);
    };

    const validate = () => {
        const erros = {};
        if (!formData.nome.trim()) erros.nome = "O nome do servico e obrigatorio";
        if (formData.valor === "" || formData.valor === null) {
            erros.valor = "O valor e obrigatorio";
        } else if (Number(formData.valor) < 0) {
            erros.valor = "O valor nao pode ser negativo";
        }
        if (!formData.categoria_id) erros.categoria_id = "A categoria e obrigatoria";
        setErrors(erros);
        return Object.keys(erros).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate() || loading) return;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                nome: formData.nome.trim(),
                descricao: formData.descricao.trim() || null,
                valor: Number.parseInt(formData.valor, 10),
                duracao_min: formData.duracao_min ? Number.parseInt(formData.duracao_min, 10) : null,
                tipo_preco: formData.tipo_preco,
                tipo_servico: formData.tipo_servico,
                permite_aplicacoes: formData.permite_aplicacoes,
                elegivel_fidelizacao: formData.elegivel_fidelizacao,
                categoria_id: Number.parseInt(formData.categoria_id, 10)
            };

            if (isEdit) {
                await updateServico(servico.id, payload);
            } else {
                await createServico(payload);
            }
            setLoading(false);
            if (onSuccess) onSuccess();
            onclose();
        } catch (err) {
            setLoading(false);
            const field = getApiErrorField(err);
            const msg = getApiError(err);
            if (field) {
                setErrors({ ...errors, [field]: msg });
            } else {
                setError(msg);
            }
        }
    };

    // Modalidades
    const handleNovaModalidadeChange = (field, value) => {
        setNovaModalidade({ ...novaModalidade, [field]: value });
    };

    const handleAddModalidade = async (e) => {
        e.preventDefault();
        if (!servico) return;
        if (!novaModalidade.nome.trim() || novaModalidade.valor === "") return;

        setLoadingModalidades(true);
        try {
            await createServicoModalidade(servico.id, {
                nome: novaModalidade.nome.trim(),
                faixa_etaria: novaModalidade.faixa_etaria,
                valor: Number.parseInt(novaModalidade.valor, 10),
                ordem: novaModalidade.ordem
            });
            setNovaModalidade({ nome: "", faixa_etaria: "Geral", valor: "", ordem: 0 });
            await carregarModalidades();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingModalidades(false);
        }
    };

    const handleUpdateModalidade = async (modalidade) => {
        if (!servico) return;
        setLoadingModalidades(true);
        try {
            await updateServicoModalidade(modalidade.id, {
                nome: modalidade.nome,
                faixa_etaria: modalidade.faixa_etaria,
                valor: modalidade.valor,
                ordem: modalidade.ordem,
                estado: modalidade.estado
            });
            await carregarModalidades();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingModalidades(false);
        }
    };

    const handleDeleteModalidade = async (id) => {
        if (!servico) return;
        setLoadingModalidades(true);
        try {
            await deleteServicoModalidade(id);
            await carregarModalidades();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingModalidades(false);
        }
    };

    // Aplicacoes
    const handleAssociarAplicacao = async (aplicacaoId) => {
        if (!servico) return;
        setLoadingAplicacoes(true);
        try {
            await associarAplicacao(servico.id, aplicacaoId);
            await carregarAplicacoes();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingAplicacoes(false);
        }
    };

    const handleDesassociarAplicacao = async (aplicacaoId) => {
        if (!servico) return;
        setLoadingAplicacoes(true);
        try {
            await desassociarAplicacao(servico.id, aplicacaoId);
            await carregarAplicacoes();
        } catch (err) {
            setError(getApiError(err));
        } finally {
            setLoadingAplicacoes(false);
        }
    };

    const aplicacoesNaoAssociadas = aplicacoesDisponiveis.filter(
        a => !aplicacoesAssociadas.some(aa => aa.id === a.id)
    );

    return (
        <div className="modal-backdrop" onClick={onclose}>
            <section
                className="servico-modal open"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="header-modal">
                    <p className="Modal-Icon">
                        <Scissors />
                    </p>
                    <div className="header-text-modal">
                        <p className="headerer">
                            <strong>{isEdit ? "Editar Servico" : "Novo Servico"}</strong>
                            <span>{isEdit ? "Actualize os dados do servico" : "Registe um novo servico no sistema"}</span>
                        </p>
                    </div>
                    <p className="plusIcon"><X onClick={onclose} /></p>
                </header>

                {error && (
                    <div className="error-banner">
                        <span>{error}</span>
                    </div>
                )}

                <section className="main-content">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <p>
                                <Scissors />
                                <span>Nome do Servico</span>
                            </p>
                            <input
                                type="text"
                                name="nome"
                                id="nome"
                                placeholder="Ex.: Corte de Cabelo, Manicure, Penteado"
                                value={formData.nome}
                                onChange={(e) => handleChange("nome", e.target.value)}
                                className={errors.nome ? "input-invalido" : ""}
                                aria-invalid={errors.nome ? "true" : undefined}
                                aria-describedby={errors.nome ? "nome-erro" : undefined}
                                required
                            />
                            {errors.nome && (
                                <span className="field-error" id="nome-erro" role="alert">
                                    {errors.nome}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <p>
                                <Tag />
                                <span>Descrição</span>
                            </p>
                            <textarea
                                name="descricao"
                                id="descricao"
                                placeholder="Descrição do servico (opcional)"
                                value={formData.descricao}
                                onChange={(e) => handleChange("descricao", e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <p>
                                    <span className="currency">MT</span>
                                    <span>Valor Base</span>
                                </p>
                                <input
                                    type="number"
                                    name="valor"
                                    id="valor"
                                    placeholder="Ex.: 250"
                                    value={formData.valor}
                                    onChange={(e) => handleChange("valor", e.target.value)}
                                    className={errors.valor ? "input-invalido" : ""}
                                    aria-invalid={errors.valor ? "true" : undefined}
                                    required
                                    min="0"
                                    step="1"
                                />
                                {errors.valor && (
                                    <span className="field-error" id="valor-erro" role="alert">
                                        {errors.valor}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <p>
                                    <Clock size={16} />
                                    <span>Duração (min)</span>
                                </p>
                                <input
                                    type="number"
                                    name="duracao_min"
                                    id="duracao_min"
                                    placeholder="Ex.: 30"
                                    value={formData.duracao_min}
                                    onChange={(e) => handleChange("duracao_min", e.target.value)}
                                    min="0"
                                    step="1"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <p>
                                    <Tag />
                                    <span>Categoria</span>
                                </p>
                                <select
                                    name="categoria_id"
                                    id="categoria_id"
                                    value={formData.categoria_id}
                                    onChange={(e) => handleChange("categoria_id", e.target.value)}
                                    className={errors.categoria_id ? "input-invalido" : ""}
                                    aria-invalid={errors.categoria_id ? "true" : undefined}
                                    required
                                >
                                    <option value="">Selecione a categoria...</option>
                                    {categorias.map((categoria) => (
                                        <option key={categoria.id} value={categoria.id}>
                                            {categoria.nome}
                                        </option>
                                    ))}
                                </select>
                                {errors.categoria_id && (
                                    <span className="field-error" id="categoria_id-erro" role="alert">
                                        {errors.categoria_id}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <p>
                                    <Layers />
                                    <span>Tipo de Serviço</span>
                                </p>
                                <select
                                    name="tipo_servico"
                                    id="tipo_servico"
                                    value={formData.tipo_servico}
                                    onChange={(e) => handleChange("tipo_servico", e.target.value)}
                                >
                                    <option value="Servico">Serviço Principal</option>
                                    <option value="Aplicacao">Aplicação</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="permite_aplicacoes"
                                        checked={formData.permite_aplicacoes}
                                        onChange={(e) => handleChange("permite_aplicacoes", e.target.checked)}
                                    />
                                    <span>Permite aplicações adicionais</span>
                                </label>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="elegivel_fidelizacao"
                                        checked={formData.elegivel_fidelizacao}
                                        onChange={(e) => handleChange("elegivel_fidelizacao", e.target.checked)}
                                    />
                                    <span>Elegível para fidelização</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <p>
                                    <Tag />
                                    <span>Tipo de Preço</span>
                                </p>
                                <select
                                    name="tipo_preco"
                                    id="tipo_preco"
                                    value={formData.tipo_preco}
                                    onChange={(e) => handleChange("tipo_preco", e.target.value)}
                                >
                                    <option value="fixo">Fixo</option>
                                    <option value="variavel">Variável</option>
                                </select>
                            </div>
                        </div>

                        {/* Modalidades */}
                        {isEdit && formData.tipo_servico === 'Servico' && (
                            <div className="servico-section">
                                <div className="section-header" onClick={() => setShowModalidades(!showModalidades)}>
                                    <h3>
                                        <Layers size={18} />
                                        <span>Modalidades de Preço</span>
                                        <small>({modalidades.length})</small>
                                    </h3>
                                    <span>{showModalidades ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                                </div>

                                {showModalidades && (
                                    <div className="section-content">
                                        <div className="modalidade-form">
                                            <div className="modalidade-fields">
                                                <div className="modalidade-field">
                                                    <label>Nome</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ex.: Adulto, Criança, Completo"
                                                        value={novaModalidade.nome}
                                                        onChange={(e) => handleNovaModalidadeChange("nome", e.target.value)}
                                                    />
                                                </div>
                                                <div className="modalidade-field">
                                                    <label>Faixa Etária</label>
                                                    <select
                                                        value={novaModalidade.faixa_etaria}
                                                        onChange={(e) => handleNovaModalidadeChange("faixa_etaria", e.target.value)}
                                                    >
                                                        <option value="Geral">Geral (qualquer idade)</option>
                                                        <option value="Adulto">Adulto (≥ 18 anos)</option>
                                                        <option value="Crianca">Criança (< 18 anos)</option>
                                                    </select>
                                                </div>
                                                <div className="modalidade-field">
                                                    <label>Valor (MT)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Ex.: 200"
                                                        value={novaModalidade.valor}
                                                        onChange={(e) => handleNovaModalidadeChange("valor", e.target.value)}
                                                        min="0"
                                                        step="1"
                                                    />
                                                </div>
                                                <div className="modalidade-field">
                                                    <label>Ordem</label>
                                                    <input
                                                        type="number"
                                                        value={novaModalidade.ordem}
                                                        onChange={(e) => handleNovaModalidadeChange("ordem", Number(e.target.value))}
                                                        min="0"
                                                        step="1"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={handleAddModalidade}
                                                disabled={loadingModalidades || !novaModalidade.nome.trim() || novaModalidade.valor === ""}
                                            >
                                                <Plus size={16} /> Adicionar Modalidade
                                            </button>
                                        </div>

                                        {loadingModalidades ? (
                                            <p className="loading-text">A carregar modalidades...</p>
                                        ) : modalidades.length === 0 ? (
                                            <p className="empty-text">Nenhuma modalidade definida. O preço base será usado.</p>
                                        ) : (
                                            <ul className="modalidades-list">
                                                {modalidades.map((m) => (
                                                    <li key={m.id} className="modalidade-item">
                                                        <div className="modalidade-info">
                                                            <strong>{m.nome}</strong>
                                                            <span className="badge">{m.faixa_etaria}</span>
                                                            <span className="preco">{Number(m.valor).toLocaleString("pt-MZ")} MT</span>
                                                            <span className="ordem">ordem: {m.ordem}</span>
                                                            <span className={`estado-badge ${m.estado === 'Ativo' ? 'ativo' : 'inativo'}`}>{m.estado}</span>
                                                        </div>
                                                        <div className="modalidade-actions">
                                                            <button
                                                                type="button"
                                                                className="btn-icon"
                                                                onClick={() => handleUpdateModalidade({ ...m, estado: m.estado === 'Ativo' ? 'Inativo' : 'Ativo' })}
                                                                title={m.estado === 'Ativo' ? 'Desactivar' : 'Activar'}
                                                            >
                                                                {m.estado === 'Ativo' ? <UserX size={16} /> : <UserCheck size={16} />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-icon danger"
                                                                onClick={() => handleDeleteModalidade(m.id)}
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Aplicacoes associadas */}
                        {isEdit && formData.tipo_servico === 'Servico' && formData.permite_aplicacoes && (
                            <div className="servico-section">
                                <div className="section-header" onClick={() => setShowAplicacoes(!showAplicacoes)}>
                                    <h3>
                                        <UserCheck size={18} />
                                        <span>Aplicações Associadas</span>
                                        <small>({aplicacoesAssociadas.length})</small>
                                    </h3>
                                    <span>{showAplicacoes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                                </div>

                                {showAplicacoes && (
                                    <div className="section-content">
                                        <div className="aplicacoes-disponiveis">
                                            <h4>Aplicações Disponíveis</h4>
                                            {aplicacoesNaoAssociadas.length === 0 ? (
                                                <p className="empty-text">Todas as aplicações já estão associadas ou não existem aplicações ativas.</p>
                                            ) : (
                                                <ul className="aplicacoes-list">
                                                    {aplicacoesNaoAssociadas.map((a) => (
                                                        <li key={a.id} className="aplicacao-item">
                                                            <span>
                                                                <strong>{a.nome}</strong>
                                                                <small>{a.categoria_nome}</small>
                                                                <span className="preco">{Number(a.valor).toLocaleString("pt-MZ")} MT</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="btn-icon"
                                                                onClick={() => handleAssociarAplicacao(a.id)}
                                                                disabled={loadingAplicacoes}
                                                                title="Associar"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        <div className="aplicacoes-associadas">
                                            <h4>Associadas a este Serviço</h4>
                                            {aplicacoesAssociadas.length === 0 ? (
                                                <p className="empty-text">Nenhuma aplicação associada.</p>
                                            ) : (
                                                <ul className="aplicacoes-list">
                                                    {aplicacoesAssociadas.map((a) => (
                                                        <li key={a.id} className="aplicacao-item">
                                                            <span>
                                                                <strong>{a.nome}</strong>
                                                                <small>{a.categoria_nome}</small>
                                                                <span className="preco">{Number(a.valor).toLocaleString("pt-MZ")} MT</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="btn-icon danger"
                                                                onClick={() => handleDesassociarAplicacao(a.id)}
                                                                disabled={loadingAplicacoes}
                                                                title="Remover associação"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="servico-modal-note">
                            <Heart size={18} />
                            <span>
                                A fidelização é configurada no campo <strong>Elegível para fidelização</strong>.
                                Serviços do tipo <strong>Aplicação</strong> aparecem apenas para associação.
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            <span className="btn-icon">
                                {isEdit ? <Edit2 /> : <Save />}
                            </span>
                            {loading ? "A guardar..." : isEdit ? "Actualizar Servico" : "Registar Servico"}
                        </button>
                    </form>
                </section>
            </section>
        </div>
    );
}

export default ServicoModal;