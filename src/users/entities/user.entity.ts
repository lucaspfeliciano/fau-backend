import { Role } from '../../common/auth/role.enum';

export interface UserMembership {
  organizationId: string;
  role: Role;
  teamIds: string[];
  joinedAt: string;
}

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  googleId: string;
  memberships: UserMembership[];
  currentOrganizationId?: string;
  createdAt: string;
  updatedAt: string;
}
