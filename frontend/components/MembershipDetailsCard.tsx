import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { Member } from "@shared/member";
import { Clock, CreditCard, Star } from 'lucide-react';
import { useAuth } from "../src/context/AuthContext";
import { formatMinutesToHoursAndMinutes } from "../src/utils/dateUtils";
import SkillsSelector from './SkillsSelector';
import MemberActivityStatus from './MemberActivityStatus';

interface MembershipDetailsCardProps {
  member: Member;
}

const MembershipDetailsCard: React.FC<MembershipDetailsCardProps> = ({
  member,
}) => {
  const { t } = useTranslation('profile');
  const { user } = useAuth();

  const getStatusColor = (status: Member["life_status"]) => {
    switch (status) {
      case "employed/unemployed":
        return "bg-blue-200 text-bg-blue-800";
      case "child/pupil/student":
        return "bg-green-200 text-bg-green-800";
      case "pensioner":
        return "bg-red-200 text-bg-red-800";
      default:
        return "bg-gray-600 text-white";
    }
  };

  // Get card number from membership_details first (source of truth), fall back to direct property
  const cardNumber = member.membership_details?.card_number ?? member.membership_details?.card_number;
  
  // Provjeri je li korisnik administrator ili superuser
  const canViewCardNumber = user?.role === "member_administrator" || user?.role === "member_superuser";



  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            {t('membershipDetails.title')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">{t('membershipDetails.cardNumber')}</label>
            {cardNumber ? (
              canViewCardNumber ? (
                <p
                  className={`inline-block w-fit px-3 py-1 rounded-lg font-mono ml-2 ${
                    getStatusColor(member.life_status)
                  }`}
                >
                  {cardNumber}
                </p>
              ) : (
                <p className="text-gray-500">
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-lg">
                    {t('membershipDetails.hidden')}
                  </span>
                  <span className="text-xs ml-2 text-gray-400">
                    {t('membershipDetails.visibleToAdmins')}
                  </span>
                </p>
              )
            ) : (
              <p className="text-gray-400 ml-2">{t('membershipDetails.noCardNumber')}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-500">{t('membershipDetails.stampStatus')}</label>
            <div className="flex items-center mt-1">
              <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${member.membership_details?.card_stamp_issued ? 'bg-black text-white' : 'border border-gray-300'}`}>
                {member.membership_details?.card_stamp_issued && '✓'}
              </div>
              <span className="text-sm">
                {member.membership_details?.card_stamp_issued
                  ? t('membershipDetails.stampIssued')
                  : t('membershipDetails.stampNotIssued')}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">{t('membershipDetails.membershipType')}</label>
            <p>{t(`membershipDetailsCard.membershipType.${member.membership_type}`)}</p>
          </div>
          {member.functions_in_society && member.functions_in_society.trim() !== '' && (
            <div>
              <label className="text-sm text-gray-500">{t('personalInfo.functionsInSocietyLabel')}</label>
              <p>{member.functions_in_society}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-500">{t('membershipDetails.role')}</label>
            <p>{t(`membershipDetailsCard.roles.${member.role}`)}</p>
          </div>

          {(member.skills && member.skills.length > 0) || (member.other_skills && member.other_skills.trim() !== '') ? (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Star className="w-5 h-5 mr-2" />
                {t('skills.title')}
              </h3>
              <SkillsSelector
                value={member.skills ?? []}
                otherSkills={member.other_skills ?? ''}
                onChange={() => {}}
                isEditing={false}
              />
            </div>
          ) : null}

          <MemberActivityStatus member={member} />
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipDetailsCard;
