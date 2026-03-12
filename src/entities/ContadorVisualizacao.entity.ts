import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class ContadorVisualizacao extends Model {
  public id!: number;
  public identificador!: string;
  public visualizacoes!: number;
}

ContadorVisualizacao.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    identificador: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique: true, // removido para evitar criação automática de índices UNIQUE que podem exceder o limite do MySQL
    },
    visualizacoes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "contador_visualizacoes",
    timestamps: false,
  }
);

export default ContadorVisualizacao;
