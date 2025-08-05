// Izvoz svih API funkcija iz pojedinačnih modula

// Izvoz konfiguracije
export { default as api } from './apiConfig';

// Izvoz pomoćnih funkcija
export * from './apiUtils';

// Izvoz tipova
export * from './apiTypes';

// Izvoz funkcija iz pojedinačnih modula
export * from './apiAuth';
export * from './apiMembers';
export * from './apiMembership';
export * from './apiMessages';
export * from './apiStamps';
export * from './apiCards';
export * from './apiMisc';
export * from './apiActivities'; // Dodan izvoz za aktivnosti

// Grupiranje svih funkcija u objekt za kompatibilnost sa starim kodom
import * as auth from './apiAuth';
import * as members from './apiMembers';
import * as membership from './apiMembership';
import * as messages from './apiMessages';
import * as stamps from './apiStamps';
import * as cards from './apiCards';
import * as misc from './apiMisc';
import * as activities from './apiActivities'; // Dodan uvoz za aktivnosti

// Objekt koji sadrži sve API funkcije
const api = {
  ...auth,
  ...members,
  ...membership,
  ...messages,
  ...stamps,
  ...cards,
  ...misc,
  // Eksplicitno izvozimo samo funkcije iz activities, ne tipove
  getActivityTypes: activities.getActivityTypes,
  getActivitiesByTypeId: activities.getActivitiesByTypeId,
  getActivitiesByStatus: activities.getActivitiesByStatus,
  getAllActivities: activities.getAllActivities,
  getActivitiesByYearWithParticipants: activities.getActivitiesByYearWithParticipants,
  getAllActivitiesWithParticipants: activities.getAllActivitiesWithParticipants,
  getActivityById: activities.getActivityById,
  updateActivity: activities.updateActivity,
  createActivity: activities.createActivity,
  getAllActivitiesAdmin: activities.getAllActivitiesAdmin,
  getActivityByIdAdmin: activities.getActivityByIdAdmin,
  createActivityAdmin: activities.createActivityAdmin,
  updateActivityAdmin: activities.updateActivityAdmin,
  deleteActivityAdmin: activities.deleteActivityAdmin,
  addParticipantAdmin: activities.addParticipantAdmin,
  removeParticipantAdmin: activities.removeParticipantAdmin,
  updateParticipationAdmin: activities.updateParticipationAdmin,
  cancelActivity: activities.cancelActivity,
  deleteActivity: activities.deleteActivity,
  joinActivity: activities.joinActivity,
  leaveActivity: activities.leaveActivity,
  getMemberAnnualStats: activities.getMemberAnnualStats
};

export default api;
