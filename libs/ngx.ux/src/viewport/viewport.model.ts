/**
 * The indices of each breakpoint provided based on the `UX_VIEWPORT_DEFAULT_BREAKPOINTS`.
 * @see UX_VIEWPORT_DEFAULT_BREAKPOINTS
 */
export enum ViewportSizeType {
	xsmall = 0,
	small = 1,
	medium = 2,
	large = 3,
	xlarge = 4,
	xxlarge = 5,
	xxlarge1 = 6,
}

export enum ComparisonOperation {
	equals = "=",
	notEquals = "<>",
	lessThan = "<",
	lessOrEqualThan = "<=",
	greaterThan = ">",
	greaterOrEqualThan = ">=",
}

export type ComparisonOperationKeyType = keyof typeof ComparisonOperation;
export type ComparisonOperationValueType = "=" | "<>" | "<" | "<=" | ">" | ">="; // todo: find a better way to do this
export type ComparisonOperationLiteral = ComparisonOperationKeyType | ComparisonOperationValueType;

export enum DeviceType {
	desktop = "desktop",
	mobile = "mobile",
	tablet = "tablet"
}

export interface ViewportSize {
	width: number;
	height: number;
}

export interface ViewportSizeTypeInfo {
	type: number;
	name: string;
	widthThreshold: number;
}

export interface ViewportMatchConditions {
	sizeType?: string | string[] | null;
	sizeTypeExclude?: string | string[] | null;
	expression?: ViewportSizeMatcherExpression;
}

export interface ViewportSizeMatcherExpression {
	size: string;
	operation: ComparisonOperationLiteral;
}
