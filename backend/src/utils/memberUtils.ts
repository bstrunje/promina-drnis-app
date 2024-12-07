export const calculateAge = (birthDate: string): string => {
    const today = new Date();
    const birth = new Date(birthDate);
    
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();

    let ageString = `${years} years`;
    if (months > 0) ageString += `, ${months} months`;
    if (days > 0) ageString += `, ${days} days`;
    
    return ageString;
};