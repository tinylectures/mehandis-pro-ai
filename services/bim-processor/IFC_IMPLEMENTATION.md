# IFC File Processing Implementation

## Overview

This document describes the implementation of IFC (Industry Foundation Classes) file processing for the BIM processor microservice.

## Implementation Details

### IFC Processor (`processors/ifc_processor.py`)

The IFC processor provides comprehensive support for parsing and extracting data from IFC files using the IfcOpenShell library.

#### Key Features

1. **File Validation**
   - Validates IFC file format and structure
   - Checks for valid IFC schema
   - Handles missing dependencies gracefully

2. **Element Extraction**
   - Extracts building elements (walls, floors, columns, beams, etc.)
   - Processes element geometry using IfcOpenShell
   - Converts IFC geometry to internal format

3. **Property Extraction**
   - Extracts basic element properties (Name, Description, ObjectType, Tag)
   - Processes IFC property sets (IfcPropertySet)
   - Extracts quantity information (IfcElementQuantity)

4. **Geometry Processing**
   - Converts IFC geometry to vertices and faces
   - Calculates bounding boxes for elements
   - Supports both numpy and manual calculation methods

5. **Material Handling**
   - Extracts material associations
   - Handles material layers and lists
   - Stores material IDs for reference

6. **Spatial Structure**
   - Determines element levels/storeys
   - Extracts building hierarchy information

7. **Project Information**
   - Extracts project metadata
   - Retrieves application and version information
   - Captures author and organization details

#### Supported IFC Element Types

The processor maps IFC entity types to internal categories:

- `IfcWall`, `IfcWallStandardCase` → Wall
- `IfcSlab` → Floor
- `IfcColumn` → Column
- `IfcBeam` → Beam
- `IfcRoof` → Roof
- `IfcDoor` → Door
- `IfcWindow` → Window
- `IfcStair`, `IfcStairFlight` → Stair
- `IfcRailing` → Railing
- `IfcFooting`, `IfcPile` → Foundation

### API Endpoint

**POST** `/api/v1/process/ifc`

Processes an IFC file and extracts elements.

**Request Parameters:**
- `file_path` (string): Path to the IFC file
- `model_id` (string): ID of the BIM model
- `token` (header): JWT authentication token

**Response:**
```json
{
  "status": "success",
  "model_id": "model-123",
  "elements_count": 150,
  "processing_time_seconds": 2.45,
  "software_version": "Revit 2024 (IFC4)",
  "project_info": {
    "schema": "IFC4",
    "project_name": "Sample Building",
    "application": "Revit",
    "version": "2024"
  },
  "elements": [
    {
      "id": "uuid",
      "external_id": "2O2Fr$t4X7Zf8NOew3FLOH",
      "category": "wall",
      "family_name": "IfcWall",
      "type_name": "Basic Wall",
      "level": "Level 1",
      "properties": {...}
    }
  ]
}
```

## Dependencies

- **ifcopenshell** (>=0.7.0): IFC file parsing and geometry extraction
- **numpy** (>=1.26.0): Efficient numerical operations for geometry

## Testing

Comprehensive test suite in `processors/test_ifc_processor.py`:

- Unit tests for all processor methods
- Integration tests for file processing workflow
- Geometry processing tests
- Error handling tests
- Tests handle missing dependencies gracefully

Run tests:
```bash
pytest services/bim-processor/processors/test_ifc_processor.py -v
```

## Error Handling

The processor includes robust error handling:

1. **Missing Dependencies**: Gracefully handles missing ifcopenshell library
2. **Invalid Files**: Validates file format and provides clear error messages
3. **Geometry Errors**: Continues processing even if individual elements fail
4. **Property Extraction**: Handles missing or malformed properties

## Usage Example

```python
from processors.ifc_processor import IFCProcessor

processor = IFCProcessor()

# Validate file
is_valid, error = processor.validate_file("model.ifc")
if not is_valid:
    print(f"Validation failed: {error}")
    
# Extract elements
elements = processor.extract_elements("model.ifc", "model-123")
print(f"Extracted {len(elements)} elements")

# Get project info
project_info = processor.get_project_info("model.ifc")
print(f"Project: {project_info['project_name']}")
```

## Future Enhancements

Potential improvements for future iterations:

1. Support for additional IFC element types
2. Advanced geometry processing (curved surfaces, complex shapes)
3. Relationship extraction (connections, dependencies)
4. Performance optimization for large models
5. Incremental processing for streaming large files
6. Support for IFC4X3 and newer schemas

## Requirements Validation

This implementation satisfies **Requirement 3.2** from the design document:

> "WHEN a user uploads an IFC file THEN the System SHALL parse the file and extract geometric and property data"

The processor successfully:
- ✅ Parses IFC files using IfcOpenShell
- ✅ Extracts element geometry (vertices, faces, bounding boxes)
- ✅ Extracts element properties (property sets, quantities)
- ✅ Converts IFC geometry to internal format
- ✅ Handles errors gracefully
- ✅ Provides comprehensive test coverage
