import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { User, UserCreate, UserUpdate, UserPublic } from '../models/User';

export interface IUserRepository {
  create(data: UserCreate): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByOrganization(organizationId: string): Promise<User[]>;
  update(id: string, data: UserUpdate): Promise<User | null>;
  updateLastLogin(id: string): Promise<void>;
  delete(id: string): Promise<boolean>;
  verifyPassword(user: User, password: string): Promise<boolean>;
}

export class UserRepository implements IUserRepository {
  private db: Knex;
  private tableName = 'users';
  private saltRounds = 10;

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: UserCreate): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, this.saltRounds);

    const [user] = await this.db(this.tableName)
      .insert({
        email: data.email,
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        organization_id: data.organizationId,
      })
      .returning('*');

    return this.mapToUser(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.db(this.tableName)
      .where({ id })
      .first();

    return user ? this.mapToUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db(this.tableName)
      .where({ email })
      .first();

    return user ? this.mapToUser(user) : null;
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    const users = await this.db(this.tableName)
      .where({ organization_id: organizationId, is_active: true })
      .select('*');

    return users.map(this.mapToUser);
  }

  async update(id: string, data: UserUpdate): Promise<User | null> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const [user] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return user ? this.mapToUser(user) : null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({ last_login_at: this.db.fn.now() });
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      organizationId: row.organization_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
    };
  }

  toPublic(user: User): UserPublic {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
