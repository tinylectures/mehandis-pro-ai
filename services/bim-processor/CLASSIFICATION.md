# Element Classification

## Overview

The BIM Processor service includes comprehensive element classification capabilities that automatically categorize BIM elements into standard categories. This feature supports both IFC and Revit file formats and provides multiple classification strategies.

## Supported Categories

The system classifies elements into the following standard categories:

- **Wall**: Vertical building elements including walls, partitions, and curtain walls
- **Floor**: Horizontal building elements including floors, slabs, and decks
- **Column**: Vertical structural support elements
- **Beam**: Horizontal structural support elements including beams, girders, and joists
- **Roof**: Roof elements and roofing systems
- **Door**: Door elements and openings
- **Window**: Window elements and glazing
- **Stair**: Stair elements including flights and landings
- **Railing**: Railing, handrail, and guardrail elements
- **Foundation**: Foundation elements including footings, piles, and piers
- **Slab**: Slab elements
- **Other**: Other or unclassified elements

## Classification Strategies

The classifier uses multiple strategies to determine element categories:

### 1. Type-Based Classification (Highest Confidence: 1.0)

Direct mapping of IFC entity types or Revit category IDs to standard categories.

**IFC Examples:**
- `IfcWall` → Wall
- `IfcColumn` → Column
- `IfcBeam` → Beam

**Revit Examples:**
- Category ID `-2000011` → Wall
- Category ID `-2000100` → Column
- Category ID `-2000012` → Beam

### 2. Property-Based Classification (Medium Confidence: 0.7)

Analyzes element properties to identify category keywords.

**Example:**
```json
{
  "properties": {
    "Description": "Load bearing wall element",
    "Function": "Structural"
  }
}
```
The keyword "wall" in the description would classify this as a Wall element.

### 3. Name-Based Classification (Lower Confidence: 0.5)

Pattern matching on family names, type names, or category names.

**Examples:**
- "Basic Wall" → Wall
- "Steel Column" → Column
- "Concrete Floor Slab" → Floor

## API Endpoints

### Classify Element

Classify a single BIM element into a standard category.

**Endpoint:** `POST /api/v1/classify/element`

**Request Body:**
```json
{
  "element_type": "IfcWall",
  "file_type": "ifc",
  "category_id": null,
  "category_name": null,
  "properties": {},
  "family_name": null
}
```

**Response:**
```json
{
  "status": "success",
  "element_type": "IfcWall",
  "file_type": "ifc",
  "category": "wall",
  "confidence": 1.0,
  "classification_method": "ifc_type_mapping",
  "metadata": {
    "category": "wall",
    "classification_method": "ifc_type_mapping",
    "confidence": 1.0
  }
}
```

### Get Supported Categories

Retrieve all supported element categories with descriptions.

**Endpoint:** `GET /api/v1/classify/categories`

**Response:**
```json
{
  "status": "success",
  "categories": [
    {
      "value": "wall",
      "name": "WALL",
      "description": "Vertical building elements including walls, partitions, and curtain walls"
    },
    {
      "value": "floor",
      "name": "FLOOR",
      "description": "Horizontal building elements including floors, slabs, and decks"
    }
    // ... more categories
  ]
}
```

## Integration with File Processing

Classification is automatically performed during BIM file processing:

### IFC File Processing

When processing IFC files via `POST /api/v1/process/ifc`, each extracted element includes its classified category:

```json
{
  "status": "success",
  "model_id": "model-123",
  "elements_count": 150,
  "elements": [
    {
      "id": "elem-1",
      "external_id": "2O2Fr$t4X7Zf8NOew3FLOH",
      "category": "wall",
      "family_name": "IfcWall",
      "type_name": "Basic Wall",
      "level": "Level 1",
      "properties": {}
    }
  ]
}
```

### Revit File Processing

Similarly, Revit file processing via `POST /api/v1/process/revit` includes classification:

```json
{
  "status": "success",
  "model_id": "model-456",
  "elements_count": 200,
  "elements": [
    {
      "id": "elem-1",
      "external_id": "element_1",
      "category": "wall",
      "family_name": "Basic Wall",
      "type_name": "Generic - 200mm",
      "level": "Level 1",
      "properties": {}
    }
  ]
}
```

## Classification Confidence

Each classification includes a confidence score indicating the reliability of the classification:

- **1.0**: Direct type or category ID mapping (highest confidence)
- **0.7**: Property-based classification (medium confidence)
- **0.5**: Name-based classification (lower confidence)

## Usage Examples

### Example 1: Classify IFC Element

```python
import requests

response = requests.post(
    "http://localhost:8001/api/v1/classify/element",
    json={
        "element_type": "IfcColumn",
        "file_type": "ifc"
    },
    headers={"Authorization": "Bearer your-token"}
)

result = response.json()
print(f"Category: {result['category']}")
print(f"Confidence: {result['confidence']}")
```

### Example 2: Classify Revit Element with Category ID

```python
import requests

response = requests.post(
    "http://localhost:8001/api/v1/classify/element",
    json={
        "element_type": "Wall",
        "file_type": "revit",
        "category_id": -2000011
    },
    headers={"Authorization": "Bearer your-token"}
)

result = response.json()
print(f"Category: {result['category']}")
```

### Example 3: Classify with Properties

```python
import requests

response = requests.post(
    "http://localhost:8001/api/v1/classify/element",
    json={
        "element_type": "IfcBuildingElementProxy",
        "file_type": "ifc",
        "properties": {
            "Description": "Structural beam element",
            "Function": "Load bearing"
        }
    },
    headers={"Authorization": "Bearer your-token"}
)

result = response.json()
print(f"Category: {result['category']}")
print(f"Method: {result['classification_method']}")
```

## Implementation Details

### ElementClassifier Class

The `ElementClassifier` class in `processors/element_classifier.py` provides the core classification logic:

- **Singleton Pattern**: Use `get_classifier()` to get the global instance
- **Caching**: Classification results are cached for performance
- **Extensible**: Easy to add new categories or classification rules

### Integration Points

1. **IFC Processor**: `processors/ifc_processor.py` uses the classifier in `_classify_element()`
2. **Revit Processor**: `processors/revit_processor.py` uses the classifier in `classify_element()`
3. **API Endpoints**: `main.py` exposes classification as a standalone service

## Testing

Comprehensive test coverage is provided in:

- `processors/test_element_classifier.py`: Unit tests for the classifier
- `test_classification_api.py`: API endpoint tests

Run tests with:
```bash
pytest services/bim-processor/processors/test_element_classifier.py -v
pytest services/bim-processor/test_classification_api.py -v
```

## Requirements Validation

This implementation satisfies **Requirement 3.3** from the design specification:

> **Requirement 3.3**: WHEN the System processes a BIM model THEN the System SHALL classify elements by category (walls, floors, columns, beams, etc.)

And validates **Property 11**:

> **Property 11: Element classification is complete**
> *For any* BIM model processed by the System, every element should be assigned to a valid category (wall, floor, column, beam, etc.).
