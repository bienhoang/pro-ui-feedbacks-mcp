# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-02-08

### Added
- MCP server with stdio transport for AI agent communication
- HTTP API server for receiving UI feedback via webhooks
- CLI with `server`, `init`, and `doctor` commands
- MCP tools: `list_sessions`, `get_pending_feedback`, `acknowledge_feedback`, `resolve_feedback`, `dismiss_feedback`
- Rich metadata schema for widget element data
- Batch size limit for webhook submissions
- Auto-configuration for Claude Code, Cursor, VS Code, and Windsurf
