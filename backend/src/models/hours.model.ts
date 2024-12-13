// src/models/hours.model.ts
import { Model, DataTypes } from "sequelize";
import sequelize from "../types/database";

class Hours extends Model {
  public id!: number;
  public activity_id!: number;
  public date!: Date;
  public hours!: number;
  public verified!: boolean;
}

Hours.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    activity_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "Hours",
    tableName: "Hours",
  }
);

export default Hours;
