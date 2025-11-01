import { Controller, Post, Body, HttpCode, HttpStatus, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/create-auth.dto';
import { Public } from './decorators/public.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterResponseDto, LoginResponseDto } from './dto/auth-response.dto';
import { 
  ValidationErrorDto, 
  ConflictErrorDto, 
  UnauthorizedErrorDto 
} from '../shared/dto/error-response.dto'; 

@Controller('auth')
@ApiTags('Auth')
@Public()
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    
  @Post('register')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account with the provided information. Email must be unique.'
  })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: RegisterResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ValidationErrorDto })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists', type: ConflictErrorDto })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Login a user',
    description: 'Authenticates a user with email and password, returns JWT access token.'
  })
  @ApiResponse({ status: 200, description: 'User logged in successfully', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error', type: ValidationErrorDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials', type: UnauthorizedErrorDto })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

