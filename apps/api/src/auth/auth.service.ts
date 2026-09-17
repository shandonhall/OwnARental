import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { permissionsForRole, roleLabel } from './permissions';

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
    this.supabase = createClient(url, anonKey) as SupabaseClient;
  }

  /** First-time dashboard users must exist in `users` unless auto-provision is enabled (dev). */
  private staffAutoProvisionEnabled(): boolean {
    const explicit = this.config.get<string>('STAFF_AUTO_PROVISION');
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    return process.env.NODE_ENV !== 'production';
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

    const existing = await this.prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (existing) {
      if (!existing.isActive) {
        throw new ForbiddenException('User account is inactive');
      }

      return this.prisma.user.update({
        where: { id: authUser.id },
        data: {
          email,
          fullName,
          lastLoginAt: new Date(),
        },
      });
    }

    if (!this.staffAutoProvisionEnabled()) {
      throw new ForbiddenException(
        'Dashboard access is not provisioned for this account. Contact an administrator.',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        id: authUser.id,
        email,
        fullName,
        role: Role.FLEET_MANAGER,
      },
    });

    return user;
  }

  getMe(userId: string) {
    return this.prisma.user
      .findUniqueOrThrow({ where: { id: userId } })
      .then((user) => ({
        ...user,
        roleLabel: roleLabel(user.role),
        permissions: permissionsForRole(user.role),
      }));
  }
}
