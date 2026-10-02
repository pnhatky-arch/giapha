import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  role: text('role', { enum: ['super_admin', 'member'] }).notNull().default('member'),
  permissions: text('permissions').notNull().default('[]'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by').references(() => users.id),
});

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_sessions_user_id').on(table.userId),
  index('idx_sessions_expires_at').on(table.expiresAt),
]);

export const familyTree = sqliteTable('family_tree', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by').references(() => users.id),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => users.id),
  actorUsername: text('actor_username').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  details: text('details').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_audit_logs_created_at').on(table.createdAt),
]);

export const materialItems = sqliteTable('material_items', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  kind: text('kind', { enum: ['folder', 'note', 'link'] }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  createdByUsername: text('created_by_username').notNull(),
  updatedByUsername: text('updated_by_username').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_material_items_parent_id').on(table.parentId),
  index('idx_material_items_updated_at').on(table.updatedAt),
]);
