import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { Op } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { Role } from '../role/entities/role.entity';
import { RoleName, ResponseMessage, ErrorMessage } from '../shared/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private userRepository: typeof User,
    @InjectModel(Role)
    private roleRepository: typeof Role,
    private jwtService: JwtService,
  ) {}

  async register(RegisterDto: RegisterDto) {
    const { name, email, password } = RegisterDto;

    const existingUser = await this.userRepository.findOne({
      where: {
        [Op.or]: [{ email }, { name }],
      },
    });

    if (existingUser) {
      throw new ConflictException(ErrorMessage.NAME_EMAIL_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = await this.roleRepository.findOne({ where: { name: RoleName.USER } });
    if (!userRole) {
      throw new ConflictException(ErrorMessage.DEFAULT_USER_ROLE_NOT_FOUND);
    }

    const user = await this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      role_id: userRole.id,
    } as any);

    const { password: _, ...userData } = user.toJSON();

    return {
      message: ResponseMessage.USER_REGISTERED,
      user: userData,
    };
  }

  async login(loginDto: LoginDto) {
    if (!loginDto) {
      throw new UnauthorizedException(ErrorMessage.INVALID_CREDENTIALS);
    }
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ 
      where: { email },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      throw new UnauthorizedException(ErrorMessage.INVALID_CREDENTIALS);
    }

    const hashedPassword = user.dataValues.password;

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException(ErrorMessage.INVALID_CREDENTIALS);
    }

    const payload = {
      sub: user.dataValues.id as string,
      email: user.dataValues.email,
      name: user.dataValues.name,
      role_id: user.dataValues.role_id as string | number,
      role_name: user.dataValues.role?.name,
    };

    const token = this.jwtService.sign(payload);

    const { password: _, ...userData } = user.dataValues;
    
    const userWithRole = {
      ...userData,
      role_name: user.role?.name || null,
    };

    return {
      message: ResponseMessage.USER_LOGGED_IN,
      user: userWithRole,
      access_token: token,
    };
  }
}
