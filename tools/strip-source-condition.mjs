#!/usr/bin/env node
// Removes the "@ssv/source" export condition from built packages.
//
// The source package.json declares `"@ssv/source": "./index.ts"` so sibling repos can link
// against live source (see pnpm-workspace.yaml `overrides` in cosmowrench/blueprint.client).
// Mirrors tools/strip-source-condition.mjs in sketch7.arcane.ngx — keep the two in sync.
// ng-packagr copies `exports` verbatim into dist, so without this the published tarball would
// point consumers at an index.ts that isn't in it — and consumers set the condition
// unconditionally, so that breaks the *registry* path for everyone.
//
// Idempotent. Runs after every build and again before publish/pack.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const CONDITION = "@ssv/source";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Drops the condition anywhere in the exports tree; prunes subpaths left empty. */
function strip(node) {
	if (!node || typeof node !== "object") return;
	for (const key of Object.keys(node)) {
		if (key === CONDITION) {
			delete node[key];
			continue;
		}
		strip(node[key]);
		const child = node[key];
		if (child && typeof child === "object" && Object.keys(child).length === 0) {
			delete node[key];
		}
	}
}

function stripPackage(pkgPath) {
	const raw = readFileSync(pkgPath, "utf8");
	if (!raw.includes(CONDITION)) return false;

	const pkg = JSON.parse(raw);
	strip(pkg.exports);
	if (pkg.exports && Object.keys(pkg.exports).length === 0) delete pkg.exports;

	writeFileSync(pkgPath, JSON.stringify(pkg, undefined, 2) + "\n");
	console.log(`[strip-source-condition] cleaned ${pkgPath}`);
	return true;
}

// Accepts explicit dist dirs, else scans dist/libs/**
const targets = process.argv.slice(2).map(p => resolve(p));
const roots = targets.length ? targets : [join(repoRoot, "dist", "libs")];

function walk(dir) {
	if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
	const pkgPath = join(dir, "package.json");
	if (existsSync(pkgPath)) stripPackage(pkgPath);
	for (const name of readdirSync(dir)) {
		if (name === "node_modules") continue;
		const child = join(dir, name);
		if (statSync(child).isDirectory()) walk(child);
	}
}

roots.forEach(walk);
