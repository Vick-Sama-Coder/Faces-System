-- O login passa a ser feito pelo nome de utilizador, pelo que o nome tem de ser
-- unico. A comparacao e case-insensitive (indice sobre lower(nome)), de modo a que
-- "ana silva" e "Ana Silva" nao possam coexistir.
create unique index if not exists usuario_nome_unico_idx
    on usuario (lower(nome));
