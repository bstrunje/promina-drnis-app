# Database Backups

This directory contains PostgreSQL database backups for the Promina Drniš Mountaineering Association project.

## Backup Files

- `promina_drnis_backup.backup` - Full database backup in PostgreSQL custom format

## How to Create a Backup

From PostgreSQL bin directory:
```bash
pg_dump -U postgres -F c -b -v -f "C:\sinkronizacija\promina-drnis-app\backup\promina_drnis_backup.backup" promina_drnis_DB
```

## How to Restore from Backup

From PostgreSQL bin directory:
```bash
pg_restore -U postgres -d promina_drnis_DB "C:\sinkronizacija\promina-drnis-app\backup\promina_drnis_backup.backup"
```

## Backup Schedule
- Full database backup should be performed before any major changes
- Regular backups should be performed weekly
- Old backups should be archived monthly

## Note
This directory contains sensitive data. Make sure to:
- Keep backup files secure
- Don't commit database dumps containing sensitive data to version control
- Regularly verify backup integrity