import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = this.config.getOrThrow<string>('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = this.config.getOrThrow<string>(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
    this.supabase = createClient(url, anonKey);
  }

  async resolveUserFromToken(accessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const authUser = data.user;
    const email = authUser.email;
    if (!email) {
      throw new UnauthorizedException('Authenticated user has no email');
    }

    const fullName =
      (typeof authUser.user_metadata?.full_name === 'string' &&
        authUser.user_metadata.full_name) ||
      email.split('@')[0];

    const user = await this.prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email,
        lastLoginAt: new Date(),
      },
      create: {
        id: authUser.id,
        email,
        fullName,
        role: Role.FLEET_MANAGER,
      },
    });

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    return user;
  }

  getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }
}
