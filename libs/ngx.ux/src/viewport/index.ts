export * from "./viewport-data/index";

export { SsvUxViewportModule } from "./viewport.module";
export { provideSsvUxViewportOptions, VIEWPORT_OPTIONS, type UxViewportOptions, withViewportSsrDevice } from "./viewport.options";

export { SsvViewportMatcherVar, SsvViewportMatcherVarContext } from "./viewport-matcher-var.directive";
export { SsvViewportMatcher, SsvViewportMatcherContext } from "./viewport-matcher.directive";
export { VIEWPORT_SSR_DEVICE, ViewportServerSizeService } from "./viewport-server-size.service";
export {
	type ComparisonOperationValueType,
	type ComparisonOperationLiteral,
	type ComparisonOperationKeyType,
	type ViewportSize,
	type ViewportSizeTypeInfo,
	ComparisonOperation,
	DeviceType,
	ViewportSizeType,
} from "./viewport.model";
export { ViewportService } from "./viewport.service";
export { generateViewportSizeType } from "./viewport.util";
