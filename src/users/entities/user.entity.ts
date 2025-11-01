import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Default,
} from 'sequelize-typescript';
import { DataType } from 'sequelize-typescript';
import { Role } from '../../role/entities/role.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * User is a model that represents a user
 */
@Table({
  tableName: 'users',
  timestamps: true,
})
/**
 * User is a model that represents a user
 */
export class User extends Model<User> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  @ApiProperty({ example: 'uuid', description: 'The ID of the user' })
  declare id: string;

  @Column({
    type: 'VARCHAR(50)',
    allowNull: false,
    unique: true,
  })
  @ApiProperty({ example: 'john.doe@example.com', description: 'The email of the user' })
  declare email: string;

  @Column({
    type: 'VARCHAR(255)',
    allowNull: false,
  })
  @ApiProperty({ example: 'password123', description: 'The password of the user' })
  declare password: string;

  @Column({
    type: 'VARCHAR(100)',
    allowNull: false,
  })
  @ApiProperty({ example: 'John Doe', description: 'The name of the user' })
  declare name: string;

  @Column({
    type: 'BOOLEAN',
    allowNull: false,
    defaultValue: true,
  })
  @ApiProperty({ example: true, description: 'The active status of the user' })
  declare is_active: boolean;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  @ApiProperty({ example: 'uuid', description: 'The ID of the role' })
  declare role_id: string;

  @BelongsTo(() => Role)
  @ApiProperty({ example: true, description: 'The role of the user' })
  role: Role;
}

