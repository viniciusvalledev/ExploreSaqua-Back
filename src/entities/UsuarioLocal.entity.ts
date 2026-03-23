import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class UsuarioLocal extends Model {
  public id!: number;
  public usuarioId!: number;
  public localId!: number;
  public visitedAt?: Date;
}

UsuarioLocal.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'usuario_id',
    },
    localId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'local_id',
    },
    visitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'visited_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'usuario_locais',
    timestamps: true,
    createdAt: 'visited_at',
    updatedAt: false,
  }
);

export default UsuarioLocal;
