import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PlaygroundNodeType } from '../entities/playground-node-type.enum';

/**
 * Valida que text nodes tenham conteúdo obrigatório
 */
@ValidatorConstraint({ name: 'isValidTextNode', async: false })
export class IsValidTextNodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const object = args.object as {
      type?: string;
      content?: string;
    };

    // Se não for um text node, não validar aqui
    if (object.type !== PlaygroundNodeType.Text) {
      return true;
    }

    // Text nodes devem ter conteúdo não vazio
    return typeof value === 'string' && value.trim().length > 0;
  }

  defaultMessage(): string {
    return 'Text nodes must have non-empty content';
  }
}

/**
 * Valida que shape nodes tenham metadata válida
 */
@ValidatorConstraint({ name: 'isValidShapeNode', async: false })
export class IsValidShapeNodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const object = args.object as {
      type?: string;
      metadata?: Record<string, unknown>;
    };

    // Se não for um shape node, não validar aqui
    if (object.type !== PlaygroundNodeType.Shape) {
      return true;
    }

    // Shape nodes devem ter metadata
    if (!value || typeof value !== 'object') {
      return false;
    }

    const metadata = value as Record<string, unknown>;

    // Validar shapeType
    const shapeType =
      typeof metadata.shapeType === 'string' ? metadata.shapeType : '';
    if (!['rectangle', 'circle', 'path'].includes(shapeType)) {
      return false;
    }

    // Formas de traço livre (path): requerem pathData, não fillColor
    if (shapeType === 'path') {
      const pathData =
        typeof metadata.pathData === 'string' ? metadata.pathData : '';
      if (pathData.trim().length === 0) {
        return false;
      }

      const strokeColor =
        typeof metadata.strokeColor === 'string' ? metadata.strokeColor : '';
      if (!/^#[0-9A-Fa-f]{6}$/.test(strokeColor)) {
        return false;
      }

      const strokeWidth = Number(metadata.strokeWidth);
      if (
        !Number.isFinite(strokeWidth) ||
        strokeWidth < 1 ||
        strokeWidth > 10
      ) {
        return false;
      }

      return true;
    }

    // Para rectangle e circle: validação completa com fillColor
    // Validar strokeColor (hex color)
    const strokeColor =
      typeof metadata.strokeColor === 'string' ? metadata.strokeColor : '';
    if (!/^#[0-9A-Fa-f]{6}$/.test(strokeColor)) {
      return false;
    }

    // Validar fillColor (hex color ou transparent)
    const fillColor =
      typeof metadata.fillColor === 'string' ? metadata.fillColor : '';
    if (!/^(#[0-9A-Fa-f]{6}|transparent)$/.test(fillColor)) {
      return false;
    }

    // Validar strokeWidth (1-10)
    const strokeWidth = Number(metadata.strokeWidth);
    if (!Number.isFinite(strokeWidth) || strokeWidth < 1 || strokeWidth > 10) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Shape nodes must have valid metadata: path shapes require (shapeType: "path", pathData: string, strokeColor: hex, strokeWidth: 1-10); rectangle/circle shapes require (shapeType: "rectangle"|"circle", strokeColor: hex, fillColor: hex|transparent, strokeWidth: 1-10)';
  }
}

/**
 * Decorator para validar text nodes
 */
export function IsValidTextNode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTextNodeConstraint,
    });
  };
}

/**
 * Decorator para validar shape nodes
 */
export function IsValidShapeMetadata(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidShapeNodeConstraint,
    });
  };
}
