SELECT 
  ap.participation_id, 
  ap.organization_id as participation_org_id, 
  ap.member_id, 
  ap.activity_id, 
  a.organization_id as activity_org_id, 
  a.name, 
  EXTRACT(YEAR FROM a.start_date) as year 
FROM activity_participations ap 
JOIN activities a ON ap.activity_id = a.activity_id 
WHERE ap.member_id = 1 
ORDER BY a.start_date DESC;
