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
export class IsValidShapeNodeConstraint validate(value: unknown, args: Validati     const object = args.object as {
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
    if (
      !metadata.shapeType ||
      !['rectangle', 'circle'].includes(String(metadata.shapeType))
    ) {
      return false;
    }

    // Validar strokeColor (hex color)
    const strokeColor = String(metadata.strokeColor || '');
    if (!/^#[0-9A-Fa-f]{6}$/.test(strokeColor)) {
      return false;
    }

    // Validar fillColor (hex color ou transparent)
    const fillColor = String(metadata.fillColor || '');
    if (!/^(#[0-9A-Fa-f]{6}|transparent)$/.test(fillColor)) {
      return false;
    }

    // Validar strokeWidth (1-10)
    const strokeWidth = Number(metadata.strokeWidth);
    if (!Number.isFinite(strokeWidth) || strokeWidth < 1 || strokeWidth > 10) {
      return false;
    } turn true;
  defaultMessage(): string {
    return 'Shape nodes must have valid metadata (shapeType: "rectangle"|"circle", strokeColor: hex, fillColor: hex|transparent, strokeWidth: 1-10)';
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
