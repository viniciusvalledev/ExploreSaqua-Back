import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

export enum StatusLocal {
  PENDENTE_APROVACAO = "pendente_aprovacao",
  ATIVO = "ativo",
  PENDENTE_ATUALIZACAO = "pendente_atualizacao",
  PENDENTE_EXCLUSAO = "pendente_exclusao",
  REJEITADO = "rejeitado",
}

class Local extends Model {
  public localId!: number;
  public categoria!: string;
  public contatoLocal!: string;
  public nomeLocal!: string;
  public endereco!: string;
  public descricao!: string;
  public instagram!: string; //?
  public ativo!: boolean;
  public status!: StatusLocal;
  public logoUrl!: string;
  public dados_atualizacao!: object | null;
  public nomeResponsavel!: string;
  public cpfResponsavel!: string;
  public latitude!: number;
  public longitude!: number;
}

Local.init(
  {
    localId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "local_id",
    },
        logoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nomeResponsavel: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "nome_responsavel",
    },
    cpfResponsavel: {
      type: DataTypes.STRING(14),
      allowNull: false,
      field: "cpf_responsavel",
    },
    contatoLocal: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contato_local",
    },
    nomeLocal: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "nome_local",
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instagram: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(StatusLocal)),
      allowNull: false,
      defaultValue: StatusLocal.PENDENTE_APROVACAO,
      field: "status",
    },
    dados_atualizacao: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "dados_atualizacao",
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: "latitude",
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: "longitude",
    },
  },
  {
    sequelize,
    tableName: "locais",
    timestamps: true,
  },
);

export default Local;
