import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '../common/auth/role.enum';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  name: string;
}

export interface LocalAccountInput {
  email: string;
  name: string;
  passwordHash: string;
}

export interface UserContext {
  organizationId: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findById(id: string): Promise<UserEntity | undefined> {
    return this.usersRepository.findById(id);
  }

  findByEmail(email: string): Promise<UserEntity | undefined> {
    return this.usersRepository.findByEmail(email);
  }

  async findOrCreateFromGoogle(input: GoogleProfileInput): Promise<UserEntity> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findByEmailOrGoogleId(
      normalizedEmail,
      input.googleId,
    );

    if (existingUser) {
      existingUser.name = input.name.trim();
      existingUser.email = normalizedEmail;
      existingUser.googleId = input.googleId;
      this.touch(existingUser);
      await this.usersRepository.update(existingUser);
      return existingUser;
    }

    const now = new Date().toISOString();
    const newUser: UserEntity = {
      id: randomUUID(),
      email: normalizedEmail,
      name: input.name.trim(),
      googleId: input.googleId,
      memberships: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.usersRepository.insert(newUser);
    return newUser;
  }

  async createLocalAccount(input: LocalAccountInput): Promise<UserEntity> {
    const now = new Date().toISOString();
    const user: UserEntity = {
      id: randomUUID(),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      memberships: [],
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await this.usersRepository.insert(user);
    return user;
  }

  async updateUser(user: UserEntity): Promise<void> {
    this.touch(user);
    await this.usersRepository.update(user);
  }

  async addMembership(
    userId: string,
    organizationId: string,
    role: Role,
  ): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    const existingMembership = user.memberships.find(
      (membership) => membership.organizationId === organizationId,
    );

    if (!existingMembership) {
      user.memberships.push({
        organizationId,
        role,
        teamIds: [],
        joinedAt: new Date().toISOString(),
      });
    }

    if (!user.currentOrganizationId) {
      user.currentOrganizationId = organizationId;
    }

    this.touch(user);
    await this.usersRepository.update(user);
    return user;
  }

  async setMembershipRole(
    userId: string,
    organizationId: string,
    role: Role,
  ): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    const membership = user.memberships.find(
      (member) => member.organizationId === organizationId,
    );

    if (!membership) {
      return false;
    }

    membership.role = role;
    this.touch(user);
    await this.usersRepository.update(user);
    return true;
  }

  async setCurrentOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const user = await this.findById(userId);

    if (!user) {
      return false;
    }

    const hasMembership = user.memberships.some(
      (membership) => membership.organizationId === organizationId,
    );

    if (!hasMembership) {
      return false;
    }

    user.currentOrganizationId = organizationId;
    this.touch(user);
    await this.usersRepository.update(user);
    return true;
  }

  async resolveUserContext(
    userId: string,
    preferredOrganizationId?: string,
  ): Promise<UserContext | null> {
    const user = await this.findById(userId);

    if (!user || user.memberships.length === 0) {
      return null;
    }

    if (preferredOrganizationId) {
      const preferredMembership = user.memberships.find(
        (membership) => membership.organizationId === preferredOrganizationId,
      );

      if (preferredMembership) {
        user.currentOrganizationId = preferredOrganizationId;
        this.touch(user);
        await this.usersRepository.update(user);
        return {
          organizationId: preferredMembership.organizationId,
          role: preferredMembership.role,
        };
      }
    }

    if (user.currentOrganizationId) {
      const currentMembership = user.memberships.find(
        (membership) =>
          membership.organizationId === user.currentOrganizationId,
      );

      if (currentMembership) {
        return {
          organizationId: currentMembership.organizationId,
          role: currentMembership.role,
        };
      }
    }

    const fallbackMembership = user.memberships[0];
    user.currentOrganizationId = fallbackMembership.organizationId;
    this.touch(user);
    await this.usersRepository.update(user);

    return {
      organizationId: fallbackMembership.organizationId,
      role: fallbackMembership.role,
    };
  }

  async listByOrganization(
    organizationId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      role?: string;
    },
  ) {
    const result = await this.usersRepository.listByOrganization(
      organizationId,
      options,
    );

    const items = result.items.map((user) => {
      const membership = user.memberships.find(
        (m) => m.organizationId === organizationId,
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership?.role ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return {
      items,
      total: result.total,
      page: options.page,
      limit: options.limit,
    };
  }

  async updateMembershipRole(
    targetUserId: string,
    organizationId: string,
    newRole: Role,
  ): Promise<{ id: string; role: Role; updatedAt: string }> {
    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new Error('USER_NOT_FOUND');
    }

    const membership = targetUser.memberships.find(
      (m) => m.organizationId === organizationId,
    );

    if (!membership) {
      throw new Error('USER_NOT_IN_ORGANIZATION');
    }

    if (membership.role === Role.Admin && newRole !== Role.Admin) {
      const adminCount =
        await this.usersRepository.countAdminsInOrganization(organizationId);
      if (adminCount <= 1) {
        throw new Error('CANNOT_REMOVE_LAST_ADMIN');
      }
    }

    membership.role = newRole;
    this.touch(targetUser);
    await this.usersRepository.update(targetUser);

    return {
      id: targetUser.id,
      role: newRole,
      updatedAt: targetUser.updatedAt,
    };
  }

  listUserIdsByTeam(organizationId: string, teamId: string): Promise<string[]> {
    return this.usersRepository.listUserIdsByTeam(organizationId, teamId);
  }

  private touch(user: UserEntity): void {
    user.updatedAt = new Date().toISOString();
  }
}
