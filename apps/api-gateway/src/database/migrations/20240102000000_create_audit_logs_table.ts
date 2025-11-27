import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.string('action', 50).notNullable(); // 'create', 'update', 'delete', 'login', 'logout', etc.
    table.string('entity_type', 100).notNullable(); // 'user', 'project', 'bim_model', etc.
    table.string('entity_id', 255).notNullable();
    table.jsonb('changes'); // { before: {}, after: {} }
    table.string('ip_address', 45).notNullable(); // IPv6 max length
    table.text('user_agent').notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());

    // Indexes for common queries
    table.index('user_id');
    table.index('entity_type');
    table.index('entity_id');
    table.index('action');
    table.index('timestamp');
    table.index(['entity_type', 'entity_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
}
