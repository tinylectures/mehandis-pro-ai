import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create version_history table for tracking changes to projects
  await knex.schema.createTable('version_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.enum('entity_type', ['project', 'cost_estimate', 'quantity']).notNullable();
    table.uuid('entity_id').notNullable();
    table.integer('version_number').notNullable();
    table.jsonb('data').notNullable(); // Snapshot of the entity at this version
    table.jsonb('changes'); // What changed from previous version
    table.uuid('changed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.text('change_description'); // Optional description of what changed
  });

  // Create indexes for performance
  await knex.schema.raw('CREATE INDEX idx_version_history_entity ON version_history(entity_type, entity_id)');
  await knex.schema.raw('CREATE INDEX idx_version_history_version ON version_history(entity_id, version_number)');
  await knex.schema.raw('CREATE INDEX idx_version_history_user ON version_history(changed_by)');
  await knex.schema.raw('CREATE INDEX idx_version_history_created ON version_history(created_at)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('version_history');
}
