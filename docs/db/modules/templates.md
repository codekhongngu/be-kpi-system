# Templates Module DB

## purpose
Store reporting template metadata and default rules.

## entities
- field_categories
- indicator_catalog
- form_templates
- form_template_attributes
- form_template_indicators
- form_template_cell_configs
- form_template_indicator_org_rules

## business rules
- template code unique.
- indicator code unique within template.
- cell configs only store overrides.
- template in_use cannot structurally mutate.

## relationships
- template 1:N attributes/indicators/cell_configs/default_rules.
- attribute and indicator support parent tree.

## state machine
- template_status: DRAFT -> READY -> IN_USE -> ARCHIVED.

## permission scope
- `forms.manage` for all writes.

## query patterns
- fetch full template graph by template_id.
- list templates by status/type/period.
- resolve effective cell config at runtime.

## index strategy
- form_templates(template_status,template_type).
- attributes(template_id,sort_order).
- indicators(template_id,sort_order), unique(template_id,code).
- cell_configs unique(template_id,indicator_id,attribute_id).

## async jobs/events
- emit `template.ready`, `template.archived`, `template.cloned`.

## anti-patterns tránh
- luu runtime submission values vào metadata tables.
- s?a template cu thay vì clone version m?i.
