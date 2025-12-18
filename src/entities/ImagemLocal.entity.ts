import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class ImagemLocal extends Model {
  public id!: number;
  public url!: string;
  public localId!: number;
}

ImagemLocal.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // --- CORREÇÃO AQUI ---
  localId: {
    type: DataTypes.INTEGER,
    field: 'local_id'
  }
}, {
  sequelize,
  tableName: 'imagens_local',
  timestamps: false
});

export default ImagemLocal;