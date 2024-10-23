import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import svelte from "rollup-plugin-svelte";
import autoPreprocess from "svelte-preprocess";
import terser from "@rollup/plugin-terser";

const isProd = process.env.BUILD === "production";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/
`;

export default [
    {
        input: "src/main.ts",
        output: {
            file: "build/debug/main.js",
            sourcemap: "inline",
            sourcemapExcludeSources: isProd,
            format: "cjs",
            exports: "default",
            banner,
        },
        external: ["obsidian"],
        plugins: [
            svelte({ emitCss: false, preprocess: autoPreprocess() }),
            typescript(),
            nodeResolve({ browser: true }),
            commonjs(),
            json(),
            copy({
                targets: [
                    { src: "manifest.json", dest: "build/debug" },
                    { src: "src/styles.css", dest: "build/debug" },
                ],
            }),
        ],
    },
    {
        input: "src/main.ts",
        output: {
            file: "build/release/main.js",
            sourcemap: "inline",
            sourcemapExcludeSources: isProd,
            format: "cjs",
            exports: "default",
            banner,
        },
        external: ["obsidian"],
        plugins: [
            svelte({ emitCss: false, preprocess: autoPreprocess() }),
            typescript(),
            nodeResolve({ browser: true }),
            commonjs(),
            json(),
            terser(),
            copy({
                targets: [
                    { src: "manifest.json", dest: "build/release" },
                    { src: "src/styles.css", dest: "build/release" },
                ],
            }),
        ],
    },
];
