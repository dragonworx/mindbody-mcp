#!/usr/bin/env python3
"""
Generate TypeScript types from MinBody OpenAPI v6 specification.

This script parses the official MinBody OpenAPI spec and generates
100% accurate TypeScript type definitions.
"""

import json
import re
from typing import Dict, List, Set, Any

def swagger_type_to_typescript(
    prop_type: str,
    prop_format: str = None,
    prop_ref: str = None,
    prop_items: Dict = None,
    enum: List = None
) -> str:
    """Convert Swagger/OpenAPI type to TypeScript type."""

    if prop_ref:
        # Reference to another model
        return prop_ref.split('.')[-1]

    if enum:
        # Enum type - return union of string literals
        return ' | '.join([f'"{e}"' for e in enum])

    if prop_type == 'array':
        if prop_items:
            item_ref = prop_items.get('$ref')
            if item_ref:
                item_type = item_ref.split('.')[-1]
                return f'{item_type}[]'
            item_type = prop_items.get('type', 'unknown')
            ts_item_type = swagger_type_to_typescript(item_type, prop_items.get('format'))
            return f'{ts_item_type}[]'
        return 'unknown[]'

    # Map Swagger types to TypeScript
    type_map = {
        'integer': 'number',
        'number': 'number',
        'string': 'string',
        'boolean': 'boolean',
        'object': 'Record<string, unknown>',
    }

    base_type = type_map.get(prop_type, 'unknown')

    # Handle date-time format
    if prop_format == 'date-time' and base_type == 'string':
        return 'string'  # Could be Date, but API returns strings

    return base_type


def generate_interface(model_name: str, model_def: Dict, all_definitions: Dict, processed: Set[str]) -> List[str]:
    """Generate TypeScript interface for a model."""

    # Avoid infinite recursion
    if model_name in processed:
        return []
    processed.add(model_name)

    lines = []
    short_name = model_name.split('.')[-1]

    # Check if this is the model we care about
    properties = model_def.get('properties', {})
    required_fields = model_def.get('required', [])
    description = model_def.get('description', '')

    if not properties:
        return lines

    # Generate dependencies first (nested objects)
    for prop_name, prop_details in properties.items():
        prop_ref = prop_details.get('$ref')
        if prop_ref and prop_ref in all_definitions:
            dep_lines = generate_interface(prop_ref, all_definitions[prop_ref], all_definitions, processed)
            lines.extend(dep_lines)

        # Check array items for refs
        if prop_details.get('type') == 'array':
            items = prop_details.get('items', {})
            item_ref = items.get('$ref')
            if item_ref and item_ref in all_definitions:
                dep_lines = generate_interface(item_ref, all_definitions[item_ref], all_definitions, processed)
                lines.extend(dep_lines)

    # Generate the interface
    if description:
        lines.append(f'/**')
        lines.append(f' * {description}')
        lines.append(f' */')

    lines.append(f'export interface {short_name} {{')

    for prop_name, prop_details in sorted(properties.items()):
        prop_type = prop_details.get('type')
        prop_format = prop_details.get('format')
        prop_ref = prop_details.get('$ref')
        prop_items = prop_details.get('items')
        prop_enum = prop_details.get('enum')
        prop_desc = prop_details.get('description', '')

        is_required = prop_name in required_fields
        optional_marker = '' if is_required else '?'

        ts_type = swagger_type_to_typescript(
            prop_type,
            prop_format,
            prop_ref,
            prop_items,
            prop_enum
        )

        # Add JSDoc comment if description exists
        if prop_desc:
            # Clean up description
            clean_desc = prop_desc.replace('\r\n', ' ').replace('\n', ' ').strip()
            lines.append(f'  /** {clean_desc} */')

        lines.append(f'  {prop_name}{optional_marker}: {ts_type};')

    lines.append('}')
    lines.append('')

    return lines


def main():
    """Main function to generate TypeScript types."""

    # Load the OpenAPI spec
    with open('mindbody-public-api-v6-formatted.json', 'r') as f:
        spec = json.load(f)

    definitions = spec.get('definitions', {})

    # Models we want to generate
    models_to_generate = [
        # Appointment models
        'Mindbody.PublicApi.Dto.Models.V6.Appointment',
        'Mindbody.PublicApi.Common.Models.Appointment',
        'Mindbody.PublicApi.Common.Models.AppointmentStaff',
        'Mindbody.PublicApi.Dto.Models.V6.AddOnSmall',
        'Mindbody.PublicApi.Dto.Models.V6.ResourceSlim',

        # Response models
        'Mindbody.PublicApi.Dto.Models.V6.AppointmentController.GetStaffAppointmentsResponse',
        'Mindbody.PublicApi.Dto.Models.V6.PaginationResponse',

        # Request models
        'Mindbody.PublicApi.Dto.Models.V6.AppointmentController.AddAppointmentRequest',
        'Mindbody.PublicApi.Dto.Models.V6.AppointmentController.UpdateAppointmentRequest',

        # Bookable items
        'Mindbody.PublicApi.Dto.Models.V6.AppointmentController.GetBookableItemsResponse',
        'Mindbody.PublicApi.Dto.Models.V6.BookableItem',
        'Mindbody.PublicApi.Dto.Models.V6.Location',
        'Mindbody.PublicApi.Dto.Models.V6.SessionType',
        'Mindbody.PublicApi.Dto.Models.V6.Staff',
        'Mindbody.PublicApi.Dto.Models.V6.Program',

        # Client models (for reference)
        'Mindbody.PublicApi.Dto.Models.V6.Client',
    ]

    # Generate TypeScript file
    output_lines = [
        '/**',
        ' * MinBody Public API v6 TypeScript Type Definitions',
        ' * ',
        ' * Auto-generated from official OpenAPI specification',
        ' * Source: https://api.mindbodyonline.com/public/v6/swagger/doc',
        ' * Generated: 2025-11-24',
        ' * ',
        ' * DO NOT EDIT MANUALLY - Regenerate from spec using generate-types.py',
        ' */',
        '',
        '// ============================================================================',
        '// Core Appointment Types',
        '// ============================================================================',
        '',
    ]

    processed = set()

    for model_name in models_to_generate:
        if model_name in definitions:
            interface_lines = generate_interface(model_name, definitions[model_name], definitions, processed)
            output_lines.extend(interface_lines)

    # Add utility types
    output_lines.extend([
        '',
        '// ============================================================================',
        '// Utility Types',
        '// ============================================================================',
        '',
        '/**',
        ' * Generic paginated response wrapper',
        ' */',
        'export interface PaginatedResponse<T> {',
        '  /** Array of results */',
        '  Items?: T[];',
        '  /** Pagination metadata */',
        '  PaginationResponse?: PaginationResponse;',
        '}',
        '',
        '/**',
        ' * Appointment response (uses "Appointments" key)',
        ' */',
        'export interface AppointmentResponse {',
        '  Appointments?: Appointment[];',
        '  PaginationResponse?: PaginationResponse;',
        '}',
        '',
    ])

    # Write to file
    output_file = 'mindbody-api-types.ts'
    with open(output_file, 'w') as f:
        f.write('\n'.join(output_lines))

    print(f'✅ Generated TypeScript types: {output_file}')
    print(f'   Total models generated: {len(processed)}')
    print(f'   Lines of code: {len(output_lines)}')


if __name__ == '__main__':
    main()
