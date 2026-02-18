# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Assignment Manager is a static web application for viewing Canvas LMS assignments, including due dates, rubrics, point values, names, and instructions.

## Development

This is a vanilla HTML/CSS/JS project with no build system, linter, or tests configured.

**Commands**
- Serve locally (recommended to avoid `file://` CORS issues):
  - Start an HTTP server from the repo root, then open the site:
    ```powershell
    python -m http.server 8000
    Start-Process "http://localhost:8000/"
    ```
- Direct open (works for pure static pages, may break fetch calls): `Start-Process .\index.html`
- Build: N/A
- Lint: N/A
- Tests: N/A (no test runner configured). Running a single test: N/A.

## Architecture

- Single-page static app. All assets live at repo root; no bundler or module system.
- `index.html`: Main page structure with config form, course cards grid, and assignments table.
- `script.js`: Canvas API integration module with:
  - `canvasConfig` object storing domain/token in localStorage
  - `canvasApiRequest(endpoint)` — authenticated fetch wrapper for Canvas REST API
  - `loadCourses()` — fetches `/api/v1/courses` and renders clickable course cards
  - `loadAssignments(courseId)` — fetches `/api/v1/courses/:id/assignments?include[]=rubric` and renders table
  - `formatRubric(rubric)` — converts rubric array to HTML list
- `style.css`: Complete styling with JetBrains Mono font, card layouts, table styling.
- `JetBrainsMono-Regular.ttf`: Custom monospace font.

## Canvas API Integration

**Authentication**: Uses Bearer token auth. Users generate a personal access token from Canvas (Account → Settings → New Access Token). Token stored in localStorage.

**Endpoints used**:
- `GET /api/v1/courses?enrollment_state=active` — list user's active courses
- `GET /api/v1/courses/:course_id/assignments?include[]=rubric` — list assignments with rubric data

**CORS Note**: Canvas API doesn't allow browser requests from `file://`. Must serve via HTTP server for testing.
