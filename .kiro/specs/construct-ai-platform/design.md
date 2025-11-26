# Design Document

## Overview

ConstructAI is an enterprise-grade construction quantity surveying automation platform built on a modern microservices architecture. The system integrates BIM model processing, automated quantity calculations, AI-powered validation, cost estimation, and real-time collaboration into a unified platform.

### Architecture Philosophy

The platform follows a layered architecture with clear separation of concerns:
- **Presentation Layer**: React-based SPA with TypeScript for type safety
- **API Gateway Layer**: Express.js REST API with authentication and rate limiting
- **Business Logic Layer**: Domain services implementing core functionality
- **Data Access Layer**: Repository pattern with PostgreSQL and PostGIS
- **Integration Layer**: Microservices for BIM processing and AI/ML operations
- **Caching Layer**: Redis for sessions, real-time data, and query optimization

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI) component library
- Redux Toolkit for state management
- Socket.io-client for real-time features
- Three.js for 3D model visualization
- Recharts for data visualization

**Backend:**
- Node.js 20 LTS with Express and TypeScript
- PostgreSQL 15 with PostGIS extension
- Redis 7 for caching and pub/sub
- Socket.io for WebSocket connections
- JWT for authentication
- Swagger/OpenAPI for API documentation

**BIM Processing Microservice:**
- Python 3.11 with FastAPI
- PyRevit for Revit integration
- IfcOpenShell for IFC file processing
- NumPy for mathematical computations

**AI/ML Microservice:**
- Python 3.11 with FastAPI
- TensorFlow 2.x for deep learning
- scikit-learn for traditional ML
- OpenCV for computer vision


## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Web Browser  │  │ Mobile App   │  │ Desktop App  │          │
│  │  (React)     │  │(React Native)│  │  (Electron)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Express.js API Gateway                                 │    │
│  │  - Authentication (JWT)                                 │    │
│  │  - Rate Limiting                                        │    │
│  │  - Request Validation                                   │    │
│  │  - API Documentation (Swagger)                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Auth    │ │ Project  │ │Quantity  │ │  Cost    │          │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Risk   │ │Collab    │ │ Report   │ │  Audit   │          │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Integration Layer                              │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ BIM Processing     │  │  AI/ML Service     │                │
│  │  Microservice      │  │   Microservice     │                │
│  │  (Python/FastAPI)  │  │ (Python/FastAPI)   │                │
│  │  - PyRevit         │  │ - TensorFlow       │                │
│  │  - IfcOpenShell    │  │ - scikit-learn     │                │
│  │  - NumPy           │  │ - OpenCV           │                │
│  └────────────────────┘  └────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │    Redis     │  │  S3/Blob     │          │
│  │  + PostGIS   │  │   Cache      │  │  Storage     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Patterns

**Synchronous Communication:**
- REST APIs for CRUD operations
- Request/Response pattern with JSON payloads
- HTTP/2 for improved performance

**Asynchronous Communication:**
- WebSocket (Socket.io) for real-time collaboration
- Redis Pub/Sub for event broadcasting
- Message queues for long-running tasks (BIM processing, AI inference)

**Data Flow:**
1. Client sends authenticated request to API Gateway
2. Gateway validates JWT and forwards to appropriate service
3. Service executes business logic and calls repositories
4. Repository interacts with database using SQL queries
5. Response flows back through layers to client
6. Real-time updates broadcast via WebSocket to connected clients


## Components and Interfaces

### Frontend Components

**Authentication Module:**
- `LoginForm`: User login interface
- `RegistrationForm`: New user registration
- `PasswordResetForm`: Password recovery workflow
- `AuthProvider`: Context provider for authentication state

**Project Management Module:**
- `ProjectDashboard`: List view of all projects
- `ProjectForm`: Create/edit project details
- `ProjectCard`: Individual project summary display
- `TeamManagement`: Assign users to projects with roles

**BIM Integration Module:**
- `ModelUploader`: File upload interface for Revit/IFC files
- `ModelViewer`: 3D visualization using Three.js
- `ElementBrowser`: Tree view of BIM elements
- `ElementProperties`: Display element metadata and properties

**Quantity Takeoff Module:**
- `QuantityTable`: Editable grid of quantities by element
- `CalculationEngine`: Client-side calculation preview
- `CategoryFilter`: Filter quantities by CSI division
- `UnitConverter`: Toggle between imperial/metric units

**Cost Estimation Module:**
- `CostBreakdown`: Hierarchical cost display
- `UnitCostEditor`: Edit unit prices with regional adjustments
- `CostSummary`: Total cost with contingencies
- `CostComparison`: Compare estimates across versions

**AI Validation Module:**
- `AnomalyDetector`: Display flagged quantity anomalies
- `PredictionPanel`: Show AI cost predictions with confidence
- `ProgressAnalyzer`: Computer vision progress tracking
- `ValidationReport`: Summary of AI validation results

**Risk Analysis Module:**
- `MonteCarloSimulator`: Configure and run simulations
- `RiskDashboard`: Display risk metrics and distributions
- `SensitivityChart`: Visualize cost driver sensitivity
- `ContingencyCalculator`: Risk-based contingency recommendations

**Collaboration Module:**
- `CollaborationPanel`: Show active users and cursors
- `CommentThread`: Discussion threads on estimates
- `ChangeHistory`: Version control and audit trail
- `NotificationCenter`: Real-time alerts and updates

**Reporting Module:**
- `ReportBuilder`: Configure report parameters
- `ReportPreview`: Preview before generation
- `ExportOptions`: Select format (PDF, Excel, CSV)
- `TemplateManager`: Manage report templates

### Backend Services

**AuthService:**
```typescript
interface AuthService {
  register(userData: UserRegistration): Promise<User>;
  login(credentials: LoginCredentials): Promise<AuthToken>;
  validateToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<AuthToken>;
  resetPassword(email: string): Promise<void>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
}
```

**ProjectService:**
```typescript
interface ProjectService {
  createProject(projectData: ProjectCreate): Promise<Project>;
  getProject(projectId: string): Promise<Project>;
  updateProject(projectId: string, updates: ProjectUpdate): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
  listProjects(userId: string, filters: ProjectFilters): Promise<Project[]>;
  assignTeamMember(projectId: string, userId: string, role: ProjectRole): Promise<void>;
  removeTeamMember(projectId: string, userId: string): Promise<void>;
}
```

**BIMService:**
```typescript
interface BIMService {
  uploadModel(projectId: string, file: File, modelType: 'revit' | 'ifc'): Promise<BIMModel>;
  processModel(modelId: string): Promise<ProcessingResult>;
  getModelElements(modelId: string, filters: ElementFilters): Promise<Element[]>;
  getElementProperties(elementId: string): Promise<ElementProperties>;
  classifyElements(modelId: string): Promise<Classification[]>;
}
```

**QuantityService:**
```typescript
interface QuantityService {
  calculateQuantities(modelId: string, options: CalculationOptions): Promise<QuantityResult[]>;
  getQuantities(projectId: string, filters: QuantityFilters): Promise<Quantity[]>;
  updateQuantity(quantityId: string, updates: QuantityUpdate): Promise<Quantity>;
  applyWasteFactor(quantityId: string, wasteFactor: number): Promise<Quantity>;
  convertUnits(quantityId: string, targetUnit: string): Promise<Quantity>;
}
```

**CostService:**
```typescript
interface CostService {
  applyCosts(projectId: string, costData: CostApplication): Promise<CostEstimate>;
  updateUnitCost(itemId: string, unitCost: number): Promise<CostItem>;
  calculateTotalCost(projectId: string): Promise<CostSummary>;
  applyRegionalAdjustment(projectId: string, region: string): Promise<CostEstimate>;
  calculateContingency(projectId: string, riskLevel: RiskLevel): Promise<number>;
  getCostBreakdown(projectId: string, format: 'csi' | 'custom'): Promise<CostBreakdown>;
}
```

**AIService:**
```typescript
interface AIService {
  validateQuantities(quantities: Quantity[]): Promise<ValidationResult[]>;
  predictCost(projectParams: ProjectParameters): Promise<CostPrediction>;
  analyzeProgressPhoto(imageData: Buffer, projectId: string): Promise<ProgressAnalysis>;
  detectAnomalies(data: number[], threshold: number): Promise<Anomaly[]>;
  trainModel(trainingData: TrainingDataset): Promise<ModelMetrics>;
}
```

**RiskService:**
```typescript
interface RiskService {
  runMonteCarloSimulation(baseEstimate: number, uncertainties: Uncertainty[], iterations: number): Promise<SimulationResult>;
  assessProjectRisks(projectId: string, riskRegistry: Risk[]): Promise<RiskAssessment>;
  calculateRiskExposure(risks: Risk[]): Promise<RiskExposure>;
  performSensitivityAnalysis(projectId: string, variables: Variable[]): Promise<SensitivityResult>;
}
```

**CollaborationService:**
```typescript
interface CollaborationService {
  broadcastChange(projectId: string, change: DataChange): Promise<void>;
  trackUserCursor(projectId: string, userId: string, position: CursorPosition): Promise<void>;
  addComment(entityId: string, comment: Comment): Promise<Comment>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
  getActiveUsers(projectId: string): Promise<ActiveUser[]>;
}
```

**ReportService:**
```typescript
interface ReportService {
  generateReport(projectId: string, template: ReportTemplate): Promise<Report>;
  exportToPDF(reportId: string): Promise<Buffer>;
  exportToExcel(reportId: string): Promise<Buffer>;
  exportToCSV(reportId: string): Promise<string>;
  saveTemplate(template: ReportTemplate): Promise<ReportTemplate>;
}
```


## Data Models

### Core Entities

**User:**
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'project_manager' | 'quantity_surveyor' | 'viewer';
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
}
```

**Project:**
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  location: {
    address: string;
    city: string;
    region: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  clientName: string;
  startDate: Date;
  endDate?: Date;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**ProjectTeamMember:**
```typescript
interface ProjectTeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'manager' | 'surveyor' | 'viewer';
  assignedAt: Date;
  assignedBy: string;
}
```

**BIMModel:**
```typescript
interface BIMModel {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: 'revit' | 'ifc';
  storageUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  processingProgress: number;
  errorMessage?: string;
  metadata: {
    softwareVersion?: string;
    projectInfo?: Record<string, any>;
    elementCount?: number;
  };
  uploadedBy: string;
  uploadedAt: Date;
  processedAt?: Date;
}
```

**Element:**
```typescript
interface Element {
  id: string;
  modelId: string;
  externalId: string; // ID from BIM software
  category: string; // 'wall', 'floor', 'column', 'beam', etc.
  familyName?: string;
  typeName?: string;
  level?: string;
  geometry: {
    type: 'solid' | 'surface' | 'curve';
    boundingBox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
    vertices?: number[][];
    faces?: number[][];
  };
  properties: Record<string, any>;
  materialIds: string[];
  createdAt: Date;
}
```

**Quantity:**
```typescript
interface Quantity {
  id: string;
  projectId: string;
  elementId: string;
  category: string;
  quantityType: 'volume' | 'area' | 'length' | 'count';
  value: number;
  unit: string; // 'cy', 'sf', 'lf', 'm3', 'm2', 'm', etc.
  wasteFactor: number;
  adjustedValue: number; // value * (1 + wasteFactor)
  calculationMethod: string;
  metadata: {
    formula?: string;
    parameters?: Record<string, number>;
  };
  calculatedAt: Date;
  calculatedBy: string;
  version: number;
}
```

**CostItem:**
```typescript
interface CostItem {
  id: string;
  projectId: string;
  quantityId?: string;
  csiCode?: string; // CSI MasterFormat code
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  regionalAdjustment: number;
  adjustedUnitCost: number; // unitCost * regionalAdjustment
  adjustedTotalCost: number; // quantity * adjustedUnitCost
  costType: 'material' | 'labor' | 'equipment' | 'subcontractor';
  vendor?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

**CostEstimate:**
```typescript
interface CostEstimate {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  directCosts: number;
  indirectCosts: number;
  contingency: number;
  overhead: number;
  profit: number;
  totalCost: number;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  version: number;
}
```

**AIValidation:**
```typescript
interface AIValidation {
  id: string;
  projectId: string;
  quantityId: string;
  validationType: 'anomaly_detection' | 'cost_prediction' | 'progress_analysis';
  result: 'pass' | 'warning' | 'fail';
  confidence: number; // 0-1
  message: string;
  details: Record<string, any>;
  modelVersion: string;
  validatedAt: Date;
}
```

**RiskAssessment:**
```typescript
interface RiskAssessment {
  id: string;
  projectId: string;
  assessmentType: 'monte_carlo' | 'sensitivity' | 'qualitative';
  baseEstimate: number;
  results: {
    mean?: number;
    stdDev?: number;
    p10?: number;
    p50?: number;
    p90?: number;
    distribution?: number[];
    sensitivityFactors?: { factor: string; impact: number }[];
  };
  parameters: Record<string, any>;
  iterations?: number;
  performedBy: string;
  performedAt: Date;
}
```

**Comment:**
```typescript
interface Comment {
  id: string;
  entityType: 'project' | 'quantity' | 'cost_item' | 'estimate';
  entityId: string;
  userId: string;
  content: string;
  parentCommentId?: string; // for threaded comments
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**AuditLog:**
```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string; // 'create', 'update', 'delete', 'login', etc.
  entityType: string;
  entityId: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

### Database Schema

**PostgreSQL Tables:**

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  organization_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location JSONB NOT NULL,
  client_name VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) NOT NULL,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BIM Models
CREATE TABLE bim_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  storage_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Elements (with PostGIS for spatial data)
CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES bim_models(id) ON DELETE CASCADE,
  external_id VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  family_name VARCHAR(255),
  type_name VARCHAR(255),
  level VARCHAR(100),
  geometry JSONB NOT NULL,
  properties JSONB,
  material_ids TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id, external_id)
);

-- Quantities
CREATE TABLE quantities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  element_id UUID REFERENCES elements(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  quantity_type VARCHAR(50) NOT NULL,
  value NUMERIC(15, 4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  waste_factor NUMERIC(5, 4) DEFAULT 0,
  adjusted_value NUMERIC(15, 4) NOT NULL,
  calculation_method VARCHAR(100),
  metadata JSONB,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  calculated_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1
);

-- Cost Items
CREATE TABLE cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  quantity_id UUID REFERENCES quantities(id),
  csi_code VARCHAR(50),
  description TEXT NOT NULL,
  quantity NUMERIC(15, 4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(15, 2) NOT NULL,
  regional_adjustment NUMERIC(5, 4) DEFAULT 1.0,
  adjusted_unit_cost NUMERIC(12, 2) NOT NULL,
  adjusted_total_cost NUMERIC(15, 2) NOT NULL,
  cost_type VARCHAR(50) NOT NULL,
  vendor VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_elements_model ON elements(model_id);
CREATE INDEX idx_elements_category ON elements(category);
CREATE INDEX idx_quantities_project ON quantities(project_id);
CREATE INDEX idx_quantities_element ON quantities(element_id);
CREATE INDEX idx_cost_items_project ON cost_items(project_id);
CREATE INDEX idx_cost_items_csi ON cost_items(csi_code);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication and Authorization Properties

**Property 1: Valid credentials produce valid JWT tokens**
*For any* valid user credentials (email and password), when authentication is performed, the System should return a JWT token that can be successfully validated and contains the correct user identity.
**Validates: Requirements 1.1**

**Property 2: Invalid tokens deny access**
*For any* protected resource and any invalid or expired JWT token, the System should deny access and return an authentication error.
**Validates: Requirements 1.2**

**Property 3: Expired sessions require re-authentication**
*For any* user session that has exceeded its expiration time, any subsequent request should be rejected until the user re-authenticates.
**Validates: Requirements 1.3**

**Property 4: Password reset generates secure links**
*For any* registered email address, when a password reset is requested, the System should generate a unique, time-limited reset token.
**Validates: Requirements 1.4**

**Property 5: Role-based access is enforced**
*For any* user with a specific role and any resource with permission requirements, the System should grant access if and only if the user's role has the required permissions.
**Validates: Requirements 1.5**

### Project Management Properties

**Property 6: Project creation persists all metadata**
*For any* valid project data including name, location, client, and start date, when a project is created, all provided fields should be stored and retrievable from the database.
**Validates: Requirements 2.1**

**Property 7: Team assignment grants appropriate access**
*For any* user assigned to a project with a specific role, that user should be able to access project data according to their role permissions.
**Validates: Requirements 2.2**

**Property 8: Dashboard shows only accessible projects**
*For any* user, the project dashboard should display all and only those projects where the user has been granted access.
**Validates: Requirements 2.3**

**Property 9: Updates maintain version history**
*For any* project update, the System should save the new state and create a version history entry with timestamp and user attribution.
**Validates: Requirements 2.4**

**Property 10: Archival preserves data**
*For any* project that is archived, all project data should remain in the database but the project should not appear in active project lists.
**Validates: Requirements 2.5**

### BIM Integration Properties

**Property 11: Element classification is complete**
*For any* BIM model processed by the System, every element should be assigned to a valid category (wall, floor, column, beam, etc.).
**Validates: Requirements 3.3**

**Property 12: Model processing persists all data**
*For any* successfully processed BIM model, all extracted element geometry, properties, and relationships should be stored in the database and be retrievable.
**Validates: Requirements 3.4**

### Quantity Calculation Properties

**Property 13: Geometric calculations are accurate**
*For any* element with known geometric dimensions, the calculated volume, area, or length should match the expected value within acceptable tolerance (0.1%).
**Validates: Requirements 4.1, 4.4**

**Property 14: Waste factors are applied correctly**
*For any* base quantity and waste factor, the adjusted quantity should equal the base quantity multiplied by (1 + waste factor).
**Validates: Requirements 4.2**

**Property 15: Rebar weight calculation is accurate**
*For any* rebar with specified length, diameter, and material density, the calculated weight should equal π × (diameter/2)² × length × density.
**Validates: Requirements 4.3**

**Property 16: Quantity persistence includes metadata**
*For any* calculated quantity, when stored in the database, it should include element reference, calculation method, and calculation timestamp.
**Validates: Requirements 4.5**

**Property 17: Unit conversion round-trip**
*For any* quantity value in imperial units, converting to metric and back to imperial should return the original value within acceptable tolerance (0.01%).
**Validates: Requirements 4.6**

### Cost Estimation Properties

**Property 18: Cost calculation is accurate**
*For any* quantity and unit cost, the total cost should equal quantity × unit cost.
**Validates: Requirements 5.1**

**Property 19: Regional adjustments are applied**
*For any* project location with a regional adjustment factor, all unit costs should be multiplied by that factor.
**Validates: Requirements 5.2**

**Property 20: Costs are organized by CSI codes**
*For any* cost estimate, all cost items should be grouped by their CSI MasterFormat division codes.
**Validates: Requirements 5.3**

**Property 21: Unit cost updates trigger recalculation**
*For any* cost item, when its unit cost is updated, the total cost should be recalculated as new_unit_cost × quantity.
**Validates: Requirements 5.4**

**Property 22: Project totals include all components**
*For any* project cost estimate, the total should equal the sum of direct costs, contingencies, and overhead.
**Validates: Requirements 5.5**

**Property 23: Default costs are available**
*For any* common material type in the cost database, querying for default unit cost should return a valid positive number.
**Validates: Requirements 5.6**

### AI Validation Properties

**Property 24: Validation runs on all quantities**
*For any* completed quantity takeoff, the AI validation service should analyze all calculated quantities and return validation results.
**Validates: Requirements 6.1**

**Property 25: Predictions include confidence intervals**
*For any* AI cost prediction, the result should include both a predicted value and a confidence interval (lower and upper bounds).
**Validates: Requirements 6.4**

**Property 26: Predictions are reasonable**
*For any* project parameters used for cost prediction, the predicted cost should be within a reasonable range (e.g., not negative, not orders of magnitude off from similar projects).
**Validates: Requirements 6.3**

### Risk Analysis Properties

**Property 27: Monte Carlo runs specified iterations**
*For any* Monte Carlo simulation with a specified number of iterations N, the simulation should generate exactly N cost samples.
**Validates: Requirements 7.1**

**Property 28: Simulation reports all percentiles**
*For any* completed Monte Carlo simulation, the results should include P10, P50 (median), and P90 percentile values.
**Validates: Requirements 7.2**

**Property 29: Risk assessment covers all risk types**
*For any* project risk assessment, the results should include risk exposure calculations for cost overrun, schedule delay, and quality issues.
**Validates: Requirements 7.3**

**Property 30: Risk results include distributions**
*For any* risk analysis, the results should include both probability distributions and sensitivity analysis data.
**Validates: Requirements 7.4**

**Property 31: Contingency is risk-based**
*For any* project with calculated risk exposure, the recommended contingency should be proportional to the total risk exposure.
**Validates: Requirements 7.5**

### Collaboration Properties

**Property 32: Changes are broadcast to collaborators**
*For any* change made by a user to shared project data, all other users currently viewing that data should receive an update notification.
**Validates: Requirements 8.2**

**Property 33: Cursor positions are tracked**
*For any* user actively editing a document, their cursor position should be broadcast to other collaborating users and displayed in the UI.
**Validates: Requirements 8.3**

**Property 34: Conflicts use last-write-wins**
*For any* two conflicting edits to the same data field, the edit with the later timestamp should be preserved in the final state.
**Validates: Requirements 8.4**

**Property 35: Comments include attribution**
*For any* comment or annotation added by a user, the stored comment should include the user ID and timestamp.
**Validates: Requirements 8.5**

### Reporting Properties

**Property 36: Quantity reports are organized**
*For any* generated quantity report, all quantities should be grouped by category and include quantity type, value, and unit.
**Validates: Requirements 9.1**

**Property 37: Cost reports are complete**
*For any* generated cost estimate report, the document should include cost breakdowns, assumptions section, and exclusions section.
**Validates: Requirements 9.2**

**Property 38: Export supports multiple formats**
*For any* data export request, the System should successfully generate output in the requested format (PDF, Excel, or CSV).
**Validates: Requirements 9.3**

**Property 39: Reports include metadata**
*For any* generated report, the document should include project name, generation timestamp, and user who generated it.
**Validates: Requirements 9.4**

### Version Control Properties

**Property 40: Changes are auto-saved**
*For any* user modification to estimate data, the change should be persisted to the database within a reasonable time (e.g., 5 seconds).
**Validates: Requirements 10.1**

**Property 41: Versions include attribution**
*For any* saved version, the version record should include a timestamp and the user ID of who made the change.
**Validates: Requirements 10.2**

**Property 42: Version history is complete**
*For any* entity with version history, requesting the history should return all previous versions in chronological order.
**Validates: Requirements 10.3**

**Property 43: Version restoration creates new version**
*For any* version restoration operation, the System should revert the data to the selected version state and create a new version entry recording the restoration.
**Validates: Requirements 10.4**

### Mobile Field Data Properties

**Property 44: Photos include metadata**
*For any* photo captured through the mobile app, the stored image should include GPS coordinates and capture timestamp.
**Validates: Requirements 12.2**

**Property 45: Offline data syncs on reconnection**
*For any* data created while offline, when connectivity is restored, all queued data should be synchronized to the server.
**Validates: Requirements 12.3**

**Property 46: Survey data is validated**
*For any* submitted survey response, the System should validate the data against the survey schema before storing.
**Validates: Requirements 12.5**

### Security Properties

**Property 47: Audit logs capture operations**
*For any* sensitive operation (create, update, delete), an audit log entry should be created with user ID, timestamp, and operation details.
**Validates: Requirements 13.3**

**Property 48: Rate limiting throttles excess requests**
*For any* API endpoint with rate limiting configured, when a client exceeds the threshold, subsequent requests should be rejected with a 429 status code.
**Validates: Requirements 13.4**

### Integration Properties

**Property 49: All APIs are documented**
*For any* REST API endpoint exposed by the System, OpenAPI documentation should exist describing the endpoint, parameters, and responses.
**Validates: Requirements 14.1**

**Property 50: API authentication is enforced**
*For any* API request without valid authentication credentials (API key or OAuth token), the System should reject the request with a 401 status code.
**Validates: Requirements 14.2**

**Property 51: Webhooks are delivered**
*For any* configured webhook and triggering event, the System should make an HTTP POST request to the webhook URL with event data.
**Validates: Requirements 14.3**he Sysent,ng evggeritriok and igured webhoonfr any* ced**
*Fover are deliokshoWeboperty 51: **Prs 14.2**

rement Requialidates: code.
**Vstatus1 ith a 40 westct the requuld reje sho the Systemen),OAuth tok key or als (APIcredentition icathentd auut valihouest witPI reqFor any* Aced**
*s enforication i authenterty 50: APIop*

**Prs 14.1*uirementeq: R
**Validatesses.spond reeters, an, paramhe endpointbing tscriist de should extationenAPI documem, Openby the Systt exposed API endpoin* REST **
*For anycumentedIs are do: All APrty 49Propees

**Propertiegration 
### Int
ments 13.4**: Requirealidatesode.
**Vus cstata 429 d with  be rejecteoulduests shnt requeeqsubsshold, hre the tedsxce client e aed, when configurimiting lth ratent wiPI endpoiany* Aor 
*F**questscess rehrottles exiting t: Rate lim 48Property

**ts 13.3**quiremenlidates: Re
**Vatails.on deatioperamp, and ID, timesth user eated witcrould be ry sh log entudit adelete), ane, update, on (creat operatiiveity* sensFor anons**
*ure operati logs captty 47: Auditper
**Pro
 Properties Security**

###ents 12.5es: Requirem
**Validatring.e stohema befor scrveythe sust inthe data agalidate  vauldstem shoe, the Syy responstted survesubmir any* ed**
*Foa is validatey daturv46: S**Property s 12.3**

rement: Requialidatesver.
**Vto the serd nchronizeould be syd data shl queuered, als restovity innectin cofline, wheofe reated whil* data c
*For anyon**nectis on reconta syncfline day 45: Of*Propert

*.2**ments 12ireates: Requ.
**Validtampesre times and captu coordinatlude GPSshould incmage red ip, the stoe apbilhe mothrough tured oto capt ph
*For any***tatadaude mePhotos incly 44: *Properterties

*ropld Data P Fie## Mobile**

#ents 10.4es: Requirem
**Validatstoration.he rerecording t entry  versione a new and creatersion state selected va to thehe datrevert tshould e System  thon,ratiion opeestoratrsion rny* veor a**
*F versiones newreatn cestoratioersion roperty 43: V.3**

**Prents 10equirem: Rdates*Vali
* order.ogicalronolions in ch versall previousld return story shouhe histing tquehistory, reion ersy with vy* entitFor an*
* complete*history ision rsty 42: Veper

**Prots 10.2**quirementes: ReValidae.
**ngchahe o made t ID of whd the user an timestampclude ad inord shoulrecrsion the veon,  saved versiFor any**
*bution*ttris include a1: Versionerty 4
**Props 10.1**
uirementlidates: Req
**Vaonds). 5 sece.g., time (reasonable within a e databasesisted to thhould be perge schane data, the estimation to modificat* user 
*For anyto-saved**es are auty 40: Chang

**Proper Propertiesn Control Versio**

###ements 9.4equirValidates: Rit.
**rated ser who genetamp, and uation times name, generctje prod includeoulshdocument the d report, atener*For any* geadata**
include metorts 39: Repty per
**Pro**
.3s 9equirement Rdates:ValiCSV).
**, Excel, or mat (PDFested fore requput in thenerate outully gd successfoulSystem shest, the xport requa eor any* dat
*Fmats**e foripls multportport sup38: Exrty Prope
****
9.2ements  Requiridates:*Valtion.
*s secionand exclus, ionons sectptis, assumreakdownlude cost bt should inccumene dort, thstimate repoated cost ey* gener
*For ancomplete** are reports 37: Cost erty

**Propts 9.1** Requiremenates:lidunit.
**Va and e,lupe, vatyuantity lude qry and inctego by caoupedhould be gres sntitiort, all quaquantity repted erany* gen
*For aed** organizres atity report 36: Quanopertys

**Prpertieroeporting P### Rts 8.5**

menequire: Rteslida*Vamp.
*d timesta user ID antheclude  inhoulded comment se stor a user, th added bynnotation or acomment* For anyion**
*ttribute aents includmmperty 35: Co

**Pro 8.4**irementsidates: Requ
**Valstate.n the final ved ild be preseramp shouimesthe later tdit with tield, the ee data famhe s t edits totingflic con* two
*For anywrite-wins**s use last-lictnfrty 34: Co
**Prope

##
 Error Handling

### Error Classification

**Client Errors (4xx):**
- 400 Bad Request: Invalid input data or malformed requests
- 401 Unauthorized: Missing or invalid authentication credentials
- 403 Forbidden: Valid credentials but insufficient permissions
- 404 Not Found: Requested resource does not exist
- 409 Conflict: Request conflicts with current state (e.g., duplicate email)
- 422 Unprocessable Entity: Validation errors on input data
- 429 Too Many Requests: Rate limit exceeded

**Server Errors (5xx):**
- 500 Internal Server Error: Unexpected server-side errors
- 502 Bad Gateway: Microservice communication failures
- 503 Service Unavailable: Service temporarily unavailable
- 504 Gateway Timeout: Microservice timeout

### Error Response Format

All API errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: any;          // Additional error context
    timestamp: string;      // ISO 8601 timestamp
    requestId: string;      // Unique request identifier for tracing
    path: string;           // API endpoint that generated the error
  };
}
```

### Error Handling Strategies

**Validation Errors:**
- Validate all input data at API gateway level
- Return detailed validation errors with field-level feedback
- Use JSON Schema or Zod for schema validation

**Database Errors:**
- Catch and log all database exceptions
- Return generic error messages to clients (don't expose internal details)
- Implement retry logic for transient failures
- Use database transactions for multi-step operations

**External Service Failures:**
- Implement circuit breaker pattern for microservice calls
- Provide fallback responses when services are unavailable
- Set appropriate timeouts for all external calls
- Log all external service failures for monitoring

**BIM Processing Errors:**
- Validate file format and size before processing
- Provide detailed error messages for unsupported features
- Implement partial processing with error reporting
- Store processing logs for debugging

**AI/ML Errors:**
- Handle model inference failures gracefully
- Provide confidence scores with all predictions
- Fall back to rule-based validation if ML models fail
- Log all AI service errors for model improvement



## Testing Strategy

### Overview

The testing strategy employs a dual approach combining traditional unit testing with property-based testing to ensure comprehensive coverage and correctness validation.

### Property-Based Testing

**Framework Selection:**
- **JavaScript/TypeScript**: fast-check library
- **Python**: Hypothesis library

**Configuration:**
- Minimum 100 iterations per property test
- Configurable seed for reproducible test runs
- Shrinking enabled to find minimal failing examples

**Property Test Requirements:**
- Each correctness property from the design document MUST be implemented as a property-based test
- Each property test MUST be tagged with a comment referencing the design document property
- Tag format: `// Feature: construct-ai-platform, Property X: [property description]`
- Property tests validate universal behaviors across generated inputs

**Example Property Test Structure:**

```typescript
import fc from 'fast-check';

// Feature: construct-ai-platform, Property 14: Waste factors are applied correctly
describe('Quantity Calculations', () => {
  it('should apply waste factors correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.1, max: 10000 }), // base quantity
        fc.float({ min: 0, max: 0.5 }),     // waste factor
        (baseQuantity, wasteFactor) => {
          const result = applyWasteFactor(baseQuantity, wasteFactor);
          const expected = baseQuantity * (1 + wasteFactor);
          expect(result).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

**Framework Selection:**
- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest for API testing
- **Python Services**: pytest

**Unit Test Coverage:**
- Service layer business logic
- Repository layer data access
- Utility functions and helpers
- API endpoint integration tests
- React component behavior

**Unit Test Guidelines:**
- Test specific examples and edge cases
- Test error conditions and boundary values
- Mock external dependencies (databases, APIs)
- Focus on single units of functionality
- Aim for 80%+ code coverage

**Example Unit Test Structure:**

```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should return JWT token for valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const result = await authService.login(credentials);
      
      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw error for invalid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };
      
      await expect(authService.login(credentials))
        .rejects
        .toThrow('Invalid credentials');
    });
  });
});
```

### Integration Testing

**Scope:**
- End-to-end API workflows
- Database integration
- Microservice communication
- Real-time collaboration features

**Tools:**
- Supertest for HTTP API testing
- Testcontainers for database testing
- Socket.io-client for WebSocket testing

**Integration Test Examples:**
- Complete user registration and login flow
- Project creation with team assignment
- BIM model upload and processing
- Quantity calculation and cost estimation workflow

### End-to-End Testing

**Framework**: Playwright or Cypress

**Coverage:**
- Critical user journeys
- Multi-step workflows
- Cross-browser compatibility
- Mobile responsiveness

**E2E Test Scenarios:**
- User creates project, uploads model, performs takeoff, generates report
- Multiple users collaborate on same estimate in real-time
- Mobile user captures field data and syncs to server

### Performance Testing

**Tools:**
- k6 for load testing
- Artillery for API stress testing
- Lighthouse for frontend performance

**Performance Targets:**
- API response time < 200ms (p95)
- Page load time < 2 seconds
- Support 1000 concurrent users
- Process 1GB BIM models without crashes

### Security Testing

**Approaches:**
- OWASP ZAP for vulnerability scanning
- Manual penetration testing
- Dependency vulnerability scanning (npm audit, Snyk)
- SQL injection and XSS testing

### Test Automation

**CI/CD Integration:**
- Run unit and property tests on every commit
- Run integration tests on pull requests
- Run E2E tests before deployment
- Generate code coverage reports
- Fail builds on test failures or coverage drops

**Test Organization:**
```
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── property/
│   ├── auth.property.test.ts
│   ├── quantities.property.test.ts
│   └── costs.property.test.ts
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    ├── user-workflows/
    └── collaboration/
```



## Deployment Architecture

### Infrastructure Overview

**Cloud Provider**: AWS (can be adapted for Azure or GCP)

**Architecture Pattern**: Microservices with containerization

### Container Strategy

**Docker Images:**
- `construct-ai-api`: Node.js API Gateway and services
- `construct-ai-bim`: Python BIM processing microservice
- `construct-ai-ai`: Python AI/ML microservice
- `construct-ai-web`: React frontend (served via Nginx)

**Container Orchestration**: Kubernetes (EKS on AWS)

### Kubernetes Architecture

```yaml
# Simplified K8s structure
Namespaces:
  - production
  - staging
  - development

Deployments:
  - api-gateway (3 replicas)
  - auth-service (2 replicas)
  - project-service (2 replicas)
  - quantity-service (3 replicas)
  - cost-service (2 replicas)
  - bim-processor (2 replicas)
  - ai-service (2 replicas)
  - web-frontend (3 replicas)

Services:
  - LoadBalancer for API Gateway
  - ClusterIP for internal services
  - Ingress for routing

StatefulSets:
  - PostgreSQL (with persistent volumes)
  - Redis (with persistent volumes)
```

### Database Strategy

**Primary Database**: Amazon RDS PostgreSQL with Multi-AZ deployment

**Configuration:**
- Master-replica setup for read scaling
- Automated backups with 30-day retention
- Point-in-time recovery enabled
- PostGIS extension for spatial data

**Caching Layer**: Amazon ElastiCache for Redis

**Configuration:**
- Redis Cluster mode for high availability
- Automatic failover
- In-memory data persistence

**File Storage**: Amazon S3

**Usage:**
- BIM model files
- Generated reports
- User-uploaded images
- Backup archives

### Networking

**VPC Configuration:**
- Public subnets for load balancers
- Private subnets for application servers
- Isolated subnets for databases
- NAT Gateway for outbound traffic

**Security Groups:**
- API Gateway: Allow HTTPS (443) from internet
- Application servers: Allow traffic from API Gateway only
- Databases: Allow traffic from application servers only
- Redis: Allow traffic from application servers only

### Load Balancing

**Application Load Balancer (ALB):**
- SSL/TLS termination
- Path-based routing
- Health checks for all services
- WebSocket support for real-time features

**Auto Scaling:**
- Horizontal pod autoscaling based on CPU/memory
- Target: 70% CPU utilization
- Min replicas: 2, Max replicas: 10

### Monitoring and Logging

**Application Monitoring:**
- Prometheus for metrics collection
- Grafana for visualization
- Custom dashboards for business metrics

**Logging:**
- Centralized logging with ELK Stack (Elasticsearch, Logstash, Kibana)
- Structured JSON logging
- Log retention: 90 days

**Alerting:**
- PagerDuty integration for critical alerts
- Slack notifications for warnings
- Email alerts for daily summaries

**Key Metrics:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Cache hit rates
- Active user count
- BIM processing queue length
- AI inference latency

### CI/CD Pipeline

**Source Control**: GitHub

**CI/CD Tool**: GitHub Actions

**Pipeline Stages:**

1. **Build Stage:**
   - Checkout code
   - Install dependencies
   - Run linters (ESLint, Prettier)
   - Build TypeScript/React applications
   - Build Docker images

2. **Test Stage:**
   - Run unit tests
   - Run property-based tests
   - Run integration tests
   - Generate coverage reports
   - Security scanning (Snyk, Trivy)

3. **Deploy Stage (Staging):**
   - Push Docker images to ECR
   - Update Kubernetes manifests
   - Apply database migrations
   - Deploy to staging environment
   - Run smoke tests

4. **Deploy Stage (Production):**
   - Manual approval required
   - Blue-green deployment strategy
   - Deploy to production
   - Run E2E tests
   - Monitor for errors
   - Automatic rollback on failure

### Disaster Recovery

**Backup Strategy:**
- Database: Automated daily backups, 30-day retention
- S3: Cross-region replication enabled
- Configuration: Version controlled in Git

**Recovery Objectives:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour

**Disaster Recovery Plan:**
1. Restore database from latest backup
2. Deploy application from Docker images
3. Restore S3 data from replica region
4. Update DNS to point to DR environment
5. Verify all services operational

### Security Measures

**Network Security:**
- All traffic encrypted with TLS 1.3
- WAF (Web Application Firewall) for DDoS protection
- VPC isolation for sensitive resources

**Application Security:**
- JWT tokens with short expiration
- API rate limiting per user/IP
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection (Content Security Policy)

**Data Security:**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Database connection encryption
- Secrets management (AWS Secrets Manager)

**Access Control:**
- IAM roles for AWS resources
- RBAC in Kubernetes
- Principle of least privilege
- MFA for production access

### Cost Optimization

**Strategies:**
- Use spot instances for non-critical workloads
- Auto-scaling to match demand
- S3 lifecycle policies for old data
- Reserved instances for baseline capacity
- CloudWatch cost anomaly detection

**Estimated Monthly Costs (1000 active users):**
- Compute (EKS): $800
- Database (RDS): $400
- Cache (ElastiCache): $150
- Storage (S3): $100
- Data Transfer: $200
- Monitoring: $100
- **Total**: ~$1,750/month

