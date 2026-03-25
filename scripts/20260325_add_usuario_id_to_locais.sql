-- Relacionamento 1:N
-- Cada local pertence a um usuário (dono), e um usuário pode ter vários locais.

ALTER TABLE locais
  ADD COLUMN usuario_id INT NULL AFTER local_id;

ALTER TABLE locais
  ADD INDEX idx_locais_usuario_id (usuario_id);

ALTER TABLE locais
  ADD CONSTRAINT fk_locais_usuario
  FOREIGN KEY (usuario_id)
  REFERENCES usuarios(usuario_id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
