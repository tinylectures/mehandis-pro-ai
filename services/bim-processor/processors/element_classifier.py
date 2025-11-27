"""Element Classification Module

This module provides classification rules and logic for categorizing BIM elements
into standard categories. It supports both IFC and Revit element types and provides
a unified classification interface.

Classification Rules:
1. Primary classification based on element type/class name
2. Secondary classification based on element properties
3. Fallback to 'OTHER' category for unrecognized elements
"""
import logging
import re
from typing import Dict, Any, Optional, List
from models import ElementCategory

logger = logging.getLogger(__name__)


class ElementClassifier:
    """
    Classifier for BIM elements
    
    This classifier provides rules-based classification of BIM elements
    into standard categories. It supports multiple classification strategies:
    - Type-based classification (IFC types, Revit categories)
    - Property-based classification (analyzing element properties)
    - Name-based classification (pattern matching on names)
    """
    
    # IFC entity type to ElementCategory mapping
    IFC_TYPE_MAPPING = {
        "IfcWall": ElementCategory.WALL,
        "IfcWallStandardCase": ElementCategory.WALL,
        "IfcCurtainWall": ElementCategory.WALL,
        "IfcSlab": ElementCategory.FLOOR,
        "IfcSlabStandardCase": ElementCategory.FLOOR,
        "IfcColumn": ElementCategory.COLUMN,
        "IfcColumnStandardCase": ElementCategory.COLUMN,
        "IfcBeam": ElementCategory.BEAM,
        "IfcBeamStandardCase": ElementCategory.BEAM,
        "IfcRoof": ElementCategory.ROOF,
        "IfcDoor": ElementCategory.DOOR,
        "IfcDoorStandardCase": ElementCategory.DOOR,
        "IfcWindow": ElementCategory.WINDOW,
        "IfcWindowStandardCase": ElementCategory.WINDOW,
        "IfcStair": ElementCategory.STAIR,
        "IfcStairFlight": ElementCategory.STAIR,
        "IfcRailing": ElementCategory.RAILING,
        "IfcRailingType": ElementCategory.RAILING,
        "IfcFooting": ElementCategory.FOUNDATION,
        "IfcPile": ElementCategory.FOUNDATION,
        "IfcCovering": ElementCategory.OTHER,  # Could be ceiling, flooring, etc.
        "IfcBuildingElementProxy": ElementCategory.OTHER,
    }
    
    # Revit built-in category ID to ElementCategory mapping
    REVIT_CATEGORY_MAPPING = {
        -2000011: ElementCategory.WALL,
        -2000032: ElementCategory.FLOOR,
        -2000038: ElementCategory.SLAB,
        -2000100: ElementCategory.COLUMN,
        -2000012: ElementCategory.BEAM,
        -2000035: ElementCategory.ROOF,
        -2000023: ElementCategory.DOOR,
        -2000014: ElementCategory.WINDOW,
        -2000120: ElementCategory.STAIR,
        -2000126: ElementCategory.RAILING,
        -2000080: ElementCategory.FOUNDATION,
        -2000175: ElementCategory.FOUNDATION,  # Structural foundations
    }
    
    # Keywords for name-based classification
    CATEGORY_KEYWORDS = {
        ElementCategory.WALL: ["wall", "partition", "curtain"],
        ElementCategory.FLOOR: ["floor", "slab", "deck"],
        ElementCategory.COLUMN: ["column", "post", "pillar"],
        ElementCategory.BEAM: ["beam", "girder", "joist", "truss"],
        ElementCategory.ROOF: ["roof", "roofing"],
        ElementCategory.DOOR: ["door", "entry", "gate"],
        ElementCategory.WINDOW: ["window", "glazing"],
        ElementCategory.STAIR: ["stair", "step"],
        ElementCategory.RAILING: ["railing", "handrail", "guardrail", "balustrade"],
        ElementCategory.FOUNDATION: ["foundation", "footing", "pile", "pier"],
    }
    
    def __init__(self):
        self.logger = logger
        self._classification_cache: Dict[str, ElementCategory] = {}
    
    def classify_ifc_element(
        self,
        ifc_type: str,
        properties: Optional[Dict[str, Any]] = None,
        family_name: Optional[str] = None
    ) -> ElementCategory:
        """
        Classify an IFC element into a standard category
        
        Args:
            ifc_type: IFC entity type (e.g., "IfcWall")
            properties: Element properties dictionary
            family_name: Element family/type name
            
        Returns:
            ElementCategory enum value
        """
        # Check cache first
        cache_key = f"ifc:{ifc_type}:{family_name}"
        if cache_key in self._classification_cache:
            return self._classification_cache[cache_key]
        
        # Primary classification: direct type mapping
        category = self.IFC_TYPE_MAPPING.get(ifc_type)
        
        if category and category != ElementCategory.OTHER:
            self._classification_cache[cache_key] = category
            return category
        
        # Secondary classification: property-based
        if properties:
            category = self._classify_by_properties(properties)
            if category != ElementCategory.OTHER:
                self._classification_cache[cache_key] = category
                return category
        
        # Tertiary classification: name-based
        if family_name:
            category = self._classify_by_name(family_name)
            if category != ElementCategory.OTHER:
                self._classification_cache[cache_key] = category
                return category
        
        # Fallback to OTHER
        self.logger.debug(f"Could not classify IFC element type: {ifc_type}")
        self._classification_cache[cache_key] = ElementCategory.OTHER
        return ElementCategory.OTHER
    
    def classify_revit_element(
        self,
        category_id: Optional[int] = None,
        category_name: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        family_name: Optional[str] = None
    ) -> ElementCategory:
        """
        Classify a Revit element into a standard category
        
        Args:
            category_id: Revit built-in category ID
            category_name: Revit category name
            properties: Element properties dictionary
            family_name: Element family name
            
        Returns:
            ElementCategory enum value
        """
        # Check cache first
        cache_key = f"revit:{category_id}:{category_name}:{family_name}"
        if cache_key in self._classification_cache:
            return self._classification_cache[cache_key]
        
        # Primary classification: category ID mapping
        if category_id is not None:
            category = self.REVIT_CATEGORY_MAPPING.get(category_id)
            if category:
                self._classification_cache[cache_key] = category
                return category
        
        # Secondary classification: category name
        if category_name:
            category = self._classify_by_name(category_name)
            if category != ElementCategory.OTHER:
                self._classification_cache[cache_key] = category
                return category
        
        # Tertiary classification: property-based
        if properties:
            category = self._classify_by_properties(properties)
            if category != ElementCategory.OTHER:
                self._classification_cache[cache_key] = category
                return category
        
        # Quaternary classification: family name
        if family_name:
            category = self._classify_by_name(family_name)
            if category != ElementCategory.OTHER:
                self._classification_cache[cache_key] = category
                return category
        
        # Fallback to OTHER
        self.logger.debug(
            f"Could not classify Revit element: "
            f"category_id={category_id}, category_name={category_name}"
        )
        self._classification_cache[cache_key] = ElementCategory.OTHER
        return ElementCategory.OTHER
    
    def _classify_by_properties(self, properties: Dict[str, Any]) -> ElementCategory:
        """
        Classify element based on its properties
        
        Args:
            properties: Element properties dictionary
            
        Returns:
            ElementCategory enum value
        """
        # Look for category hints in properties
        property_text = " ".join(str(v).lower() for v in properties.values() if v)
        
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in property_text:
                    return category
        
        return ElementCategory.OTHER
    
    def _classify_by_name(self, name: str) -> ElementCategory:
        """
        Classify element based on name pattern matching
        
        Args:
            name: Element name, family name, or type name
            
        Returns:
            ElementCategory enum value
        """
        if not name:
            return ElementCategory.OTHER
        
        name_lower = name.lower()
        
        # Check each category's keywords
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return category
        
        return ElementCategory.OTHER
    
    def get_classification_confidence(
        self,
        element_type: str,
        category: ElementCategory,
        properties: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Calculate confidence score for a classification
        
        Args:
            element_type: Element type string (IFC or Revit category ID)
            category: Assigned category
            properties: Element properties
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        confidence = 0.0
        
        # High confidence for direct IFC type mapping
        if element_type in self.IFC_TYPE_MAPPING:
            if self.IFC_TYPE_MAPPING[element_type] == category:
                confidence = 1.0
        
        # High confidence for direct Revit category ID mapping
        if confidence < 1.0:
            try:
                # Check if element_type is a Revit category ID (negative integer)
                cat_id = int(element_type)
                if cat_id in self.REVIT_CATEGORY_MAPPING:
                    if self.REVIT_CATEGORY_MAPPING[cat_id] == category:
                        confidence = 1.0
            except (ValueError, TypeError):
                # Not a Revit category ID, continue with other checks
                pass
        
        # Medium confidence for property-based classification
        if properties and confidence < 1.0:
            property_category = self._classify_by_properties(properties)
            if property_category == category:
                confidence = max(confidence, 0.7)
        
        # Low confidence for name-based classification only
        if confidence == 0.0:
            confidence = 0.5
        
        return confidence
    
    def get_classification_metadata(
        self,
        category: ElementCategory,
        element_type: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get metadata about the classification
        
        Args:
            category: Assigned category
            element_type: Element type string
            properties: Element properties
            
        Returns:
            Dictionary with classification metadata
        """
        metadata = {
            "category": category.value,
            "classification_method": "unknown",
            "confidence": 0.0,
        }
        
        # Determine classification method
        if element_type:
            if element_type in self.IFC_TYPE_MAPPING:
                metadata["classification_method"] = "ifc_type_mapping"
                metadata["confidence"] = 1.0
            elif element_type.startswith("-"):  # Revit category ID
                try:
                    cat_id = int(element_type)
                    if cat_id in self.REVIT_CATEGORY_MAPPING:
                        metadata["classification_method"] = "revit_category_mapping"
                        metadata["confidence"] = 1.0
                except ValueError:
                    pass
        
        if metadata["confidence"] == 0.0 and properties:
            prop_category = self._classify_by_properties(properties)
            if prop_category == category:
                metadata["classification_method"] = "property_based"
                metadata["confidence"] = 0.7
        
        if metadata["confidence"] == 0.0:
            metadata["classification_method"] = "name_based"
            metadata["confidence"] = 0.5
        
        return metadata
    
    def get_supported_categories(self) -> List[ElementCategory]:
        """
        Get list of all supported element categories
        
        Returns:
            List of ElementCategory enum values
        """
        return list(ElementCategory)
    
    def clear_cache(self):
        """Clear the classification cache"""
        self._classification_cache.clear()
        self.logger.debug("Classification cache cleared")


# Global classifier instance
_classifier_instance: Optional[ElementClassifier] = None


def get_classifier() -> ElementClassifier:
    """
    Get the global ElementClassifier instance
    
    Returns:
        ElementClassifier instance
    """
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = ElementClassifier()
    return _classifier_instance
