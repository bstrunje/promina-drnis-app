# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Backup Configuration UI**: Implementirano sučelje u System Manageru za konfiguraciju postavki sigurnosnih kopija (frekvencija, retencija, lokacija).
- **Backup Status on Dashboard**: Prikaz statusa zadnje i sljedeće sigurnosne kopije na System Manager dashboardu.
- **Multi-Tenant PWA Support**: Svaki tenant sada ima vlastitu PWA ikonu s tenant logom ili fallback ikonom.
- **Dinamički Favicon**: Favicon se automatski mijenja ovisno o tenant logu.
- **Privremeno polje za broj iskaznice**: Dodano na registracijsku formu za lakšu migraciju postojećih članova.

### Fixed
- Riješene TypeScript greške na backendu uzrokovane neusklađenim tipovima nakon promjene Prisma sheme.
- Uklonjen duplicirani i suvišni kod vezan za postavke sustava na frontendu.
- **PWA Manifest**: Ispravljeno generiranje manifest URL-ova za Vercel Blob storage (malformed `https//` → `https://`).
- **Tenant Middleware**: Dodana tenant middleware za PWA manifest endpoint.
- **Multi-Device Refresh Token**: Ispravljeno brisanje refresh tokena - sada podržava prijavu na više uređaja istovremeno.
- **Favicon**: Zamijenjen Vercel favicon s tenant logom ili fallback PWA ikonom.