/**
 * FilterBuilder component - adapted from eagle-utils/example
 * Simplified for symlink plugin use case
 */

import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type FilterMethod =
  | 'is' | 'isNot' | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'matches' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'isEmpty' | 'isNotEmpty' | 'includesAny' | 'includesAll' | 'excludesAny' | 'excludesAll';

export type FilterProperty =
  | 'id' | 'name' | 'ext' | 'url' | 'annotation' | 'tags' | 'folders'
  | 'star' | 'width' | 'height' | 'size' | 'importedAt' | 'modifiedAt' | 'isDeleted';

export interface FilterRule {
  property: FilterProperty;
  method: FilterMethod;
  value?: unknown;
}

export interface FilterCondition {
  rules: FilterRule[];
  match: 'AND' | 'OR';
}

export interface ItemFilter {
  conditions: FilterCondition[];
  match: 'AND' | 'OR';
}

// ============================================================================
// Constants
// ============================================================================

const PROPERTIES: { value: FilterProperty; label: string; type: 'string' | 'number' | 'array' | 'boolean' }[] = [
  { value: 'name', label: 'Name', type: 'string' },
  { value: 'ext', label: 'Extension', type: 'string' },
  { value: 'tags', label: 'Tags', type: 'array' },
  { value: 'annotation', label: 'Annotation', type: 'string' },
  { value: 'star', label: 'Rating', type: 'number' },
  { value: 'width', label: 'Width', type: 'number' },
  { value: 'height', label: 'Height', type: 'number' },
  { value: 'size', label: 'Size (bytes)', type: 'number' },
];

const STRING_METHODS: { value: FilterMethod; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'isNot', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'notContains', label: 'does not contain' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
];

const NUMBER_METHODS: { value: FilterMethod; label: string }[] = [
  { value: 'is', label: 'equals' },
  { value: 'isNot', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
];

const ARRAY_METHODS: { value: FilterMethod; label: string }[] = [
  { value: 'includesAny', label: 'includes any of' },
  { value: 'includesAll', label: 'includes all of' },
  { value: 'excludesAny', label: 'excludes any of' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
];

function getMethodsForType(type: string) {
  switch (type) {
    case 'string': return STRING_METHODS;
    case 'number': return NUMBER_METHODS;
    case 'array': return ARRAY_METHODS;
    default: return STRING_METHODS;
  }
}

// ============================================================================
// Icons
// ============================================================================

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

// ============================================================================
// Rule Editor
// ============================================================================

interface RuleEditorProps {
  rule: FilterRule;
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
  isOnly: boolean;
}

function RuleEditor({ rule, onChange, onRemove, isOnly }: RuleEditorProps) {
  const propertyDef = PROPERTIES.find(p => p.value === rule.property) || PROPERTIES[0];
  const methods = getMethodsForType(propertyDef.type);
  const needsValue = !['isEmpty', 'isNotEmpty'].includes(rule.method);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-base-200 rounded-lg">
      {/* Property Select */}
      <select
        className="select select-sm select-bordered flex-shrink-0"
        value={rule.property}
        onChange={(e) => {
          const prop = e.target.value as FilterProperty;
          const propDef = PROPERTIES.find(p => p.value === prop)!;
          const newMethods = getMethodsForType(propDef.type);
          onChange({
            property: prop,
            method: newMethods[0].value,
            value: propDef.type === 'array' ? [] : '',
          });
        }}
      >
        {PROPERTIES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Method Select */}
      <select
        className="select select-sm select-bordered flex-shrink-0"
        value={rule.method}
        onChange={(e) => onChange({ ...rule, method: e.target.value as FilterMethod })}
      >
        {methods.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {/* Value Input */}
      {needsValue && (
        propertyDef.type === 'array' ? (
          <input
            type="text"
            className="input input-sm input-bordered flex-1 min-w-[150px]"
            placeholder="value1, value2, ..."
            value={Array.isArray(rule.value) ? rule.value.join(', ') : ''}
            onChange={(e) => onChange({
              ...rule,
              value: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
            })}
          />
        ) : propertyDef.type === 'number' ? (
          <input
            type="number"
            className="input input-sm input-bordered w-24"
            placeholder="value"
            value={(rule.value as number) || ''}
            onChange={(e) => onChange({ ...rule, value: Number(e.target.value) })}
          />
        ) : (
          <input
            type="text"
            className="input input-sm input-bordered flex-1 min-w-[150px]"
            placeholder="value"
            value={(rule.value as string) || ''}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
          />
        )
      )}

      {/* Remove Button */}
      <button
        className="btn btn-ghost btn-sm btn-square text-error"
        onClick={onRemove}
        disabled={isOnly}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ============================================================================
// Condition Editor
// ============================================================================

interface ConditionEditorProps {
  condition: FilterCondition;
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
  isOnly: boolean;
  conditionIndex: number;
}

function ConditionEditor({ condition, onChange, onRemove, isOnly, conditionIndex }: ConditionEditorProps) {
  const addRule = () => {
    onChange({
      ...condition,
      rules: [...condition.rules, { property: 'name', method: 'contains', value: '' }],
    });
  };

  const updateRule = (index: number, rule: FilterRule) => {
    const newRules = [...condition.rules];
    newRules[index] = rule;
    onChange({ ...condition, rules: newRules });
  };

  const removeRule = (index: number) => {
    onChange({ ...condition, rules: condition.rules.filter((_, i) => i !== index) });
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary">Condition {conditionIndex + 1}</span>
            <select
              className="select select-xs select-bordered"
              value={condition.match}
              onChange={(e) => onChange({ ...condition, match: e.target.value as 'AND' | 'OR' })}
            >
              <option value="AND">Match ALL rules</option>
              <option value="OR">Match ANY rule</option>
            </select>
          </div>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={onRemove}
            disabled={isOnly}
          >
            Remove
          </button>
        </div>

        {/* Rules */}
        <div className="space-y-2">
          {condition.rules.map((rule, index) => (
            <div key={index} className="flex items-start gap-2">
              {index > 0 && (
                <span className="text-xs font-semibold text-primary pt-4 w-8">
                  {condition.match}
                </span>
              )}
              <div className="flex-1">
                <RuleEditor
                  rule={rule}
                  onChange={(r) => updateRule(index, r)}
                  onRemove={() => removeRule(index)}
                  isOnly={condition.rules.length === 1}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Rule */}
        <button className="btn btn-ghost btn-sm gap-1 mt-2" onClick={addRule}>
          <PlusIcon /> Add Rule
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Filter Builder
// ============================================================================

interface FilterBuilderProps {
  filter: ItemFilter;
  onChange: (filter: ItemFilter) => void;
}

export function FilterBuilder({ filter, onChange }: FilterBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const addCondition = () => {
    onChange({
      ...filter,
      conditions: [
        ...filter.conditions,
        { rules: [{ property: 'name', method: 'contains', value: '' }], match: 'AND' },
      ],
    });
  };

  const updateCondition = (index: number, condition: FilterCondition) => {
    const newConditions = [...filter.conditions];
    newConditions[index] = condition;
    onChange({ ...filter, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onChange({ ...filter, conditions: filter.conditions.filter((_, i) => i !== index) });
  };

  const clearFilter = () => {
    onChange({ conditions: [], match: 'AND' });
  };

  const hasFilter = filter.conditions.length > 0;

  return (
    <div className="bg-base-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-base-300 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FilterIcon />
          <span className="font-semibold">Filter Items</span>
          {hasFilter && (
            <span className="badge badge-primary">
              {filter.conditions.length} condition{filter.conditions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-base-300">
          {/* Condition Match */}
          {filter.conditions.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <span>Items matching</span>
              <select
                className="select select-sm select-bordered"
                value={filter.match}
                onChange={(e) => onChange({ ...filter, match: e.target.value as 'AND' | 'OR' })}
              >
                <option value="AND">ALL conditions</option>
                <option value="OR">ANY condition</option>
              </select>
            </div>
          )}

          {/* Conditions */}
          <div className="space-y-3">
            {filter.conditions.map((condition, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-base-300" />
                    <span className="text-xs font-bold text-secondary">{filter.match}</span>
                    <div className="flex-1 h-px bg-base-300" />
                  </div>
                )}
                <ConditionEditor
                  condition={condition}
                  onChange={(c) => updateCondition(index, c)}
                  onRemove={() => removeCondition(index)}
                  isOnly={filter.conditions.length === 1}
                  conditionIndex={index}
                />
              </div>
            ))}
          </div>

          {/* No filter message */}
          {!hasFilter && (
            <p className="text-sm text-base-content/60 text-center py-2">
              No filter conditions. All items will be synced.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button className="btn btn-primary btn-sm gap-1" onClick={addCondition}>
              <PlusIcon /> Add Condition
            </button>
            {hasFilter && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilter}>
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useFilterBuilder(): [ItemFilter, (filter: ItemFilter) => void, () => void] {
  const [filter, setFilter] = useState<ItemFilter>({ conditions: [], match: 'AND' });
  
  const clearFilter = useCallback(() => {
    setFilter({ conditions: [], match: 'AND' });
  }, []);

  return [filter, setFilter, clearFilter];
}
