import {
  type ReactiveAgentsConfig,
  type ReactiveAgentsTarget,
  StrategyModes,
} from '@shared/types/api/request/headers';

type Query = {
  [key: string]: unknown;
};

interface RouterContext {
  metadata?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

enum Operator {
  // Comparison Operators
  Equal = '$eq',
  NotEqual = '$ne',
  GreaterThan = '$gt',
  GreaterThanOrEqual = '$gte',
  LessThan = '$lt',
  LessThanOrEqual = '$lte',
  In = '$in',
  NotIn = '$nin',
  Regex = '$regex',

  // Logical Operators
  And = '$and',
  Or = '$or',
}

export class ConditionalRouter {
  private raConfig: ReactiveAgentsConfig;
  private context: RouterContext;

  constructor(config: ReactiveAgentsConfig, context: RouterContext) {
    this.raConfig = config;
    this.context = context;
    if (this.raConfig.strategy.mode !== StrategyModes.CONDITIONAL) {
      throw new Error('Unsupported strategy mode');
    }
  }

  resolveTarget(): ReactiveAgentsTarget {
    if (!this.raConfig.strategy.conditions) {
      throw new Error('No conditions passed in the query router');
    }

    for (const condition of this.raConfig.strategy.conditions) {
      if (this.evaluateQuery(condition.query)) {
        const cond = condition as unknown as Record<string, unknown>;
        const targetName = (cond.target as string) ?? (cond.then as string);
        return this.findTarget(targetName);
      }
    }

    // If no conditions matched and a default is specified, return the default target
    if (this.raConfig.strategy.default) {
      return this.findTarget(this.raConfig.strategy.default);
    }

    throw new Error('Query router did not resolve to any valid target');
  }

  private evaluateQuery(query: Query): boolean {
    for (const [key, value] of Object.entries(query)) {
      if (key === Operator.Or && Array.isArray(value)) {
        return value.some((subCondition: Query) =>
          this.evaluateQuery(subCondition),
        );
      }

      if (key === Operator.And && Array.isArray(value)) {
        return value.every((subCondition: Query) =>
          this.evaluateQuery(subCondition),
        );
      }

      const contextValue = this.getContextValue(key);

      if (typeof value === 'object' && value !== null) {
        if (!this.evaluateOperator(value, contextValue)) {
          return false;
        }
      } else if (contextValue !== value) {
        return false;
      }
    }

    return true;
  }

  private evaluateOperator(operator: object, value: unknown): boolean {
    for (const [op, compareValue] of Object.entries(operator)) {
      switch (op) {
        case Operator.Equal:
          if (value !== compareValue) return false;
          break;
        case Operator.NotEqual:
          if (value === compareValue) return false;
          break;
        case Operator.GreaterThan:
          if (
            !(parseFloat(value as string) > parseFloat(compareValue as string))
          )
            return false;
          break;
        case Operator.GreaterThanOrEqual:
          if (
            !(parseFloat(value as string) >= parseFloat(compareValue as string))
          )
            return false;
          break;
        case Operator.LessThan:
          if (
            !(parseFloat(value as string) < parseFloat(compareValue as string))
          )
            return false;
          break;
        case Operator.LessThanOrEqual:
          if (
            !(parseFloat(value as string) <= parseFloat(compareValue as string))
          )
            return false;
          break;
        case Operator.In:
          if (!Array.isArray(compareValue) || !compareValue.includes(value))
            return false;
          break;
        case Operator.NotIn:
          if (!Array.isArray(compareValue) || compareValue.includes(value))
            return false;
          break;
        case Operator.Regex:
          try {
            const regex = new RegExp(compareValue);
            return regex.test(value as string);
          } catch (_e) {
            return false;
          }
        default:
          throw new Error(
            `Unsupported operator used in the query router: ${op}`,
          );
      }
    }
    return true;
  }

  private findTarget(id: string): ReactiveAgentsTarget {
    const index =
      this.raConfig.targets?.findIndex((target) => target.id === id) ?? -1;
    if (index === -1) {
      throw new Error(`Invalid target id found in the query router: ${id}`);
    }

    const target = this.raConfig.targets?.[index];

    if (!target) {
      throw new Error(`Invalid target id found in the query router: ${id}`);
    }

    const targets: ReactiveAgentsTarget = {
      ...target,
      index,
    };

    return targets;
  }

  private getContextValue(key: string): unknown {
    const parts = key.split('.');
    const context = this.context as Record<string, unknown>;

    const firstKey = parts[0];
    const secondKey = parts[1];

    let contextValue: unknown;
    if (firstKey && secondKey) {
      const firstValue = context[firstKey] as Record<string, unknown>;
      contextValue = firstValue[secondKey];
    } else if (firstKey) {
      contextValue = context[firstKey] as Record<string, unknown>;
    }

    return contextValue;
  }
}
