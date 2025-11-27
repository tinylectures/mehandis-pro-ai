import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create material_costs table
  await knex.schema.createTable('material_costs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('material_type', 100).notNullable().unique();
    table.text('description').notNullable();
    table.string('unit', 20).notNullable();
    table.decimal('default_unit_cost', 12, 2).notNullable();
    table.string('category', 100).notNullable();
    table.string('csi_code', 50);
    table.timestamp('last_updated').defaultTo(knex.fn.now());
  });

  // Create labor_rates table
  await knex.schema.createTable('labor_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('trade_type', 100).notNullable();
    table.text('description').notNullable();
    table.decimal('hourly_rate', 10, 2).notNullable();
    table.string('region', 100).notNullable();
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    table.unique(['trade_type', 'region']);
  });

  // Create regional_adjustments table
  await knex.schema.createTable('regional_adjustments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('region', 100).notNullable();
    table.string('country', 100).notNullable();
    table.string('state', 100);
    table.string('city', 100);
    table.decimal('adjustment_factor', 5, 4).notNullable();
    table.date('effective_date').notNullable();
    table.text('notes');
    table.unique(['country', 'state', 'city']);
  });

  // Create indexes
  await knex.schema.raw('CREATE INDEX idx_material_costs_category ON material_costs(category)');
  await knex.schema.raw('CREATE INDEX idx_material_costs_csi ON material_costs(csi_code)');
  await knex.schema.raw('CREATE INDEX idx_labor_rates_region ON labor_rates(region)');
  await knex.schema.raw('CREATE INDEX idx_regional_adjustments_country ON regional_adjustments(country)');

  // Insert default material costs
  await knex('material_costs').insert([
    // Concrete
    { material_type: 'concrete_3000psi', description: 'Concrete 3000 PSI', unit: 'cy', default_unit_cost: 125.00, category: 'concrete', csi_code: '03 30 00' },
    { material_type: 'concrete_4000psi', description: 'Concrete 4000 PSI', unit: 'cy', default_unit_cost: 135.00, category: 'concrete', csi_code: '03 30 00' },
    { material_type: 'concrete_5000psi', description: 'Concrete 5000 PSI', unit: 'cy', default_unit_cost: 150.00, category: 'concrete', csi_code: '03 30 00' },
    
    // Rebar
    { material_type: 'rebar_grade60', description: 'Rebar Grade 60', unit: 'ton', default_unit_cost: 850.00, category: 'reinforcement', csi_code: '03 20 00' },
    { material_type: 'rebar_grade40', description: 'Rebar Grade 40', unit: 'ton', default_unit_cost: 800.00, category: 'reinforcement', csi_code: '03 20 00' },
    
    // Structural Steel
    { material_type: 'structural_steel_wide_flange', description: 'Structural Steel Wide Flange', unit: 'ton', default_unit_cost: 2500.00, category: 'structural_steel', csi_code: '05 12 00' },
    { material_type: 'structural_steel_tube', description: 'Structural Steel Tube', unit: 'ton', default_unit_cost: 2800.00, category: 'structural_steel', csi_code: '05 12 00' },
    
    // Masonry
    { material_type: 'cmu_8inch', description: 'CMU 8 inch', unit: 'sf', default_unit_cost: 8.50, category: 'masonry', csi_code: '04 22 00' },
    { material_type: 'brick_common', description: 'Common Brick', unit: 'sf', default_unit_cost: 12.00, category: 'masonry', csi_code: '04 21 00' },
    
    // Lumber
    { material_type: 'lumber_2x4', description: 'Lumber 2x4', unit: 'lf', default_unit_cost: 0.85, category: 'lumber', csi_code: '06 10 00' },
    { material_type: 'lumber_2x6', description: 'Lumber 2x6', unit: 'lf', default_unit_cost: 1.25, category: 'lumber', csi_code: '06 10 00' },
    { material_type: 'plywood_3_4', description: 'Plywood 3/4 inch', unit: 'sf', default_unit_cost: 1.50, category: 'lumber', csi_code: '06 10 00' },
    
    // Drywall
    { material_type: 'drywall_1_2', description: 'Drywall 1/2 inch', unit: 'sf', default_unit_cost: 0.50, category: 'drywall', csi_code: '09 29 00' },
    { material_type: 'drywall_5_8', description: 'Drywall 5/8 inch', unit: 'sf', default_unit_cost: 0.60, category: 'drywall', csi_code: '09 29 00' },
    
    // Roofing
    { material_type: 'asphalt_shingles', description: 'Asphalt Shingles', unit: 'sq', default_unit_cost: 95.00, category: 'roofing', csi_code: '07 31 00' },
    { material_type: 'metal_roofing', description: 'Metal Roofing', unit: 'sf', default_unit_cost: 4.50, category: 'roofing', csi_code: '07 41 00' },
    
    // Insulation
    { material_type: 'fiberglass_batt_r19', description: 'Fiberglass Batt R-19', unit: 'sf', default_unit_cost: 0.65, category: 'insulation', csi_code: '07 21 00' },
    { material_type: 'spray_foam', description: 'Spray Foam Insulation', unit: 'sf', default_unit_cost: 1.50, category: 'insulation', csi_code: '07 21 00' },
  ]);

  // Insert default labor rates
  await knex('labor_rates').insert([
    // General Labor
    { trade_type: 'general_laborer', description: 'General Laborer', hourly_rate: 25.00, region: 'US_National' },
    { trade_type: 'carpenter', description: 'Carpenter', hourly_rate: 35.00, region: 'US_National' },
    { trade_type: 'electrician', description: 'Electrician', hourly_rate: 45.00, region: 'US_National' },
    { trade_type: 'plumber', description: 'Plumber', hourly_rate: 45.00, region: 'US_National' },
    { trade_type: 'hvac_technician', description: 'HVAC Technician', hourly_rate: 42.00, region: 'US_National' },
    { trade_type: 'mason', description: 'Mason', hourly_rate: 38.00, region: 'US_National' },
    { trade_type: 'concrete_finisher', description: 'Concrete Finisher', hourly_rate: 32.00, region: 'US_National' },
    { trade_type: 'ironworker', description: 'Ironworker', hourly_rate: 40.00, region: 'US_National' },
    { trade_type: 'roofer', description: 'Roofer', hourly_rate: 30.00, region: 'US_National' },
    { trade_type: 'drywall_installer', description: 'Drywall Installer', hourly_rate: 28.00, region: 'US_National' },
    { trade_type: 'painter', description: 'Painter', hourly_rate: 27.00, region: 'US_National' },
    { trade_type: 'equipment_operator', description: 'Equipment Operator', hourly_rate: 38.00, region: 'US_National' },
  ]);

  // Insert default regional adjustments
  await knex('regional_adjustments').insert([
    // US National baseline
    { region: 'US_National', country: 'USA', adjustment_factor: 1.0000, effective_date: new Date('2024-01-01'), notes: 'National baseline' },
    
    // High-cost regions
    { region: 'US_Northeast', country: 'USA', state: 'NY', adjustment_factor: 1.3500, effective_date: new Date('2024-01-01'), notes: 'New York metro area' },
    { region: 'US_West', country: 'USA', state: 'CA', adjustment_factor: 1.4000, effective_date: new Date('2024-01-01'), notes: 'California' },
    { region: 'US_Northeast', country: 'USA', state: 'MA', adjustment_factor: 1.2500, effective_date: new Date('2024-01-01'), notes: 'Massachusetts' },
    
    // Mid-cost regions
    { region: 'US_South', country: 'USA', state: 'TX', adjustment_factor: 0.9500, effective_date: new Date('2024-01-01'), notes: 'Texas' },
    { region: 'US_Midwest', country: 'USA', state: 'IL', adjustment_factor: 1.1000, effective_date: new Date('2024-01-01'), notes: 'Illinois' },
    { region: 'US_West', country: 'USA', state: 'WA', adjustment_factor: 1.1500, effective_date: new Date('2024-01-01'), notes: 'Washington' },
    
    // Low-cost regions
    { region: 'US_South', country: 'USA', state: 'AL', adjustment_factor: 0.8500, effective_date: new Date('2024-01-01'), notes: 'Alabama' },
    { region: 'US_Midwest', country: 'USA', state: 'KS', adjustment_factor: 0.8800, effective_date: new Date('2024-01-01'), notes: 'Kansas' },
    { region: 'US_South', country: 'USA', state: 'MS', adjustment_factor: 0.8200, effective_date: new Date('2024-01-01'), notes: 'Mississippi' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('regional_adjustments');
  await knex.schema.dropTableIfExists('labor_rates');
  await knex.schema.dropTableIfExists('material_costs');
}
