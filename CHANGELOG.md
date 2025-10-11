# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Backup Configuration UI**: Implementirano sučelje u System Manageru za konfiguraciju postavki sigurnosnih kopija (frekvencija, retencija, lokacija).
- **Backup Status on Dashboard**: Prikaz statusa zadnje i sljedeće sigurnosne kopije na System Manager dashboardu.

### Fixed
- Riješene TypeScript greške na backendu uzrokovane neusklađenim tipovima nakon promjene Prisma sheme.
- Uklonjen duplicirani i suvišni kod vezan za postavke sustava na frontendu.