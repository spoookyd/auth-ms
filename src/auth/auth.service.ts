import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto, LoginUserDto, VerifyTokenDto } from './dto';
import { PrismaClient } from 'generated/prisma';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload';
import { envs } from 'src/config/envs';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');
  constructor(private readonly jwtService: JwtService) {
    super();
  }
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Postgres Auth Connected');
  }

  async createUser(createUserDto: CreateUserDto) {
    const { email, name, password } = createUserDto;
    try {
      const userExist = await this.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (userExist) {
        this.handleRpcException(
          HttpStatus.BAD_REQUEST,
          'User Already Exist, please login',
        );
      }

      const user = await this.user.create({
        data: {
          email,
          name,
          password: bcrypt.hashSync(password, 10), // Encriptado
        },
      });

      if (!user) {
        this.handleRpcException(HttpStatus.BAD_REQUEST, 'Error creating user');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: __, ...rest } = user;

      return {
        user: rest,
        token: this.signJWT({ id: rest.id }),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    try {
      const user = await this.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.handleRpcException(HttpStatus.UNAUTHORIZED, 'Invalid Credentials');
      }

      const passwordIsValid = bcrypt.compareSync(password, user!.password);

      if (!passwordIsValid) {
        this.handleRpcException(HttpStatus.UNAUTHORIZED, 'Invalid Credentials');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: __, ...rest } = user!;

      return {
        user,
        token: await this.signJWT({ id: rest.id }),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async signJWT(payload: JwtPayload) {
    //? Hacer la funcion asyncrona?
    return await this.jwtService.signAsync(payload);
  }

  async verifyToken(verifyTokenDto: VerifyTokenDto) {
    const { token } = verifyTokenDto;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { exp, iat, id } = this.jwtService.verify<{
        id: string;
        iat: number;
        exp: number;
      }>(token, {
        secret: envs.jwt_secret,
      });

      return { userId: id, token: await this.signJWT({ id }) };
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleRpcException(status: HttpStatus, message: string) {
    throw new RpcException({
      status,
      message,
    });
  }

  private handleError(error: any) {
    if (error instanceof RpcException) throw error;
    this.logger.error(error, 'Please check this Error with caution');
    throw new RpcException({
      status: 400,
      message: 'Please check logs',
    });
  }
}
