// Copie e cole TUDO isto no seu arquivo: src/entities/index.ts

import Usuario from "./Usuario.entity";
import Local from "./Local.entity";
import Avaliacao from "./Avaliacao.entity";
import ImagemLocal from "./ImagemLocal.entity";
import ContadorVisualizacao from "./ContadorVisualizacao.entity";

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


export {
  Usuario,
  Local,
  Avaliacao,
  ImagemLocal,
  ContadorVisualizacao,
};
