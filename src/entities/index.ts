// Copie e cole TUDO isto no seu arquivo: src/entities/index.ts

import Usuario from "./Usuario.entity";
import Local from "./Local.entity";
import Avaliacao from "./Avaliacao.entity";
import ImagemLocal from "./ImagemLocal.entity";
import ContadorVisualizacao from "./ContadorVisualizacao.entity";
import UsuarioLocal from "./UsuarioLocal.entity";

// Usuário <-> Avaliação
Usuario.hasMany(Avaliacao, { foreignKey: "usuarioId", as: "avaliacoes" });
Avaliacao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

// Estabelecimento <-> Avaliação
Local.hasMany(Avaliacao, {
  foreignKey: "localId",
  as: "avaliacoes",
});
Avaliacao.belongsTo(Local, {
  foreignKey: "localId",
  as: "local",
});

// Estabelecimento <-> ImagemProduto
Local.hasMany(ImagemLocal, {
  foreignKey: "localId",
  as: "locaisImg",
});
ImagemLocal.belongsTo(Local, { foreignKey: "localId", as: "local" });

// --- ADICIONE ESTE BLOCO DE VOLTA ---
// Avaliação <-> Avaliação (para respostas)
// Um comentário PAI pode ter várias RESPOSTAS
Avaliacao.hasMany(Avaliacao, {
  foreignKey: "parentId", 
  as: "respostas",
  onDelete: "CASCADE",
});

// Uma RESPOSTA pertence a um comentário PAI
Avaliacao.belongsTo(Avaliacao, {
  foreignKey: "parentId",
  as: "pai",
});

// Associação N:M entre Usuário e Local (locais visitados)
Usuario.belongsToMany(Local, {
  through: UsuarioLocal,
  foreignKey: 'usuarioId',
  otherKey: 'localId',
  as: 'locaisVisitados',
});
Local.belongsToMany(Usuario, {
  through: UsuarioLocal,
  foreignKey: 'localId',
  otherKey: 'usuarioId',
  as: 'usuariosQueVisitaram',
});


export {
  Usuario,
  Local,
  Avaliacao,
  ImagemLocal,
  ContadorVisualizacao,
  UsuarioLocal,
};
