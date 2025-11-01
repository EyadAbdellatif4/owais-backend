import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ROLES_KEY } from './decorators/roles.decorator';
import { RoleName } from '../shared/enums';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from '../role/entities/role.entity';
import { CacheService } from '../shared/services/cache.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly ROLE_TTL = 3600; // 1 hour

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
    @InjectModel(Role)
    private roleRepository: typeof Role,
    private cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Try to get role from cache
      const cacheKey = CacheService.getRoleKey(payload.role_id);
      let userRole = await this.cacheService.get<Role>(cacheKey);

      if (!userRole) {
        // Cache miss - fetch from database
        const role = await this.roleRepository.findByPk(payload.role_id);
        
        if (!role) {
          throw new UnauthorizedException('Invalid user role');
        }

        userRole = role;

        // Store in cache
        await this.cacheService.set(cacheKey, userRole, this.ROLE_TTL * 1000);
      }

      request['user'] = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role_id: payload.role_id,
        role_name: userRole.name,
      };

      const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredRoles) {
        const hasRole = requiredRoles.includes(userRole.name as RoleName);
        if (!hasRole) {
          throw new ForbiddenException('Insufficient permissions');
        }
      }

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
