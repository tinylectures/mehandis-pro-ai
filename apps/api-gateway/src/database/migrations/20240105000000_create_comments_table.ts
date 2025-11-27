import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('entity_type', 50).notNullable();
    table.uuid('entity_id').notNullable();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.uuid('parent_comment_id').nullable().references('id').inTable('comments').onDelete('CASCADE');
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['entity_type', 'entity_id'], 'idx_comments_entity');
    table.index('user_id', 'idx_comments_user');
    table.index('parent_comment_id', 'idx_comments_parent');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('comments');
}
