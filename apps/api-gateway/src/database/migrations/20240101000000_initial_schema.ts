import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable PostGIS extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create organizations table
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('address', 500);
    table.string('phone', 50);
    table.string('email', 255);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.enum('role', ['admin', 'project_manager', 'quantity_surveyor', 'viewer']).notNullable();
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at');
  });

  // Create projects table
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.jsonb('location').notNullable();
    table.string('client_name', 255);
    table.date('start_date').notNullable();
    table.date('end_date');
    table.enum('status', ['planning', 'active', 'on_hold', 'completed', 'archived']).notNullable();
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create project_team_members table
  await knex.schema.createTable('project_team_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['owner', 'manager', 'surveyor', 'viewer']).notNullable();
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    table.unique(['project_id', 'user_id']);
  });

  // Create bim_models table
  await knex.schema.createTable('bim_models', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('file_name', 255).notNullable();
    table.bigInteger('file_size').notNullable();
    table.enum('file_type', ['revit', 'ifc']).notNullable();
    table.text('storage_url').notNullable();
    table.enum('status', ['uploading', 'processing', 'ready', 'error']).notNullable();
    table.integer('processing_progress').defaultTo(0);
    table.text('error_message');
    table.jsonb('metadata');
    table.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('processed_at');
  });

  // Create elements table
  await knex.schema.createTable('elements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('model_id').notNullable().references('id').inTable('bim_models').onDelete('CASCADE');
    table.string('external_id', 255).notNullable();
    table.string('category', 100).notNullable();
    table.string('family_name', 255);
    table.string('type_name', 255);
    table.string('level', 100);
    table.jsonb('geometry').notNullable();
    table.jsonb('properties');
    table.specificType('material_ids', 'text[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['model_id', 'external_id']);
  });

  // Create quantities table
  await knex.schema.createTable('quantities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('element_id').notNullable().references('id').inTable('elements').onDelete('CASCADE');
    table.string('category', 100).notNullable();
    table.enum('quantity_type', ['volume', 'area', 'length', 'count']).notNullable();
    table.decimal('value', 15, 4).notNullable();
    table.string('unit', 20).notNullable();
    table.decimal('waste_factor', 5, 4).defaultTo(0);
    table.decimal('adjusted_value', 15, 4).notNullable();
    table.string('calculation_method', 100);
    table.jsonb('metadata');
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    table.uuid('calculated_by').references('id').inTable('users').onDelete('SET NULL');
    table.integer('version').defaultTo(1);
  });

  // Create cost_items table
  await knex.schema.createTable('cost_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('quantity_id').references('id').inTable('quantities').onDelete('SET NULL');
    table.string('csi_code', 50);
    table.text('description').notNullable();
    table.decimal('quantity', 15, 4).notNullable();
    table.string('unit', 20).notNullable();
    table.decimal('unit_cost', 12, 2).notNullable();
    table.decimal('total_cost', 15, 2).notNullable();
    table.decimal('regional_adjustment', 5, 4).defaultTo(1.0);
    table.decimal('adjusted_unit_cost', 12, 2).notNullable();
    table.decimal('adjusted_total_cost', 15, 2).notNullable();
    table.enum('cost_type', ['material', 'labor', 'equipment', 'subcontractor']).notNullable();
    table.string('vendor', 255);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.integer('version').defaultTo(1);
  });

  // Create cost_estimates table
  await knex.schema.createTable('cost_estimates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.decimal('direct_costs', 15, 2).notNullable();
    table.decimal('indirect_costs', 15, 2).notNullable();
    table.decimal('contingency', 15, 2).notNullable();
    table.decimal('overhead', 15, 2).notNullable();
    table.decimal('profit', 15, 2).notNullable();
    table.decimal('total_cost', 15, 2).notNullable();
    table.enum('status', ['draft', 'review', 'approved', 'rejected']).notNullable();
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.integer('version').defaultTo(1);
  });

  // Create comments table
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.enum('entity_type', ['project', 'quantity', 'cost_item', 'estimate']).notNullable();
    table.uuid('entity_id').notNullable();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.uuid('parent_comment_id').references('id').inTable('comments').onDelete('CASCADE');
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action', 100).notNullable();
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.jsonb('changes');
    table.string('ip_address', 50);
    table.text('user_agent');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });

  // Create indexes for performance
  await knex.schema.raw('CREATE INDEX idx_projects_org ON projects(organization_id)');
  await knex.schema.raw('CREATE INDEX idx_projects_status ON projects(status)');
  await knex.schema.raw('CREATE INDEX idx_users_org ON users(organization_id)');
  await knex.schema.raw('CREATE INDEX idx_users_email ON users(email)');
  await knex.schema.raw('CREATE INDEX idx_elements_model ON elements(model_id)');
  await knex.schema.raw('CREATE INDEX idx_elements_category ON elements(category)');
  await knex.schema.raw('CREATE INDEX idx_quantities_project ON quantities(project_id)');
  await knex.schema.raw('CREATE INDEX idx_quantities_element ON quantities(element_id)');
  await knex.schema.raw('CREATE INDEX idx_cost_items_project ON cost_items(project_id)');
  await knex.schema.raw('CREATE INDEX idx_cost_items_csi ON cost_items(csi_code)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp)');
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('cost_estimates');
  await knex.schema.dropTableIfExists('cost_items');
  await knex.schema.dropTableIfExists('quantities');
  await knex.schema.dropTableIfExists('elements');
  await knex.schema.dropTableIfExists('bim_models');
  await knex.schema.dropTableIfExists('project_team_members');
  await knex.schema.dropTableIfExists('projects');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('organizations');

  // Drop extensions
  await knex.raw('DROP EXTENSION IF EXISTS postgis');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}
