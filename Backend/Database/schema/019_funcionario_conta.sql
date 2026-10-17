-- Ligacao opcional entre um funcionario e uma conta de acesso (usuario).
-- Fica num script separado porque a tabela usuario (014) e criada depois de
-- funcionario (007), pelo que a chave estrangeira so pode ser adicionada aqui.
alter table funcionario
    add constraint funcionario_id_usuario_fk
    foreign key (id_usuario) references usuario(id);
