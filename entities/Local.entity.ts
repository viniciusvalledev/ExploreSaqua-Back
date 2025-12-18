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
  public cnpj!: string;
  public nomeFantasia!: string;
  public emailLocal!: string;
  public endereco!: string;
  public descricao!: string;
  public descricaoDiferencial!: string;
  public tagsInvisiveis!: string;
  public website!: string;
  public instagram!: string;
  public ativo!: boolean;
  public logoUrl!: string;
  public status!: StatusLocal;
  public dados_atualizacao!: object | null;
  public nomeResponsavel!: string;
  public cpfResponsavel!: string;
  public certificadoCnpj!: string;
  public areasAtuacao!: string;
  public venda!: string;
  public escala!: string;
}

Local.init(
  {
    localId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "local_id",
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
    certificadoCnpj: {
      type: DataTypes.STRING(14),
      allowNull: false,
      field: "certificado_cnpj",
    },
    contatoLocal: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contato_local",
    },
    cnpj: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    nomeFantasia: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "nome_fantasia",
    },
    emailLocal: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "email_local",
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    descricaoDiferencial: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "descricao_diferencial",
    },
    tagsInvisiveis: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "tags_invisiveis",
    },
    website: {
      type: DataTypes.STRING,
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
    logoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "logoUrl",
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
    areasAtuacao: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "area_atuacao",
    },
    venda: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "venda",
    },
    escala: {
      type: DataTypes.INTEGER, 
      allowNull: false,        
      defaultValue: 0,         
      field: 'escala',         
    },
  },
  {
    sequelize,
    tableName: "locais",
    timestamps: true,
  }
);

export default Local;
