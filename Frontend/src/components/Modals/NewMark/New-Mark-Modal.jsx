import { useState } from "react";
import { CalendarPlus, X, UserRound, ScissorsIcon, Calendar, PlusIcon } from "lucide-react";
import { createAtendimento, getApiError, getApiErrorField } from "../../../services/api.js";
import { validarAtendimento } from "../../../utils/validacoes.js";
import './New-Mark-Modal.css'

function NewMarkModal({ onclose }) {
    const [formData, setFormData] = useState({
        cliente: "",
        servico: "",
        valor: "",
        data: "",
        funcionario: "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(null);
    const [error, setError] = useState(null);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
        if (error) setError(null);
    };

    const validate = () => {
        const erros = validarAtendimento(formData);
        setErrors(erros);
        return Object.keys(erros).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        if (loading) return;

        setLoading(true);
        setError(null);
        setSucesso(null);

        try {
            const payload = {
                cliente: formData.cliente,
                servico: formData.servico,
                valor: Number.parseFloat(formData.valor.replace(",", ".")),
                data: formData.data,
                funcionario: formData.funcionario,
            };
            await createAtendimento(payload);
            setSucesso("Atendimento registado com sucesso");
            setLoading(false);
            setTimeout(() => {
                setSucesso(null);
                onclose();
            }, 1500);
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

    return (
        <div className="modal-backdrop" onClick={onclose}>
            <section
                className="new-mark-modal open"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="header-modal">
                    <p className="Modal-Icon">
                        <CalendarPlus />
                    </p>
                    <div className="header-text-modal">
                        <p className="headerer">
                            <strong>Novo Atendimento</strong>
                            <span>Registre um novo atendimento no sistema</span>
                        </p>
                    </div>
                    <p className="plusIcon"><X onClick={onclose} /></p>
                </header>

                {sucesso && (
                    <div className="success-banner">
                        <span>{sucesso}</span>
                    </div>
                )}

                {error && (
                    <div className="error-banner">
                        <span>{error}</span>
                    </div>
                )}

                <section className="main-content">
                    <article className="left-sect">
                        <p>
                            <UserRound />
                            <span>Cliente</span>
                        </p>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="search"
                                name="cliente"
                                id="cliente"
                                placeholder="Pesquisar cliente"
                                value={formData.cliente}
                                onChange={(e) => handleChange("cliente", e.target.value)}
                                className={errors.cliente ? "input-invalido" : ""}
                                aria-invalid={errors.cliente ? "true" : undefined}
                                aria-describedby={errors.cliente ? "cliente-erro" : undefined}
                            />
                            {errors.cliente && (
                                <span className="field-error" id="cliente-erro" role="alert">
                                    {errors.cliente}
                                </span>
                            )}
                            <p>
                                <PlusIcon />
                                <span>Cadastrar novo cliente</span>
                            </p>
                            <div className="services">
                                <p>
                                    <ScissorsIcon />
                                    <span>Servicos</span>
                                </p>
                                <input
                                    type="search"
                                    name="servico"
                                    id="servico"
                                    placeholder="Pesquisar Servico"
                                    value={formData.servico}
                                    onChange={(e) => handleChange("servico", e.target.value)}
                                    className={errors.servico ? "input-invalido" : ""}
                                    aria-invalid={errors.servico ? "true" : undefined}
                                    aria-describedby={errors.servico ? "servico-erro" : undefined}
                                />
                                {errors.servico && (
                                    <span className="field-error" id="servico-erro" role="alert">
                                        {errors.servico}
                                    </span>
                                )}
                                <article className="selected-services">
                                </article>
                            </div>
                        </form>
                    </article>
                    <article className="mid-sect">
                    </article>
                    <article className="right-sect">
                        <form onSubmit={handleSubmit}>
                            <div className="date">
                                <p>
                                    <Calendar />
                                    <span>Data</span>
                                </p>
                                <input
                                    type="date"
                                    name="data"
                                    id="data"
                                    value={formData.data}
                                    onChange={(e) => handleChange("data", e.target.value)}
                                    className={errors.data ? "input-invalido" : ""}
                                    aria-invalid={errors.data ? "true" : undefined}
                                    aria-describedby={errors.data ? "data-erro" : undefined}
                                />
                                {errors.data && (
                                    <span className="field-error" id="data-erro" role="alert">
                                        {errors.data}
                                    </span>
                                )}
                            </div>
                            <div className="employee">
                                <p>
                                    <UserRound />
                                    <span>Funcionario</span>
                                </p>
                                <input
                                    type="text"
                                    name="funcionario"
                                    id="funcionario"
                                    placeholder="Selecione Funcionario..."
                                    value={formData.funcionario}
                                    onChange={(e) => handleChange("funcionario", e.target.value)}
                                    className={errors.funcionario ? "input-invalido" : ""}
                                    aria-invalid={errors.funcionario ? "true" : undefined}
                                    aria-describedby={errors.funcionario ? "funcionario-erro" : undefined}
                                />
                                {errors.funcionario && (
                                    <span className="field-error" id="funcionario-erro" role="alert">
                                        {errors.funcionario}
                                    </span>
                                )}
                            </div>
                            <div className="valor">
                                <p>
                                    <ScissorsIcon />
                                    <span>Valor (MZN)</span>
                                </p>
                                <input
                                    type="text"
                                    name="valor"
                                    id="valor"
                                    placeholder="Ex.: 250,00"
                                    value={formData.valor}
                                    onChange={(e) => handleChange("valor", e.target.value)}
                                    className={errors.valor ? "input-invalido" : ""}
                                    aria-invalid={errors.valor ? "true" : undefined}
                                    aria-describedby={errors.valor ? "valor-erro" : undefined}
                                />
                                {errors.valor && (
                                    <span className="field-error" id="valor-erro" role="alert">
                                        {errors.valor}
                                    </span>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="submit-btn"
                                onClick={(e) => e.stopPropagation()}
                                disabled={loading}
                            >
                                {loading ? "A registar..." : "Registar Atendimento"}
                            </button>
                        </form>
                    </article>
                </section>
            </section>
        </div>
    );
}

export default NewMarkModal;
