#!/usr/bin/env node
// Applies a set of small, idempotent patches to built package.json files before publish/pack.
//
// Add new patches to the PATCHES array below — each receives the parsed package.json and mutates
// it in place, returning true if it changed anything.
// Mirrors tools/patch-pkgjson.mjs in sketch7.arcane.ngx — keep the two in sync.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Removes the "@ssv/source" export condition from built packages.
//
// The source package.json declares `"@ssv/source": "./index.ts"` so sibling repos can link
// against live source (see pnpm-workspace.yaml `overrides` in cosmowrench/blueprint.client).
// ng-packagr copies `exports` verbatim into dist, so without this the published tarball would
// point consumers at an index.ts that isn't in it — and consumers set the condition
// unconditionally, so that breaks the *registry* path for everyone.
function stripSourceCondition(pkg) {
	const CONDITION = "@ssv/source";
	let changed = false;

	function strip(node) {
		if (!node || typeof node !== "object") return;
		for (const key of Object.keys(node)) {
			if (key === CONDITION) {
				delete node[key];
				changed = true;
				continue;
			}
			strip(node[key]);
			const child = node[key];
			if (child && typeof child === "object" && Object.keys(child).length === 0) {
				delete node[key];
			}
		}
	}

	strip(pkg.exports);
	if (pkg.exports && Object.keys(pkg.exports).length === 0) delete pkg.exports;
	return changed;
}

// Add further package.json patches here as needed.
const PATCHES = [stripSourceCondition];

function patchPackage(pkgPath) {
	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	const changed = PATCHES.reduce((acc, patch) => patch(pkg) || acc, false);
	if (!changed) return false;

	writeFileSync(pkgPath, JSON.stringify(pkg, undefined, 2) + "\n");
	console.log(`[patch-pkgjson] patched ${pkgPath}`);
	return true;
}

// Accepts explicit dist dirs, else scans dist/libs/**
const targets = process.argv.slice(2).map(p => resolve(p));
const roots = targets.length ? targets : [join(repoRoot, "dist", "libs")];

function walk(dir) {
	if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
	const pkgPath = join(dir, "package.json");
	if (existsSync(pkgPath)) patchPackage(pkgPath);
	for (const name of readdirSync(dir)) {
		if (name === "node_modules") continue;
		const child = join(dir, name);
		if (statSync(child).isDirectory()) walk(child);
	}
}

roots.forEach(walk);
