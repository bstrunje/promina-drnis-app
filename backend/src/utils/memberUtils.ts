import { getCurrentDate, parseDate } from './dateUtils.js';

export const calculateAge = (birthDate: string): string => {
    const today = getCurrentDate();
    const birth = parseDate(birthDate);
    
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();

    let ageString = `${years} years`;
    if (months > 0) ageString += `, ${months} months`;
    if (days > 0) ageString += `, ${days} days`;
    
    return ageString;
};