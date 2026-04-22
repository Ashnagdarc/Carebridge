# ADR 0001: Monorepo with npm workspaces

Date: 2026-04-22

## Context

CareBridge consists of multiple deployable services (middleware API, patient PWA, mock hospitals) that share a single set of scripts and documentation.

## Decision

Use a monorepo with npm workspaces (`packages/*`) to:

- keep shared tooling consistent (lint/test/CI)
- enable coordinated changes across services
- keep docs and task tracking in one place

## Consequences

- Workspace installs can be larger than single-service repos.
- CI runs must be explicit about which services are tested/linted.

