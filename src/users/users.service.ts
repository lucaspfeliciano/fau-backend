import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '../common/auth/role.enum';
import { UserEntity } from './entities/user.entity';

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  name: string;
}

export interface UserContext {
  organizationId: string;
  role: Role;
}

@Injectable()
export class UsersService {
  private readonly users: UserEntity[] = [];

  findById(id: string): UserEntity | undefined {
    return this.users.find((user) => user.id === id);
  }

  findByEmail(email: string): UserEntity | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    return this.users.find(
      (user) => user.email.toLowerCase() === normalizedEmail,
    );
  }

  findOrCreateFromGoogle(input: GoogleProfileInput): UserEntity {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = this.users.find(
      (user) =>
        user.email.toLowerCase() === normalizedEmail ||
        user.googleId === input.googleId,
    );

    if (existingUser) {
      existingUser.name = input.name.trim();
      existingUser.email = normalizedEmail;
      existingUser.googleId = input.googleId;
      this.touch(existingUser);
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

    this.users.push(newUser);
    return newUser;
  }

  addMembership(
    userId: string,
    organizationId: string,
    role: Role,
  ): UserEntity | null {
    const user = this.findById(userId);
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
    return user;
  }

  setMembershipRole(
    userId: string,
    organizationId: string,
    role: Role,
  ): boolean {
    const user = this.findById(userId);
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
    return true;
  }

  setCurrentOrganization(userId: string, organizationId: string): boolean {
    const user = this.findById(userId);

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
    return true;
  }

  resolveUserContext(
    userId: string,
    preferredOrganizationId?: string,
  ): UserContext | null {
    const user = this.findById(userId);

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

    return {
      organizationId: fallbackMembership.organizationId,
      role: fallbackMembership.role,
    };
  }

  private touch(user: UserEntity): void {
    user.updatedAt = new Date().toISOString();
  }
}
