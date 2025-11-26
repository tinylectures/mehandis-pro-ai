import { describe, it, expect } from 'vitest';
import { OrganizationRepository } from './OrganizationRepository';
import { UserRepository } from './UserRepository';
import { ProjectRepository } from './ProjectRepository';
import { BIMModelRepository } from './BIMModelRepository';
import { ElementRepository } from './ElementRepository';
import { QuantityRepository } from './QuantityRepository';
import { CostRepository } from './CostRepository';

describe('Repository Pattern', () => {
  it('should have OrganizationRepository class defined', () => {
    expect(OrganizationRepository).toBeDefined();
    expect(OrganizationRepository.prototype.create).toBeDefined();
    expect(OrganizationRepository.prototype.findById).toBeDefined();
  });

  it('should have UserRepository class defined', () => {
    expect(UserRepository).toBeDefined();
    expect(UserRepository.prototype.create).toBeDefined();
    expect(UserRepository.prototype.findById).toBeDefined();
    expect(UserRepository.prototype.findByEmail).toBeDefined();
  });

  it('should have ProjectRepository class defined', () => {
    expect(ProjectRepository).toBeDefined();
    expect(ProjectRepository.prototype.create).toBeDefined();
    expect(ProjectRepository.prototype.findById).toBeDefined();
    expect(ProjectRepository.prototype.addTeamMember).toBeDefined();
  });

  it('should have BIMModelRepository class defined', () => {
    expect(BIMModelRepository).toBeDefined();
    expect(BIMModelRepository.prototype.create).toBeDefined();
    expect(BIMModelRepository.prototype.findById).toBeDefined();
  });

  it('should have ElementRepository class defined', () => {
    expect(ElementRepository).toBeDefined();
    expect(ElementRepository.prototype.create).toBeDefined();
    expect(ElementRepository.prototype.createBatch).toBeDefined();
  });

  it('should have QuantityRepository class defined', () => {
    expect(QuantityRepository).toBeDefined();
    expect(QuantityRepository.prototype.create).toBeDefined();
    expect(QuantityRepository.prototype.findById).toBeDefined();
  });

  it('should have CostRepository class defined', () => {
    expect(CostRepository).toBeDefined();
    expect(CostRepository.prototype.createItem).toBeDefined();
    expect(CostRepository.prototype.createEstimate).toBeDefined();
  });
});
