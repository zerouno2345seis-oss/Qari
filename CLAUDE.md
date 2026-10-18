# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

The repository contains only a placeholder `README.md` (the default "Built with AI Studio" banner from Google AI Studio). There is no source code, build system, package manifest, test suite, or lint configuration yet, so there are no build/test commands to document.

When code is added (e.g., an AI Studio export, typically a Vite + React/TypeScript app using the Gemini API), update this file with:
- the actual install/dev/build/lint/test commands (including how to run a single test), taken from the project's manifest;
- the high-level architecture once it spans multiple files;
- any required environment variables (names only, e.g. the Gemini API key variable the app reads).
